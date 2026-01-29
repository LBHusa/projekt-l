/**
 * Onboarding Completion API
 * POST /api/onboarding/complete
 *
 * Processes all onboarding data and initializes user's game state:
 * - Uses AI-generated faction levels when available
 * - Creates skill entries with AI-suggested levels
 * - Creates habit entries with AI-suggested frequency
 * - Updates user profile with AI character class
 * - Marks onboarding as complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { FactionId } from '@/lib/database.types';

// Types for onboarding data
interface FactionRating {
  factionId: FactionId;
  importance: number;
  currentStatus: number;
}

interface DeepDiveData {
  factionId: FactionId;
  yearsExperience: number;
  mainGoal: string;
}

interface SkillEntry {
  name: string;
  factionId: FactionId;
  experience: 'beginner' | 'intermediate' | 'expert';
}

interface HabitEntry {
  name: string;
  factionId: FactionId;
  frequencyPerWeek: number;
  icon: string;
}

interface NegativeHabitEntry {
  templateId: string;
  name: string;
  icon: string;
  affectedFactions: FactionId[];
}

interface ProfileData {
  displayName: string;
  avatarSeed: string;
  bio: string;
}

interface NotificationSettings {
  enableReminders: boolean;
  reminderTime: string;
  enableTelegram: boolean;
}

interface TellMeAboutYouData {
  karriereEducation?: {
    type: string;
    field: string;
    graduationYear?: number | string;
  };
  karriere?: string;
  hobby?: string;
  koerper?: string;
  geist?: string;
  finanzen?: string;
  soziales?: string;
  wissen?: string;
}

interface AIAnalysisResult {
  characterClass: string;
  characterDescription: string;
  factionLevels: Record<FactionId, number>;
}

interface OnboardingData {
  factionRatings: FactionRating[];
  deepDive: DeepDiveData[];
  tellMeAboutYou?: TellMeAboutYouData;
  aiAnalysis?: AIAnalysisResult | null;
  skills: SkillEntry[];
  negativeHabits?: NegativeHabitEntry[];
  habits: HabitEntry[];
  profile: ProfileData;
  notifications: NotificationSettings;
}

interface RequestBody {
  userId: string;
  data: OnboardingData;
}

// Level Calculation Logic
function calculateFactionLevel(importance: number, currentStatus: number, yearsExperience?: number): number {
  // Base: Status (1-10) → Level 5-50
  const baseLevel = Math.floor(currentStatus * 5);

  // Bonus for experience
  const experienceBonus = yearsExperience ? Math.min(yearsExperience * 3, 20) : 0;

  // Importance affects XP multiplier, not level directly
  const level = Math.min(baseLevel + experienceBonus, 100);

  return Math.max(1, level);
}

function calculateSkillLevel(experience: 'beginner' | 'intermediate' | 'expert'): number {
  const levelRanges = {
    beginner: { min: 1, max: 10 },
    intermediate: { min: 20, max: 40 },
    expert: { min: 50, max: 70 },
  };

  const range = levelRanges[experience];
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

function calculateXpFromLevel(level: number): number {
  // XP formula: 100 * level^1.5 accumulated
  let totalXp = 0;
  for (let i = 1; i <= level; i++) {
    totalXp += Math.floor(100 * Math.pow(i, 1.5));
  }
  return totalXp;
}

function calculateXpMultiplier(importance: number): number {
  // importance 1-5 → multiplier 0.33-1.67
  return importance / 3;
}

function suggestCharacterClass(factionRatings: FactionRating[]): string {
  // Find top 2 factions by importance
  const sorted = [...factionRatings].sort((a, b) => b.importance - a.importance);
  const top = sorted.slice(0, 2).map(r => r.factionId);

  // Character class suggestions based on dominant factions
  const classMap: Record<string, string> = {
    'karriere,finanzen': 'Händler',
    'karriere,wissen': 'Gelehrter',
    'karriere,soziales': 'Diplomat',
    'koerper,geist': 'Mönch',
    'koerper,hobby': 'Abenteurer',
    'koerper,soziales': 'Krieger',
    'geist,wissen': 'Weiser',
    'geist,hobby': 'Künstler',
    'wissen,hobby': 'Erfinder',
    'soziales,hobby': 'Barde',
    'finanzen,wissen': 'Alchemist',
    'finanzen,soziales': 'Gildemeister',
  };

  const key1 = `${top[0]},${top[1]}`;
  const key2 = `${top[1]},${top[0]}`;

  return classMap[key1] || classMap[key2] || 'Abenteurer';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body: RequestBody = await request.json();
    const { data } = body;

    // Validate user ID matches authenticated user
    if (body.userId !== user.id) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
    }

    // 1. Save onboarding responses for reference
    const responseInserts: { user_id: string; step_name: string; response_data: unknown }[] = [
      { user_id: user.id, step_name: 'factionRatings', response_data: data.factionRatings },
      { user_id: user.id, step_name: 'deepDive', response_data: data.deepDive },
      { user_id: user.id, step_name: 'skills', response_data: data.skills },
      { user_id: user.id, step_name: 'habits', response_data: data.habits },
      { user_id: user.id, step_name: 'profile', response_data: data.profile },
      { user_id: user.id, step_name: 'notifications', response_data: data.notifications },
    ];

    // Add new AI-powered fields if present
    if (data.tellMeAboutYou) {
      responseInserts.push({
        user_id: user.id,
        step_name: 'tellMeAboutYou',
        response_data: data.tellMeAboutYou,
      });
    }

    if (data.aiAnalysis) {
      responseInserts.push({
        user_id: user.id,
        step_name: 'aiAnalysis',
        response_data: data.aiAnalysis,
      });
    }

    if (data.negativeHabits && data.negativeHabits.length > 0) {
      responseInserts.push({
        user_id: user.id,
        step_name: 'negativeHabits',
        response_data: data.negativeHabits,
      });
    }

    // Try to save responses (table may not exist yet)
    try {
      await supabase.from('onboarding_responses').insert(responseInserts);
    } catch (e) {
      console.warn('Could not save onboarding responses (table may not exist):', e);
    }

    // 2. Calculate and update faction stats
    // Use AI-generated levels if available, otherwise calculate
    for (const rating of data.factionRatings) {
      let level: number;

      if (data.aiAnalysis?.factionLevels?.[rating.factionId]) {
        // Use AI-generated level
        level = data.aiAnalysis.factionLevels[rating.factionId];
      } else {
        // Fall back to calculated level
        const deepDive = data.deepDive.find(d => d.factionId === rating.factionId);
        level = calculateFactionLevel(
          rating.importance,
          rating.currentStatus,
          deepDive?.yearsExperience
        );
      }

      const totalXp = calculateXpFromLevel(level);
      const xpMultiplier = calculateXpMultiplier(rating.importance);

      // Upsert faction stats
      await supabase.from('user_faction_stats').upsert(
        {
          user_id: user.id,
          faction_id: rating.factionId,
          level,
          total_xp: totalXp,
          weekly_xp: 0,
          monthly_xp: 0,
          importance: rating.importance,
          xp_multiplier: xpMultiplier,
          last_activity: new Date().toISOString(),
        },
        { onConflict: 'user_id,faction_id' }
      );
    }

    // 3. Create skills (if skill system exists)
    if (data.skills.length > 0) {
      // Get or create a default domain for custom skills
      const { data: domains } = await supabase
        .from('skill_domains')
        .select('id, faction_key')
        .limit(50);

      if (domains && domains.length > 0) {
        for (const skill of data.skills) {
          // Find a domain that matches the faction
          const matchingDomain = domains.find(d => d.faction_key === skill.factionId);
          if (!matchingDomain) continue;

          const skillLevel = calculateSkillLevel(skill.experience);
          const skillXp = calculateXpFromLevel(skillLevel);

          // Create skill entry
          const { data: skillEntry } = await supabase
            .from('skills')
            .insert({
              domain_id: matchingDomain.id,
              name: skill.name,
              icon: '⭐',
              description: `Erstellt während Onboarding`,
              display_order: 0,
              depth: 1,
            })
            .select()
            .single();

          if (skillEntry) {
            // Create user skill with calculated level
            await supabase.from('user_skills').insert({
              user_id: user.id,
              skill_id: skillEntry.id,
              level: skillLevel,
              current_xp: skillXp,
            });
          }
        }
      }
    }

    // 4. Create positive habits
    if (data.habits.length > 0) {
      const habitInserts = data.habits.map(habit => ({
        user_id: user.id,
        name: habit.name,
        description: `Erstellt während Onboarding`,
        icon: habit.icon,
        color: '#8B5CF6', // Default purple
        habit_type: 'positive' as const,
        frequency: habit.frequencyPerWeek >= 5 ? 'daily' : 'weekly' as const,
        target_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        current_streak: 1, // Start with small streak bonus
        longest_streak: 1,
        total_completions: 0,
        xp_per_completion: 25,
        faction_id: habit.factionId,
        is_active: true,
      }));

      await supabase.from('habits').insert(habitInserts);
    }

    // 4b. Create negative habits (habits to reduce)
    if (data.negativeHabits && data.negativeHabits.length > 0) {
      // For negative habits, use the primary affected faction
      const negativeHabitInserts = data.negativeHabits.map(habit => ({
        user_id: user.id,
        name: habit.name,
        description: `Gewohnheit zum Reduzieren (Onboarding)`,
        icon: habit.icon,
        color: '#10B981', // Emerald for negative habits
        habit_type: 'negative' as const,
        frequency: 'daily' as const,
        target_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        current_streak: 0,
        longest_streak: 0,
        total_completions: 0,
        xp_per_completion: 0, // No XP for avoiding negative habits
        faction_id: habit.affectedFactions[0], // Primary affected faction
        is_active: true,
      }));

      const { data: insertedHabits, error: habitsError } = await supabase
        .from('habits')
        .insert(negativeHabitInserts)
        .select('id');

      // Create habit_factions entries for multi-faction tracking
      if (!habitsError && insertedHabits) {
        const habitFactionInserts: { habit_id: string; faction_id: FactionId; weight: number }[] = [];

        insertedHabits.forEach((insertedHabit, index) => {
          const originalHabit = data.negativeHabits![index];
          const factionCount = originalHabit.affectedFactions.length;
          // Distribute weight evenly, with primary faction getting more
          const primaryWeight = factionCount > 1 ? 60 : 100;
          const secondaryWeight = factionCount > 1 ? Math.floor(40 / (factionCount - 1)) : 0;

          originalHabit.affectedFactions.forEach((factionId, factionIndex) => {
            habitFactionInserts.push({
              habit_id: insertedHabit.id,
              faction_id: factionId,
              weight: factionIndex === 0 ? primaryWeight : secondaryWeight,
            });
          });
        });

        if (habitFactionInserts.length > 0) {
          await supabase.from('habit_factions').insert(habitFactionInserts);
        }
      }
    }

    // 5. Store onboarding_completed in user_metadata for fast auth checks (no DB query needed)
    // This is the PRIMARY source of truth for onboarding status (faster than DB query)
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { onboarding_completed: true }
    });

    if (metadataError) {
      console.warn('Could not update user metadata (non-critical):', metadataError);
    }

    // 6. Update user profile
    // Use AI character class if available, otherwise calculate
    const characterClass = data.aiAnalysis?.characterClass || suggestCharacterClass(data.factionRatings);

    // Calculate total level (use AI levels if available)
    let totalLevel = 0;
    let totalXp = 0;

    for (const rating of data.factionRatings) {
      let level: number;

      if (data.aiAnalysis?.factionLevels?.[rating.factionId]) {
        level = data.aiAnalysis.factionLevels[rating.factionId];
      } else {
        const deepDive = data.deepDive.find(d => d.factionId === rating.factionId);
        level = calculateFactionLevel(
          rating.importance,
          rating.currentStatus,
          deepDive?.yearsExperience
        );
      }

      totalLevel += level;
      totalXp += calculateXpFromLevel(level);
    }

    const averageLevel = Math.max(1, Math.floor(totalLevel / 7));

    // Update profile and start AI trial
    await supabase
      .from('user_profiles')
      .update({
        display_name: data.profile.displayName,
        avatar_seed: data.profile.avatarSeed,
        bio: data.profile.bio || null,
        total_level: averageLevel,
        total_xp: totalXp,
        character_class: characterClass,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        // Start 5-hour AI trial
        trial_started_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // 6. Update notification settings
    if (data.notifications.enableReminders) {
      try {
        await supabase.from('notification_settings').upsert(
          {
            user_id: user.id,
            reminders_enabled: data.notifications.enableReminders,
            reminder_time: data.notifications.reminderTime,
            telegram_enabled: data.notifications.enableTelegram,
          },
          { onConflict: 'user_id' }
        );
      } catch (e) {
        console.warn('Could not update notification settings:', e);
      }
    }

    return NextResponse.json({
      success: true,
      characterClass,
      totalLevel: averageLevel,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
