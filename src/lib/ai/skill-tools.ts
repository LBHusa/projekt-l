// ============================================
// AI Chatbot Tools für Skill-Management
// FIXED: Uses Server-Client directly for all DB operations
// ============================================

import type { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import type { WorkoutType, WorkoutIntensity } from '@/lib/database.types';

// ============================================
// TOOL DEFINITIONS
// ============================================

export const skillTools: Anthropic.Tool[] = [
  {
    name: 'list_user_skills',
    description: 'Liste alle Skills des Users mit ihren aktuellen Levels und XP auf. Nützlich um einen Überblick zu bekommen welche Skills der User bereits hat.',
    input_schema: {
      type: 'object',
      properties: {
        domain_name: {
          type: 'string',
          description: 'Optional: Filtere nach Domain (z.B. "Coding", "Sport", "Finanzen")',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_skill',
    description: 'Erstelle einen neuen Skill in einer Domain. Der Skill kann auch einem Parent-Skill zugeordnet werden um eine Hierarchie aufzubauen.',
    input_schema: {
      type: 'object',
      properties: {
        domain_id: {
          type: 'string',
          description: 'Die UUID der Domain zu der der Skill gehört',
        },
        name: {
          type: 'string',
          description: 'Der Name des Skills (z.B. "Python", "Laufen", "Budgetplanung")',
        },
        icon: {
          type: 'string',
          description: 'Ein Emoji Icon für den Skill (z.B. "🐍" für Python)',
        },
        description: {
          type: 'string',
          description: 'Optionale Beschreibung des Skills',
        },
        parent_skill_id: {
          type: 'string',
          description: 'Optional: UUID des Parent-Skills wenn dies ein Sub-Skill ist',
        },
      },
      required: ['domain_id', 'name'],
    },
  },
  {
    name: 'update_skill_level',
    description: 'Setze das Level eines User-Skills auf einen bestimmten Wert. Dies ist nützlich wenn der User sagt "Setze mein Python Level auf 75".',
    input_schema: {
      type: 'object',
      properties: {
        skill_id: {
          type: 'string',
          description: 'Die UUID des Skills',
        },
        level: {
          type: 'number',
          description: 'Das neue Level (1-100)',
        },
      },
      required: ['skill_id', 'level'],
    },
  },
  {
    name: 'add_skill_xp',
    description: 'Füge einem Skill XP hinzu. Dies leveled den Skill automatisch hoch wenn genug XP erreicht wurde.',
    input_schema: {
      type: 'object',
      properties: {
        skill_id: {
          type: 'string',
          description: 'Die UUID des Skills',
        },
        xp_amount: {
          type: 'number',
          description: 'Die Menge an XP die hinzugefügt werden soll',
        },
        description: {
          type: 'string',
          description: 'Beschreibung was der User gemacht hat (z.B. "Python Tutorial absolviert")',
        },
      },
      required: ['skill_id', 'xp_amount', 'description'],
    },
  },
  {
    name: 'get_available_domains',
    description: 'Liste alle verfügbaren Skill-Domains auf (z.B. Coding, Sport, Finanzen, etc.)',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'suggest_skills',
    description: 'Schlage Skills vor die dem User basierend auf seinen vorhandenen Skills fehlen könnten. Dies analysiert die Skill-Landschaft und macht intelligente Vorschläge.',
    input_schema: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          description: 'Optional: Kontext für die Vorschläge (z.B. "Ich möchte Machine Learning lernen")',
        },
      },
      required: [],
    },
  },
  // ============================================
  // LIFE DOMAIN TOOLS - Finanzen
  // ============================================
  {
    name: 'log_income',
    description: 'Füge ein Einkommen hinzu (Gehalt, Bonus, Freelance, etc.). Nutze dies wenn der User sagt "ich verdiene X Euro", "ich habe Y bekommen", etc.',
    input_schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Betrag in Euro',
        },
        category: {
          type: 'string',
          description: 'Kategorie (z.B. "Gehalt", "Bonus", "Freelance", "Dividenden")',
        },
        description: {
          type: 'string',
          description: 'Optional: Beschreibung',
        },
        is_recurring: {
          type: 'boolean',
          description: 'Ist dies wiederkehrend (z.B. monatliches Gehalt)?',
        },
      },
      required: ['amount'],
    },
  },
  {
    name: 'log_expense',
    description: 'Füge eine Ausgabe hinzu. Nutze dies wenn der User sagt "ich habe X für Y bezahlt", "ich habe Z ausgegeben", etc.',
    input_schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Betrag in Euro',
        },
        category: {
          type: 'string',
          description: 'Kategorie (z.B. "Essen", "Transport", "Wohnen", "Shopping", "Unterhaltung")',
        },
        description: {
          type: 'string',
          description: 'Optional: Beschreibung',
        },
      },
      required: ['amount'],
    },
  },
  // ============================================
  // LIFE DOMAIN TOOLS - Körper/Fitness
  // ============================================
  {
    name: 'log_workout',
    description: 'Trage ein Workout/Training ins Trainingslog ein. Nutze dies wenn der User sagt "ich war joggen", "ich war im Gym", "ich habe trainiert", etc.',
    input_schema: {
      type: 'object',
      properties: {
        workout_type: {
          type: 'string',
          description: 'Art des Workouts. Mögliche Werte: "cardio" (Joggen, Laufen, Radfahren), "strength" (Krafttraining, Gym), "hiit" (HIIT, Intervalltraining), "yoga" (Yoga), "flexibility" (Stretching, Dehnen), "sports" (Fußball, Tennis, etc.), "other" (Sonstiges)',
          enum: ['cardio', 'strength', 'hiit', 'yoga', 'flexibility', 'sports', 'other'],
        },
        duration_minutes: {
          type: 'number',
          description: 'Dauer in Minuten',
        },
        intensity: {
          type: 'string',
          description: 'Optional: Intensität des Workouts (low, medium, high)',
          enum: ['low', 'medium', 'high'],
        },
        notes: {
          type: 'string',
          description: 'Optional: Notizen zum Workout',
        },
      },
      required: ['workout_type', 'duration_minutes'],
    },
  },
  // ============================================
  // LIFE DOMAIN TOOLS - Habits
  // ============================================
  {
    name: 'log_habit',
    description: 'Markiere ein Habit als erledigt. Nutze dies wenn der User sagt "ich habe meditiert", "ich habe Wasser getrunken", etc.',
    input_schema: {
      type: 'object',
      properties: {
        habit_name: {
          type: 'string',
          description: 'Name des Habits (z.B. "Meditation", "Wasser trinken", "Sport")',
        },
        notes: {
          type: 'string',
          description: 'Optional: Notizen zur Completion',
        },
      },
      required: ['habit_name'],
    },
  },
];

