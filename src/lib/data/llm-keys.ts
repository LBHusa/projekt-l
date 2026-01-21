/**
 * LLM API Keys Data Layer
 * Verwaltet verschlüsselte LLM API Keys (Anthropic, OpenAI) für User
 */

import { createClient } from '@/lib/supabase/server';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Encryption settings - AES-256-GCM
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

// Types
export type LlmProvider = 'anthropic' | 'openai';

export interface LlmKeyInfo {
  hasKey: boolean;
  keyPrefix?: string;
  provider?: LlmProvider;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveLlmKeyResult {
  success: boolean;
  error?: string;
}

// ============================================
// ENCRYPTION HELPERS
// ============================================

/**
 * Get encryption key from environment
 * ENCRYPTION_SECRET should be a 32-byte hex string (64 characters)
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET not configured');
  }
  
  // If it's a hex string, convert to buffer
  if (secret.length === 64 && /^[0-9a-fA-F]+$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  
  // Otherwise use it as UTF-8 and hash to 32 bytes
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt API key using AES-256-GCM
 * Returns: iv:authTag:encryptedData (all base64)
 */
function encryptApiKey(apiKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt API key
 */
function decryptApiKey(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Extract key prefix for display (first 12 chars)
 */
function extractKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12) + '...';
}

// ============================================
// DATA LAYER FUNCTIONS
// ============================================

/**
 * Save LLM API key for user (encrypted)
 */
export async function saveLlmApiKey(
  userId: string,
  provider: LlmProvider,
  apiKey: string
): Promise<SaveLlmKeyResult> {
  try {
    const supabase = await createClient();
    
    // Validate key format
    if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      return { success: false, error: 'Ungültiges Key-Format. Anthropic Keys beginnen mit sk-ant-' };
    }
    if (provider === 'openai' && !apiKey.startsWith('sk-')) {
      return { success: false, error: 'Ungültiges Key-Format. OpenAI Keys beginnen mit sk-' };
    }
    
    // Encrypt the key
    const encryptedKey = encryptApiKey(apiKey);
    const keyPrefix = extractKeyPrefix(apiKey);
    
    // Upsert - insert or update if exists
    const { error } = await supabase
      .from('user_llm_keys')
      .upsert({
        user_id: userId,
        provider,
        encrypted_key: encryptedKey,
        key_prefix: keyPrefix,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });
    
    if (error) {
      console.error('Error saving LLM key:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in saveLlmApiKey:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

/**
 * Get decrypted LLM API key for user
 * SECURITY: Only call this server-side when needed for API calls
 */
export async function getLlmApiKey(
  userId: string,
  provider: LlmProvider = 'anthropic'
): Promise<string | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('user_llm_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching LLM key:', error);
      return null;
    }
    
    if (!data?.encrypted_key) {
      return null;
    }
    
    return decryptApiKey(data.encrypted_key);
  } catch (error) {
    console.error('Error in getLlmApiKey:', error);
    return null;
  }
}

/**
 * Get LLM key info for user (without decrypting)
 */
export async function getLlmKeyInfo(
  userId: string,
  provider: LlmProvider = 'anthropic'
): Promise<LlmKeyInfo> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('user_llm_keys')
      .select('key_prefix, provider, created_at, updated_at')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching LLM key info:', error);
      return { hasKey: false };
    }
    
    if (!data) {
      return { hasKey: false };
    }
    
    return {
      hasKey: true,
      keyPrefix: data.key_prefix,
      provider: data.provider as LlmProvider,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error in getLlmKeyInfo:', error);
    return { hasKey: false };
  }
}

/**
 * Check if user has LLM API key
 */
export async function hasLlmApiKey(
  userId: string,
  provider: LlmProvider = 'anthropic'
): Promise<boolean> {
  const info = await getLlmKeyInfo(userId, provider);
  return info.hasKey;
}

/**
 * Delete LLM API key for user
 */
export async function deleteLlmApiKey(
  userId: string,
  provider: LlmProvider = 'anthropic'
): Promise<SaveLlmKeyResult> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('user_llm_keys')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);
    
    if (error) {
      console.error('Error deleting LLM key:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteLlmApiKey:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

/**
 * Get API key for AI services with fallback to environment variable
 * Utility function for questGenerator and chat API
 */
export async function getApiKeyForUser(
  userId: string,
  provider: LlmProvider = 'anthropic'
): Promise<{ apiKey: string; source: 'user' | 'env' } | null> {
  // First try user's personal key
  const userKey = await getLlmApiKey(userId, provider);
  if (userKey) {
    return { apiKey: userKey, source: 'user' };
  }
  
  // Fallback to environment variable
  const envKey = provider === 'anthropic' 
    ? process.env.ANTHROPIC_API_KEY 
    : process.env.OPENAI_API_KEY;
    
  if (envKey) {
    return { apiKey: envKey, source: 'env' };
  }
  
  return null;
}
