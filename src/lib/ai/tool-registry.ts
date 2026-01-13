// ============================================
// AI Tool Registry
// Zentrale Verwaltung aller AI Tools
// ============================================

import type { Anthropic } from '@anthropic-ai/sdk';
import { skillTools, executeSkillTool } from './skill-tools';
// Später: import { lifeTools, executeLifeTool } from './life-tools';

// ============================================
// TYPES
// ============================================

export interface ToolModule {
  tools: Anthropic.Tool[];
  execute: (name: string, input: Record<string, unknown>, userId: string) => Promise<string>;
}

// ============================================
// REGISTRY
// ============================================

/**
 * Registry aller Tool-Module
 * Neue Module können hier einfach hinzugefügt werden
 */
const modules: ToolModule[] = [
  { tools: skillTools, execute: executeSkillTool },
  // Zukünftige Module:
  // { tools: lifeTools, execute: executeLifeTool },
  // { tools: financeTools, execute: executeFinanceTool },
];

// ============================================
// PUBLIC API
// ============================================

/**
 * Gibt alle verfügbaren Tools für die Claude API zurück
 */
export function getAllTools(): Anthropic.Tool[] {
  return modules.flatMap(m => m.tools);
}

/**
 * Führt ein Tool aus (findet automatisch das richtige Modul)
 *
 * @param name Tool-Name
 * @param input Tool-Input
 * @param userId User ID
 * @returns Tool-Ergebnis als JSON String
 * @throws Error wenn Tool nicht gefunden wurde
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  for (const module of modules) {
    const tool = module.tools.find(t => t.name === name);
    if (tool) {
      return module.execute(name, input, userId);
    }
  }

  throw new Error(`Unknown tool: ${name}`);
}

/**
 * Gibt die Anzahl registrierter Tools zurück
 */
export function getToolCount(): number {
  return getAllTools().length;
}

/**
 * Gibt alle registrierten Tool-Namen zurück
 */
export function getToolNames(): string[] {
  return getAllTools().map(t => t.name);
}
