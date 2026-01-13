import { createBrowserClient } from '@/lib/supabase';
import type { Database } from '../database.types';

const supabase = createBrowserClient();

// Type für career_sources aus der Datenbank
export type CareerSource = {
  id: string;
  user_id: string;
  name: string;
  type: 'employment' | 'freelance' | 'business' | 'passive';
  monthly_income: number;
  currency: string;
  is_primary: boolean;
  is_active: boolean;
  start_date: string | null;
  linked_domain_id: string | null;
  xp_multiplier: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type NewCareerSource = Omit<CareerSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type CareerSourceUpdate = Partial<NewCareerSource>;

/**
 * Holt alle Karriere-Quellen des aktuellen Users
 */
export async function getCareerSources(): Promise<CareerSource[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('career_sources')
    .select('*')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CareerSource[];
}

/**
 * Holt eine einzelne Karriere-Quelle
 */
export async function getCareerSource(id: string): Promise<CareerSource | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('career_sources')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as CareerSource;
}

/**
 * Holt nur aktive Karriere-Quellen
 */
export async function getActiveCareerSources(): Promise<CareerSource[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('career_sources')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CareerSource[];
}

/**
 * Berechnet das Gesamteinkommen aller aktiven Quellen
 */
export async function getTotalMonthlyIncome(): Promise<{ total: number; currency: string }> {
  const sources = await getActiveCareerSources();

  // Gruppiere nach Währung
  const totals = sources.reduce((acc, source) => {
    const currency = source.currency || 'EUR';
    if (!acc[currency]) acc[currency] = 0;
    acc[currency] += source.monthly_income || 0;
    return acc;
  }, {} as Record<string, number>);

  // Aktuell unterstützen wir nur eine Währung, nimm die primäre
  const primarySource = sources.find(s => s.is_primary);
  const currency = primarySource?.currency || 'EUR';

  return {
    total: totals[currency] || 0,
    currency
  };
}

/**
 * Erstellt eine neue Karriere-Quelle
 */
export async function createCareerSource(source: NewCareerSource): Promise<CareerSource> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Wenn diese Quelle als primär markiert ist, setze alle anderen auf nicht-primär
  if (source.is_primary) {
    await supabase
      .from('career_sources')
      .update({ is_primary: false })
      .eq('user_id', user.id);
  }

  const { data, error } = await supabase
    .from('career_sources')
    .insert({
      ...source,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CareerSource;
}

/**
 * Aktualisiert eine Karriere-Quelle
 */
export async function updateCareerSource(
  id: string,
  updates: CareerSourceUpdate
): Promise<CareerSource> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Wenn diese Quelle als primär markiert wird, setze alle anderen auf nicht-primär
  if (updates.is_primary) {
    await supabase
      .from('career_sources')
      .update({ is_primary: false })
      .eq('user_id', user.id)
      .neq('id', id);
  }

  const { data, error } = await supabase
    .from('career_sources')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as CareerSource;
}

/**
 * Löscht eine Karriere-Quelle
 */
export async function deleteCareerSource(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('career_sources')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Deaktiviert eine Karriere-Quelle (soft delete)
 */
export async function deactivateCareerSource(id: string): Promise<CareerSource> {
  return updateCareerSource(id, { is_active: false });
}

/**
 * Aktiviert eine Karriere-Quelle wieder
 */
export async function activateCareerSource(id: string): Promise<CareerSource> {
  return updateCareerSource(id, { is_active: true });
}