// ============================================
// TOOL EXECUTION - Uses Server-Client directly
// ============================================

export async function executeSkillTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string
): Promise<string> {
  if (!userId) {
    throw new Error('userId is required for tool execution');
  }

  try {
    switch (toolName) {
      case 'list_user_skills':
        return await handleListUserSkills(toolInput, userId);

      case 'create_skill':
        return await handleCreateSkill(toolInput, userId);

      case 'update_skill_level':
        return await handleUpdateSkillLevel(toolInput, userId);

      case 'add_skill_xp':
        return await handleAddSkillXp(toolInput, userId);

      case 'get_available_domains':
        return await handleGetAvailableDomains();

      case 'suggest_skills':
        return await handleSuggestSkills(toolInput, userId);

      case 'log_income':
        return await handleLogIncome(toolInput, userId);

      case 'log_expense':
        return await handleLogExpense(toolInput, userId);

      case 'log_workout':
        return await handleLogWorkout(toolInput, userId);

      case 'log_habit':
        return await handleLogHabit(toolInput, userId);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return JSON.stringify({
      error: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================
// TOOL HANDLERS - Skills (Server-Client)
// ============================================

async function handleListUserSkills(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = await createClient();

  const { data: skills, error } = await supabase
    .from('user_skills_full')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user skills:', error);
    throw error;
  }

  // Optional domain filter
  const domainFilter = input.domain_name as string | undefined;
  const filteredSkills = domainFilter
    ? (skills || []).filter((s) => s.domain_name?.toLowerCase() === domainFilter.toLowerCase())
    : skills || [];

  return JSON.stringify({
    success: true,
    count: filteredSkills.length,
    skills: filteredSkills.map((s) => ({
      id: s.skill_id,
      name: s.skill_name,
      domain: s.domain_name,
      level: s.level,
      current_xp: s.current_xp,
      icon: s.skill_icon,
      last_used: s.last_used,
    })),
  });
}

async function handleCreateSkill(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = await createClient();

  const { data: skill, error } = await supabase
    .from('skills')
    .insert({
      domain_id: input.domain_id as string,
      name: input.name as string,
      icon: (input.icon as string) || '⭐',
      description: input.description as string | undefined,
      parent_skill_id: input.parent_skill_id as string | undefined,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating skill:', error);
    throw error;
  }

  return JSON.stringify({
    success: true,
    skill: {
      id: skill.id,
      name: skill.name,
      icon: skill.icon,
      domain_id: skill.domain_id,
      parent_skill_id: skill.parent_skill_id,
    },
    message: `Skill "${skill.name}" erfolgreich erstellt!`,
  });
}

async function handleUpdateSkillLevel(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = await createClient();
  const skillId = input.skill_id as string;
  const targetLevel = input.level as number;

  if (targetLevel < 1 || targetLevel > 100) {
    throw new Error('Level muss zwischen 1 und 100 liegen');
  }

  // Get skill info
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select('*')
    .eq('id', skillId)
    .single();

  if (skillError || !skill) {
    throw new Error('Skill nicht gefunden');
  }

  // Get user's current skill state
  const { data: userSkill, error: userSkillError } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .single();

  if (userSkillError?.code === 'PGRST116' || !userSkill) {
    throw new Error(`Du hast den Skill "${skill.name}" noch nicht. Füge zuerst XP hinzu um ihn zu aktivieren.`);
  }

  const currentLevel = userSkill.level || 1;
  const currentXp = userSkill.current_xp || 0;

  if (targetLevel < currentLevel) {
    return JSON.stringify({
      success: false,
      message: `Level kann nicht von ${currentLevel} auf ${targetLevel} reduziert werden. Du kannst nur Levels erhöhen!`,
      current_level: currentLevel,
      skill_name: skill.name,
    });
  }

  if (targetLevel === currentLevel) {
    return JSON.stringify({
      success: true,
      message: `${skill.icon || '⭐'} ${skill.name} ist bereits auf Level ${currentLevel}!`,
      current_level: currentLevel,
      current_xp: currentXp,
      skill_name: skill.name,
    });
  }

  // Calculate XP needed to reach target level (100 XP per level)
  const xpPerLevel = 100;
  const targetXp = targetLevel * xpPerLevel;
  const xpToAdd = targetXp - currentXp;

  if (xpToAdd <= 0) {
    return JSON.stringify({
      success: true,
      message: `${skill.icon || '⭐'} ${skill.name} hat bereits genug XP für Level ${targetLevel}!`,
      current_level: currentLevel,
      current_xp: currentXp,
      skill_name: skill.name,
    });
  }

  // Add XP directly
  const newXp = currentXp + xpToAdd;
  const newLevel = Math.floor(newXp / xpPerLevel) + 1;

  const { error: updateError } = await supabase
    .from('user_skills')
    .update({
      current_xp: newXp,
      level: newLevel,
      last_used: new Date().toISOString(),
    })
    .eq('id', userSkill.id);

  if (updateError) {
    throw updateError;
  }

  // Log experience
  await supabase.from('experiences').insert({
    user_id: userId,
    skill_id: skillId,
    xp_gained: xpToAdd,
    description: `Level manuell auf ${targetLevel} gesetzt`,
    date: new Date().toISOString().split('T')[0],
  });

  return JSON.stringify({
    success: true,
    skill_name: skill.name,
    skill_icon: skill.icon,
    previous_level: currentLevel,
    new_level: newLevel,
    current_xp: newXp,
    xp_added: xpToAdd,
    message: `🎉 ${skill.icon || '⭐'} ${skill.name} ist jetzt Level ${newLevel}! (+${xpToAdd} XP)`,
  });
}

async function handleAddSkillXp(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = await createClient();
  const skillId = input.skill_id as string;
  const xpAmount = input.xp_amount as number;
  const description = input.description as string;

  // Get skill info
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select('*')
    .eq('id', skillId)
    .single();

  if (skillError || !skill) {
    throw new Error('Skill nicht gefunden');
  }

  // Get or create user skill
  let userSkill;
  const { data: existingUserSkill, error: fetchError } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .single();

  if (fetchError?.code === 'PGRST116' || !existingUserSkill) {
    // Create new user skill
    const { data: newUserSkill, error: createError } = await supabase
      .from('user_skills')
      .insert({
        user_id: userId,
        skill_id: skillId,
        level: 1,
        current_xp: 0,
      })
      .select()
      .single();

    if (createError) throw createError;
    userSkill = newUserSkill;
  } else {
    userSkill = existingUserSkill;
  }

  // Calculate new XP and level
  const xpPerLevel = 100;
  const newXp = userSkill.current_xp + xpAmount;
  const newLevel = Math.floor(newXp / xpPerLevel) + 1;
  const leveledUp = newLevel > userSkill.level;

  // Update user skill
  const { error: updateError } = await supabase
    .from('user_skills')
    .update({
      current_xp: newXp,
      level: newLevel,
      last_used: new Date().toISOString(),
    })
    .eq('id', userSkill.id);

  if (updateError) throw updateError;

  // Log experience
  await supabase.from('experiences').insert({
    user_id: userId,
    skill_id: skillId,
    xp_gained: xpAmount,
    description,
    date: new Date().toISOString().split('T')[0],
  });

  return JSON.stringify({
    success: true,
    skill_name: skill.name,
    new_level: newLevel,
    current_xp: newXp,
    xp_gained: xpAmount,
    leveled_up: leveledUp,
    message: leveledUp
      ? `🎉 Skill "${skill.name}" ist auf Level ${newLevel} aufgestiegen!`
      : `+${xpAmount} XP zu "${skill.name}" hinzugefügt`,
  });
}

async function handleGetAvailableDomains(): Promise<string> {
  const supabase = await createClient();

  const { data: domains, error } = await supabase
    .from('domains')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching domains:', error);
    throw error;
  }

  return JSON.stringify({
    success: true,
    count: (domains || []).length,
    domains: (domains || []).map((d) => ({
      id: d.id,
      name: d.name,
      icon: d.icon,
      color: d.color,
    })),
  });
}

async function handleSuggestSkills(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = await createClient();

  // Get user's current skills
  const { data: userSkills } = await supabase
    .from('user_skills_full')
    .select('*')
    .eq('user_id', userId);

  const { data: domains } = await supabase
    .from('domains')
    .select('*');

  // Analyze which domains have few skills
  const domainSkillCounts = new Map<string, number>();
  (domains || []).forEach((d) => {
    domainSkillCounts.set(d.name, 0);
  });

  (userSkills || []).forEach((s) => {
    if (s.domain_name) {
      domainSkillCounts.set(s.domain_name, (domainSkillCounts.get(s.domain_name) || 0) + 1);
    }
  });

  const suggestions = [];

  // Suggest domains that are underrepresented
  for (const [domainName, count] of domainSkillCounts.entries()) {
    if (count < 3) {
      const domain = (domains || []).find((d) => d.name === domainName);
      if (domain) {
        suggestions.push({
          type: 'domain',
          domain: domain.name,
          reason: `Du hast nur ${count} Skills in ${domain.name}. Möchtest du hier mehr Skills aufbauen?`,
        });
      }
    }
  }

  // Context-based suggestions
  const context = input.context as string | undefined;
  if (context?.toLowerCase().includes('machine learning')) {
    suggestions.push({
      type: 'skill_recommendation',
      skills: ['Python', 'Statistics', 'TensorFlow', 'Data Preprocessing'],
      reason: 'Für Machine Learning sind diese Skills essentiell',
    });
  }

  return JSON.stringify({
    success: true,
    suggestions,
    context: context || null,
  });
}

// ============================================
// TOOL HANDLERS - Finanzen (Server-Client)
// ============================================

async function handleLogIncome(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = await createClient();
  const amount = input.amount as number;
  const category = (input.category as string) || 'Gehalt';
  const description = input.description as string | undefined;
  const isRecurring = input.is_recurring as boolean | undefined;

  // Get first account
  const { data: accounts, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .limit(1);

  if (accountError || !accounts || accounts.length === 0) {
    return JSON.stringify({
      success: false,
      error: 'Kein Konto gefunden. Bitte erstelle zuerst ein Konto.',
    });
  }

  const defaultAccount = accounts[0];

  // Create income transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: defaultAccount.id,
      transaction_type: 'income',
      category,
      amount,
      description: description || `Einkommen: ${category}`,
      occurred_at: new Date().toISOString(),
      is_recurring: isRecurring || false,
      recurring_frequency: isRecurring ? 'monthly' : null,
    })
    .select()
    .single();

  if (txError || !transaction) {
    console.error('Error creating transaction:', txError);
    return JSON.stringify({
      success: false,
      error: 'Fehler beim Erstellen der Transaktion',
    });
  }

  // Update account balance
  await supabase
    .from('accounts')
    .update({ balance: defaultAccount.balance + amount })
    .eq('id', defaultAccount.id);

  return JSON.stringify({
    success: true,
    transaction_id: transaction.id,
    amount,
    category,
    account_name: defaultAccount.name,
    is_recurring: isRecurring || false,
    message: `💰 ${amount}€ Einkommen (${category}) auf ${defaultAccount.name} eingetragen!`,
  });
}

async function handleLogExpense(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = await createClient();
  const amount = input.amount as number;
  const category = (input.category as string | undefined) || 'Sonstiges';
  const description = (input.description as string | undefined) || '';

  // Get first account
  const { data: accounts, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .limit(1);

  if (accountError || !accounts || accounts.length === 0) {
    return JSON.stringify({
      success: false,
      error: 'Keine Konten gefunden. Bitte erstelle zuerst ein Konto.',
    });
  }

  const defaultAccount = accounts[0];

  // Create expense transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: defaultAccount.id,
      transaction_type: 'expense',
      category,
      amount,
      description,
      occurred_at: new Date().toISOString(),
      is_recurring: false,
    })
    .select()
    .single();

  if (txError || !transaction) {
    console.error('Error creating transaction:', txError);
    return JSON.stringify({
      success: false,
      error: 'Fehler beim Erstellen der Transaktion',
    });
  }

  // Update account balance
  await supabase
    .from('accounts')
    .update({ balance: defaultAccount.balance - amount })
    .eq('id', defaultAccount.id);

  // Check budget status
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  const { data: budget } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .single();

  let budgetWarning = null;
  if (budget) {
    // Get month's spending for this category
    const { data: monthlySpending } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('transaction_type', 'expense')
      .eq('category', category)
      .gte('occurred_at', startOfMonth)
      .lte('occurred_at', endOfMonth);

    const spent = (monthlySpending || []).reduce((sum, t) => sum + t.amount, 0);
    const remaining = budget.amount - spent;

    if (remaining < 0) {
      budgetWarning = `⚠️ Budget für ${category} überschritten! Noch ${Math.abs(remaining).toFixed(2)}€ über dem Limit.`;
    } else if (remaining < budget.amount * 0.2) {
      budgetWarning = `💡 Budget für ${category} fast aufgebraucht. Noch ${remaining.toFixed(2)}€ verfügbar.`;
    }
  }

  return JSON.stringify({
    success: true,
    transaction_id: transaction.id,
    amount: transaction.amount,
    category: transaction.category,
    account: defaultAccount.name,
    message: `Ausgabe von ${amount}€ für ${category} erfolgreich gespeichert`,
    budget_warning: budgetWarning,
  });
}

// ============================================
// TOOL HANDLERS - Körper/Fitness (Server-Client)
// ============================================

function calculateWorkoutXP(workoutType: WorkoutType, durationMinutes: number, intensity?: WorkoutIntensity): number {
  let baseXP = 15;

  // Duration bonus
  if (durationMinutes >= 60) baseXP += 20;
  else if (durationMinutes >= 30) baseXP += 10;
  else if (durationMinutes >= 15) baseXP += 5;

  // Intensity bonus
  if (intensity === 'high') baseXP += 10;
  else if (intensity === 'medium') baseXP += 5;

  // Type bonus
  if (['hiit', 'strength'].includes(workoutType)) baseXP += 5;

  return baseXP;
}

async function handleLogWorkout(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = await createClient();
  const workoutType = input.workout_type as WorkoutType;
  const durationMinutes = input.duration_minutes as number;
  const intensity = (input.intensity as WorkoutIntensity | undefined) || undefined;
  const notes = input.notes as string | undefined;

  const workoutNames: Record<WorkoutType, string> = {
    cardio: 'Cardio Training',
    strength: 'Krafttraining',
    hiit: 'HIIT Training',
    yoga: 'Yoga Session',
    flexibility: 'Mobility & Stretching',
    sports: 'Sport',
    other: 'Training',
  };

  const xpGained = calculateWorkoutXP(workoutType, durationMinutes, intensity);

  const { data: workout, error } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      name: workoutNames[workoutType] || 'Training',
      workout_type: workoutType,
      duration_minutes: durationMinutes,
      intensity,
      notes,
      occurred_at: new Date().toISOString(),
      xp_gained: xpGained,
    })
    .select()
    .single();

  if (error || !workout) {
    console.error('Error creating workout:', error);
    throw new Error('Fehler beim Erstellen des Workouts');
  }

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: userId,
    activity_type: 'workout_logged',
    title: `${workout.name} absolviert`,
    description: `${durationMinutes} Minuten ${workoutType}`,
    xp_amount: xpGained,
    faction_id: 'koerper',
    related_entity_type: 'workout',
    related_entity_id: workout.id,
  });

  // Update faction stats (UPSERT - erstellt Zeile falls nicht vorhanden)
  const { data: currentStats } = await supabase
    .from('user_faction_stats')
    .select('total_xp')
    .eq('user_id', userId)
    .eq('faction_id', 'koerper')
    .maybeSingle();

  const newXP = (currentStats?.total_xp || 0) + xpGained;
  await supabase
    .from('user_faction_stats')
    .upsert({
      user_id: userId,
      faction_id: 'koerper',
      total_xp: newXP,
      level: Math.floor(newXP / 100) + 1,
    }, { onConflict: 'user_id,faction_id' });

  return JSON.stringify({
    success: true,
    workout: {
      id: workout.id,
      name: workout.name,
      type: workout.workout_type,
      duration: workout.duration_minutes,
      xp_earned: xpGained,
    },
    message: `🏋️ Workout erfolgreich eingetragen! Du hast ${xpGained} XP verdient.`,
  });
}

