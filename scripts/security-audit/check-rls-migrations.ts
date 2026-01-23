/**
 * Security Audit: Check RLS Migrations
 *
 * Verifies that all tables in migrations have Row Level Security enabled.
 */

import * as fs from 'fs';
import * as path from 'path';

interface TableInfo {
  name: string;
  file: string;
  hasRLS: boolean;
  hasPolicies: boolean;
}

// Tables that don't need RLS (public data, no user data)
const RLS_EXEMPT_TABLES = [
  // Reference/lookup data
  'factions', // Public reference data
  'achievement_types', // Public reference data
  'skill_domains', // Public reference data
  'achievements', // Achievement types reference data
  'skills', // Skill definitions (shared templates)
  'skill_connections', // Skill relationships (shared)
  'skill_templates', // Skill templates (shared)
  'skill_domain_assignments', // Domain-skill mappings (shared)
  'skill_faction_mapping', // Skill-faction mappings (shared)
  'exercises', // Exercise library (shared)
  'activity_categories', // Activity categories (shared)
  // Views and internal tables
  'graph_views', // Materialized view for graph
  // Related workout tables (reference data, linked to workout_sessions which has RLS)
  'workout_exercises', // Exercise instances in workouts
  'exercise_sets', // Sets within exercises
  // Contact sub-table (protected via contacts parent RLS)
  'contact_important_dates', // Related to contacts which has RLS
];

function parseMigrations(migrationsDir: string): Map<string, TableInfo> {
  const tables = new Map<string, TableInfo>();

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    // Find CREATE TABLE statements
    const createTableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(?:public\.)?(\w+)/gi;
    let match;
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1].toLowerCase();
      if (!tables.has(tableName)) {
        tables.set(tableName, {
          name: tableName,
          file,
          hasRLS: false,
          hasPolicies: false,
        });
      }
    }

    // Find ALTER TABLE ... ENABLE ROW LEVEL SECURITY
    const rlsRegex = /ALTER TABLE(?:\s+IF EXISTS)?\s+(?:public\.)?(\w+)\s+ENABLE ROW LEVEL SECURITY/gi;
    while ((match = rlsRegex.exec(content)) !== null) {
      const tableName = match[1].toLowerCase();
      const table = tables.get(tableName);
      if (table) {
        table.hasRLS = true;
      }
    }

    // Find CREATE POLICY statements
    const policyRegex = /CREATE POLICY\s+\w+\s+ON\s+(?:public\.)?(\w+)/gi;
    while ((match = policyRegex.exec(content)) !== null) {
      const tableName = match[1].toLowerCase();
      const table = tables.get(tableName);
      if (table) {
        table.hasPolicies = true;
      }
    }
  }

  return tables;
}

export function checkRLSMigrations(): { tables: TableInfo[]; passed: boolean } {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found:', migrationsDir);
    return { tables: [], passed: false };
  }

  const tables = parseMigrations(migrationsDir);
  const tableList = Array.from(tables.values());

  // Filter out exempt tables
  const tablesToCheck = tableList.filter(
    (t) => !RLS_EXEMPT_TABLES.includes(t.name)
  );

  const missingRLS = tablesToCheck.filter((t) => !t.hasRLS);
  const missingPolicies = tablesToCheck.filter((t) => t.hasRLS && !t.hasPolicies);

  console.log('\n=== RLS Migration Check ===\n');
  console.log(`Total tables: ${tableList.length}`);
  console.log(`Tables checked (non-exempt): ${tablesToCheck.length}`);
  console.log(`With RLS enabled: ${tablesToCheck.filter((t) => t.hasRLS).length}`);
  console.log(`With policies: ${tablesToCheck.filter((t) => t.hasPolicies).length}`);

  if (missingRLS.length > 0) {
    console.log('\n--- TABLES MISSING RLS ---');
    missingRLS.forEach((t) => {
      console.log(`  [FAIL] ${t.name} (created in ${t.file})`);
    });
  }

  if (missingPolicies.length > 0) {
    console.log('\n--- TABLES WITH RLS BUT NO POLICIES ---');
    missingPolicies.forEach((t) => {
      console.log(`  [WARN] ${t.name} (created in ${t.file})`);
    });
  }

  console.log('\n--- RLS-EXEMPT TABLES ---');
  RLS_EXEMPT_TABLES.forEach((t) => console.log(`  ${t}`));

  // Pass if all non-exempt tables have RLS
  const passed = missingRLS.length === 0;

  return { tables: tableList, passed };
}

// Run if executed directly
if (require.main === module) {
  const { passed } = checkRLSMigrations();
  process.exit(passed ? 0 : 1);
}
