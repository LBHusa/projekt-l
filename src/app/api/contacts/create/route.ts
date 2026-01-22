// ============================================
// CONTACTS CREATE API ROUTE
// Authenticates user from session, uses admin client for insert
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Helper functions from contacts types
function getCategoryFromType(type: string): string {
  const familyTypes = ['partner', 'spouse', 'child', 'parent', 'grandparent', 'sibling', 'in_law_sibling', 'in_law_parent', 'in_law_child', 'cousin', 'aunt_uncle', 'niece_nephew', 'step_parent', 'step_child', 'step_sibling'];
  const friendTypes = ['close_friend', 'friend', 'acquaintance'];
  const professionalTypes = ['colleague', 'mentor', 'mentee', 'neighbor'];

  if (familyTypes.includes(type)) return 'family';
  if (friendTypes.includes(type)) return 'friend';
  if (professionalTypes.includes(type)) return 'professional';
  return 'other';
}

// Helper to get domain ID by name from database
async function getDomainIdByName(
  adminClient: ReturnType<typeof createAdminClient>,
  domainName: string
): Promise<string | null> {
  const { data } = await adminClient
    .from('life_domains')
    .select('id')
    .eq('name', domainName)
    .single();
  return data?.id ?? null;
}

async function getDomainIdFromCategory(
  adminClient: ReturnType<typeof createAdminClient>,
  category: string
): Promise<string | null> {
  switch (category) {
    case 'family':
      return await getDomainIdByName(adminClient, 'Familie');
    case 'friend':
      return await getDomainIdByName(adminClient, 'Soziales');
    case 'professional':
      return await getDomainIdByName(adminClient, 'Karriere');
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user from session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const formData = await request.json();
    const adminClient = createAdminClient();

    console.log('[createContact API] Creating contact for user:', userId);

    // Determine category and domain from relationship type
    const category = getCategoryFromType(formData.relationship_type);
    const domainId = await getDomainIdFromCategory(adminClient, category);

    // Insert contact with admin client (bypasses RLS)
    const { data: contact, error: contactError } = await adminClient
      .from('contacts')
      .insert({
        user_id: userId,
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        nickname: formData.nickname || null,
        photo_url: formData.photo_url || null,
        relationship_type: formData.relationship_type,
        relationship_category: category,
        domain_id: domainId,
        birthday: formData.birthday || null,
        anniversary: formData.anniversary || null,
        met_date: formData.met_date || null,
        met_context: formData.met_context || null,
        contact_info: formData.contact_info || {},
        shared_interests: formData.shared_interests || [],
        notes: formData.notes || null,
        tags: formData.tags || [],
        trust_level: formData.trust_level || 50,
        is_favorite: formData.is_favorite || false,
        reminder_frequency_days: formData.reminder_frequency_days || null,
      })
      .select()
      .single();

    if (contactError) {
      console.error('Error creating contact:', contactError);
      return NextResponse.json(
        { error: contactError.message },
        { status: 500 }
      );
    }

    // Log activity
    try {
      // Get fallback domain if domainId is null (default to Soziales)
      const fallbackDomainId = domainId || await getDomainIdByName(adminClient, 'Soziales');

      await adminClient.from('activity_log').insert({
        user_id: userId,
        activity_type: 'contact_created',
        faction_id: fallbackDomainId,
        title: '👤 Neuer Kontakt erstellt',
        description: `${formData.first_name} ${formData.last_name || ''}`.trim(),
        xp_amount: 0,
        related_entity_type: 'contact',
        related_entity_id: contact.id,
      });
    } catch (err) {
      console.error('Error logging activity:', err);
    }

    return NextResponse.json({ 
      success: true, 
      data: contact
    });
  } catch (error) {
    console.error('Contact create API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