// ============================================
// TOOL HANDLERS - Habits (Server-Client)
// ============================================

async function handleLogHabit(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const supabase = await createClient();
  const habitName = input.habit_name as string;
  const notes = (input.notes as string | undefined) || undefined;

  // Get all habits
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (habitsError || !habits || habits.length === 0) {
    return JSON.stringify({
      success: false,
      error: 'Keine Habits gefunden. Bitte erstelle zuerst ein Habit.',
    });
  }

  // Fuzzy match habit by name
  const normalizedSearch = habitName.toLowerCase().trim();
  const matchedHabit = habits.find((h) =>
    h.name.toLowerCase().includes(normalizedSearch) || normalizedSearch.includes(h.name.toLowerCase())
  );

  if (!matchedHabit) {
    return JSON.stringify({
      success: false,
      error: `Habit "${habitName}" nicht gefunden`,
      available_habits: habits.map((h) => h.name),
    });
  }

  // Check if already completed today
  const today = new Date().toISOString().split('T')[0];
  const { data: existingLog } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', matchedHabit.id)
    .eq('user_id', userId)
    .gte('logged_at', `${today}T00:00:00`)
    .lt('logged_at', `${today}T23:59:59`)
    .single();

  if (existingLog) {
    return JSON.stringify({
      success: false,
      error: `${matchedHabit.icon || '✓'} ${matchedHabit.name} wurde heute bereits abgehakt!`,
    });
  }

  // Calculate new streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { data: yesterdayLog } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', matchedHabit.id)
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('logged_at', `${yesterdayStr}T00:00:00`)
    .lt('logged_at', `${yesterdayStr}T23:59:59`)
    .single();

  const newStreak = yesterdayLog ? matchedHabit.current_streak + 1 : 1;
  const xpGained = matchedHabit.xp_per_completion || 10;

  // Log the completion
  const { error: logError } = await supabase.from('habit_logs').insert({
    habit_id: matchedHabit.id,
    user_id: userId,
    completed: true,
    notes,
    logged_at: new Date().toISOString(),
  });

  if (logError) {
    throw logError;
  }

  // Update habit stats
  await supabase
    .from('habits')
    .update({
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, matchedHabit.longest_streak),
      total_completions: matchedHabit.total_completions + 1,
      last_completed_at: new Date().toISOString(),
    })
    .eq('id', matchedHabit.id);

  // Update faction XP if faction assigned (UPSERT - erstellt Zeile falls nicht vorhanden)
  if (matchedHabit.faction_id) {
    const { data: factionStats } = await supabase
      .from('user_faction_stats')
      .select('total_xp')
      .eq('user_id', userId)
      .eq('faction_id', matchedHabit.faction_id)
      .maybeSingle();

    const newXP = (factionStats?.total_xp || 0) + xpGained;
    await supabase
      .from('user_faction_stats')
      .upsert({
        user_id: userId,
        faction_id: matchedHabit.faction_id,
        total_xp: newXP,
        level: Math.floor(newXP / 100) + 1,
      }, { onConflict: 'user_id,faction_id' });
  }


  return JSON.stringify({
    success: true,
    habit_name: matchedHabit.name,
    habit_icon: matchedHabit.icon,
    xp_gained: xpGained,
    current_streak: newStreak,
    message:
      newStreak > 1
        ? `${matchedHabit.icon || '✓'} ${matchedHabit.name} erledigt! ${newStreak} Tage Streak 🔥 (+${xpGained} XP)`
        : `${matchedHabit.icon || '✓'} ${matchedHabit.name} erledigt! (+${xpGained} XP)`,
  });
}
