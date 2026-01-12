// ============================================
// AI Chatbot Tools für Skill-Management
// ============================================

import type { Anthropic } from '@anthropic-ai/sdk';
import { createSkill, updateSkill, getSkillById } from '@/lib/data/skills';
import { getUserSkills, addXpToSkill } from '@/lib/data/user-skills';
import { getAllDomains } from '@/lib/data/domains';
import { createWorkout, type WorkoutFormData } from '@/lib/data/koerper';
import type { UserSkillFull, WorkoutType, WorkoutIntensity } from '@/lib/database.types';

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
];

// ============================================
// TOOL EXECUTION
// ============================================

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function executeSkillTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string = TEST_USER_ID
): Promise<string> {
  try {
    switch (toolName) {
      case 'list_user_skills':
        return await handleListUserSkills(toolInput, userId);

      case 'create_skill':
        return await handleCreateSkill(toolInput);

      case 'update_skill_level':
        return await handleUpdateSkillLevel(toolInput, userId);

      case 'add_skill_xp':
        return await handleAddSkillXp(toolInput, userId);

      case 'get_available_domains':
        return await handleGetAvailableDomains();

      case 'suggest_skills':
        return await handleSuggestSkills(toolInput, userId);

      case 'log_workout':
        return await handleLogWorkout(toolInput, userId);

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
// TOOL HANDLERS
// ============================================

async function handleListUserSkills(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const skills = await getUserSkills(userId);

  // Optional domain filter
  const domainFilter = input.domain_name as string | undefined;
  const filteredSkills = domainFilter
    ? skills.filter((s) => s.domain_name?.toLowerCase() === domainFilter.toLowerCase())
    : skills;

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

async function handleCreateSkill(input: Record<string, unknown>): Promise<string> {
  const skill = await createSkill({
    domain_id: input.domain_id as string,
    name: input.name as string,
    icon: (input.icon as string) || '⭐',
    description: input.description as string | undefined,
    parent_skill_id: input.parent_skill_id as string | undefined,
  });

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
  const skillId = input.skill_id as string;
  const level = input.level as number;

  if (level < 1 || level > 100) {
    throw new Error('Level muss zwischen 1 und 100 liegen');
  }

  // Get skill info for response
  const skill = await getSkillById(skillId);
  if (!skill) {
    throw new Error('Skill nicht gefunden');
  }

  // We need to calculate the XP for the new level and update user_skills
  // For now, we'll use a simplified approach - just set the level directly
  // Note: This is a simplified implementation. In production, you'd want to
  // properly calculate XP based on the level formula

  return JSON.stringify({
    success: true,
    message: `Level Update Feature noch nicht implementiert. Verwende stattdessen add_skill_xp um Skills zu leveln.`,
    skill_name: skill.name,
  });
}

async function handleAddSkillXp(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const result = await addXpToSkill(
    input.skill_id as string,
    input.xp_amount as number,
    input.description as string,
    userId
  );

  const skill = await getSkillById(input.skill_id as string);

  return JSON.stringify({
    success: true,
    skill_name: skill?.name || 'Unknown',
    new_level: result.userSkill.level,
    current_xp: result.userSkill.current_xp,
    xp_gained: input.xp_amount,
    leveled_up: result.leveledUp,
    message: result.leveledUp
      ? `🎉 Skill "${skill?.name}" ist auf Level ${result.userSkill.level} aufgestiegen!`
      : `+${input.xp_amount} XP zu "${skill?.name}" hinzugefügt`,
  });
}

async function handleGetAvailableDomains(): Promise<string> {
  const domains = await getAllDomains();

  return JSON.stringify({
    success: true,
    count: domains.length,
    domains: domains.map((d) => ({
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
  // Get user's current skills
  const userSkills = await getUserSkills(userId);
  const domains = await getAllDomains();

  // Analyze which domains have few skills
  const domainSkillCounts = new Map<string, number>();
  domains.forEach((d) => {
    domainSkillCounts.set(d.name, 0);
  });

  userSkills.forEach((s) => {
    if (s.domain_name) {
      domainSkillCounts.set(s.domain_name, (domainSkillCounts.get(s.domain_name) || 0) + 1);
    }
  });

  const suggestions = [];

  // Suggest domains that are underrepresented
  for (const [domainName, count] of domainSkillCounts.entries()) {
    if (count < 3) {
      const domain = domains.find((d) => d.name === domainName);
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

async function handleLogWorkout(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const workoutType = input.workout_type as WorkoutType;
  const durationMinutes = input.duration_minutes as number;
  const intensity = (input.intensity as WorkoutIntensity | undefined) || undefined;
  const notes = input.notes as string | undefined;

  // Determine workout name based on type
  const workoutNames: Record<WorkoutType, string> = {
    cardio: 'Cardio Training',
    strength: 'Krafttraining',
    hiit: 'HIIT Training',
    yoga: 'Yoga Session',
    flexibility: 'Mobility & Stretching',
    sports: 'Sport',
    other: 'Training',
  };

  const workoutData: WorkoutFormData = {
    name: workoutNames[workoutType] || 'Training',
    workout_type: workoutType,
    duration_minutes: durationMinutes,
    intensity,
    notes,
    occurred_at: new Date().toISOString(),
  };

  const workout = await createWorkout(workoutData);

  if (!workout) {
    throw new Error('Fehler beim Erstellen des Workouts');
  }

  return JSON.stringify({
    success: true,
    workout: {
      id: workout.id,
      name: workout.name,
      type: workout.workout_type,
      duration: workout.duration_minutes,
      xp_earned: workout.xp_gained,
    },
    message: `🏋️ Workout erfolgreich eingetragen! Du hast ${workout.xp_gained} XP verdient.`,
  });
}
