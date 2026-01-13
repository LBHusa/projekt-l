// ============================================
// AI Chatbot Tools für Skill-Management
// ============================================

import type { Anthropic } from '@anthropic-ai/sdk';
import { createSkill, updateSkill, getSkillById } from '@/lib/data/skills';
import { getUserSkills, addXpToSkill } from '@/lib/data/user-skills';
import { getAllDomains } from '@/lib/data/domains';
import { getNetWorth, getMonthlyCashflow, getAccounts } from '@/lib/data/finanzen';
import { saveJournalEntry } from '@/lib/data/geist';
import { createContact } from '@/lib/data/contacts';
import type { UserSkillFull } from '@/lib/database.types';

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
    name: 'get_balance',
    description: 'Ruft Kontostand und Networth ab. Nutze dies wenn der User fragt "wie viel Geld habe ich?", "wie ist mein Kontostand?", "wie sieht mein Budget aus?"',
    input_schema: {
      type: 'object',
      properties: {
        detail_level: {
          type: 'string',
          enum: ['summary', 'detailed'],
          description: 'Detailgrad: summary = nur Networth, detailed = alle Konten',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_journal',
    description: 'Tagebucheintrag erstellen. Nutze dies wenn der User einen Tagebucheintrag schreiben möchte oder reflektieren will.',
    input_schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Der Tagebucheintrag-Text',
        },
        prompt: {
          type: 'string',
          description: 'Optionaler Prompt/Frage die beantwortet wird',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'create_contact',
    description: 'Neuen Kontakt anlegen. Nutze dies wenn der User eine neue Person zu seinem Netzwerk hinzufügen möchte.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name des Kontakts (Vor- und Nachname)',
        },
        relationship_type: {
          type: 'string',
          description: 'Beziehungstyp: parent, sibling, partner, child, relative, best_friend, close_friend, friend, acquaintance, colleague, boss, employee, business_partner, mentor, student, other',
        },
        notes: {
          type: 'string',
          description: 'Optionale Notizen zum Kontakt',
        },
      },
      required: ['name'],
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

      case 'get_balance':
        return await handleGetBalance(toolInput, userId);

      case 'create_journal':
        return await handleCreateJournal(toolInput, userId);

      case 'create_contact':
        return await handleCreateContact(toolInput, userId);

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

async function handleGetBalance(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const detailLevel = (input.detail_level as string) || 'summary';

  // Get networth data
  const netWorth = await getNetWorth();

  // Get current month's cashflow
  const now = new Date();
  const cashflow = await getMonthlyCashflow(now.getFullYear(), now.getMonth() + 1);

  if (detailLevel === 'summary') {
    // Summary view: just networth and cashflow
    return JSON.stringify({
      success: true,
      detail_level: 'summary',
      net_worth: netWorth?.net_worth || 0,
      assets_total: netWorth?.assets_total || 0,
      debt_total: netWorth?.debt_total || 0,
      monthly_income: cashflow.income,
      monthly_expenses: cashflow.expenses,
      monthly_savings: cashflow.savings,
      monthly_net: cashflow.net,
      formatted: {
        net_worth: formatEuro(netWorth?.net_worth || 0),
        assets_total: formatEuro(netWorth?.assets_total || 0),
        debt_total: formatEuro(netWorth?.debt_total || 0),
        monthly_income: formatEuro(cashflow.income),
        monthly_expenses: formatEuro(cashflow.expenses),
        monthly_savings: formatEuro(cashflow.savings),
        monthly_net: formatEuro(cashflow.net),
      },
    });
  } else {
    // Detailed view: include all accounts
    const accounts = await getAccounts();

    return JSON.stringify({
      success: true,
      detail_level: 'detailed',
      net_worth: netWorth?.net_worth || 0,
      assets_total: netWorth?.assets_total || 0,
      debt_total: netWorth?.debt_total || 0,
      monthly_income: cashflow.income,
      monthly_expenses: cashflow.expenses,
      monthly_savings: cashflow.savings,
      monthly_net: cashflow.net,
      accounts: accounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.account_type,
        balance: a.current_balance,
        formatted_balance: formatEuro(a.current_balance),
        currency: a.currency,
      })),
      formatted: {
        net_worth: formatEuro(netWorth?.net_worth || 0),
        assets_total: formatEuro(netWorth?.assets_total || 0),
        debt_total: formatEuro(netWorth?.debt_total || 0),
        monthly_income: formatEuro(cashflow.income),
        monthly_expenses: formatEuro(cashflow.expenses),
        monthly_savings: formatEuro(cashflow.savings),
        monthly_net: formatEuro(cashflow.net),
      },
    });
  }
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

async function handleCreateJournal(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const content = input.content as string;
  const prompt = input.prompt as string | undefined;

  if (!content || content.trim().length === 0) {
    return JSON.stringify({
      success: false,
      error: 'Content is required and cannot be empty',
    });
  }

  try {
    const entry = await saveJournalEntry(content, prompt, userId);

    return JSON.stringify({
      success: true,
      entry: {
        id: entry.id,
        word_count: entry.word_count,
        xp_gained: entry.xp_gained,
        created_at: entry.created_at,
      },
      message: `Tagebucheintrag erstellt! ${entry.word_count} Wörter, +${entry.xp_gained} XP`,
    });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create journal entry',
    });
  }
}

async function handleCreateContact(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const name = input.name as string;
  const relationshipType = (input.relationship_type as string) || 'other';
  const notes = input.notes as string | undefined;

  if (!name || name.trim().length === 0) {
    return JSON.stringify({
      success: false,
      error: 'Name is required and cannot be empty',
    });
  }

  // Parse name into first_name and last_name
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

  try {
    const contact = await createContact({
      first_name: firstName,
      last_name: lastName,
      relationship_type: relationshipType as any,
      notes: notes,
    });

    return JSON.stringify({
      success: true,
      contact: {
        id: contact.id,
        name: `${contact.first_name}${contact.last_name ? ' ' + contact.last_name : ''}`,
        relationship_type: contact.relationship_type,
        relationship_category: contact.relationship_category,
        created_at: contact.created_at,
      },
      message: `Kontakt "${contact.first_name}${contact.last_name ? ' ' + contact.last_name : ''}" erfolgreich angelegt!`,
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create contact',
    });
  }
}
