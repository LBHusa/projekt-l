/**
 * API Keys Data Layer
 * Verwaltet API-Schlüssel für Health Import Integrationen
 */

import { createClient } from '@/lib/supabase/server';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 10;

export interface ApiKey {
  id: string;
  user_id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GenerateApiKeyResult {
  success: boolean;
  key?: string; // Ungehashter Key, wird nur einmalig zurückgegeben
  key_id?: string;
  error?: string;
}

export interface ValidateApiKeyResult {
  success: boolean;
  user_id?: string;
  key_id?: string;
  error?: string;
}

/**
 * Generiert einen neuen API Key für einen User
 * Format: pk_live_32chars
 */
export async function generateApiKey(userId: string): Promise<GenerateApiKeyResult> {
  try {
    const supabase = await createClient();

    // Generiere zufälligen Key (32 Zeichen hex)
    const randomPart = randomBytes(16).toString('hex'); // 32 chars
    const apiKey = `pk_live_${randomPart}`;
    const keyPrefix = apiKey.substring(0, 15); // pk_live_xxxxx

    // Hash den Key für sichere Speicherung
    const keyHash = await bcrypt.hash(apiKey, SALT_ROUNDS);

    // Deaktiviere alte Keys des Users (optional: nur einen aktiven Key erlauben)
    await supabase
      .from('user_api_keys')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Speichere neuen Key
    const { data, error } = await supabase
      .from('user_api_keys')
      .insert({
        user_id: userId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: 'Apple Health Import',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      key: apiKey, // WICHTIG: Nur hier wird der ungehashte Key zurückgegeben
      key_id: data.id,
    };
  } catch (error) {
    console.error('Error in generateApiKey:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validiert einen API Key und gibt User-ID zurück
 */
export async function validateApiKey(apiKey: string): Promise<ValidateApiKeyResult> {
  try {
    const supabase = await createClient();

    // Hole alle aktiven Keys (wir müssen alle durchgehen wegen Hashing)
    const { data: keys, error } = await supabase
      .from('user_api_keys')
      .select('id, user_id, key_hash, is_active')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching API keys:', error);
      return { success: false, error: error.message };
    }

    if (!keys || keys.length === 0) {
      return { success: false, error: 'Invalid API key' };
    }

    // Vergleiche mit allen aktiven Keys
    for (const key of keys) {
      const isMatch = await bcrypt.compare(apiKey, key.key_hash);

      if (isMatch) {
        // Update last_used_at
        await supabase
          .from('user_api_keys')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', key.id);

        return {
          success: true,
          user_id: key.user_id,
          key_id: key.id,
        };
      }
    }

    return { success: false, error: 'Invalid API key' };
  } catch (error) {
    console.error('Error in validateApiKey:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gibt Status des API Keys für einen User zurück
 */
export async function getApiKeyStatus(userId: string): Promise<{
  hasKey: boolean;
  key?: ApiKey;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('id, user_id, key_prefix, name, last_used_at, is_active, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching API key status:', error);
      return { hasKey: false, error: error.message };
    }

    if (!data) {
      return { hasKey: false };
    }

    return {
      hasKey: true,
      key: data as ApiKey,
    };
  } catch (error) {
    console.error('Error in getApiKeyStatus:', error);
    return {
      hasKey: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Revoked (deaktiviert) einen API Key
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error revoking API key:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in revokeApiKey:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
