/**
 * Security Audit: Check for Hardcoded IDs
 *
 * Scans codebase for hardcoded UUIDs that could indicate
 * security issues or environment-specific configurations.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  file: string;
  line: number;
  content: string;
  type: 'uuid' | 'user_id' | 'api_key';
}

// UUID pattern (v4)
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Patterns that are OK (test files, type definitions, etc.)
const ALLOWED_PATTERNS = [
  // Test files
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\/__tests__\//,
  // Type definitions
  /\.d\.ts$/,
  // Migration files (UUIDs in schema are fine)
  /migrations\//,
  // Config/fixtures
  /fixtures?\//i,
  /seeds?\//i,
];

// Content patterns that make UUIDs acceptable
const ALLOWED_CONTENT_PATTERNS = [
  /\/\/ TEST/i,
  /\/\/ EXAMPLE/i,
  /\/\/ MOCK/i,
  /@example/,
  /process\.env\./,
  /getenv\(/,
];

function shouldSkipFile(filePath: string): boolean {
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(filePath));
}

function isAllowedContext(line: string): boolean {
  return ALLOWED_CONTENT_PATTERNS.some((pattern) => pattern.test(line));
}

function scanFile(filePath: string): Finding[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const findings: Finding[] = [];
  const relativePath = path.relative(process.cwd(), filePath);

  lines.forEach((line, index) => {
    // Skip comments and allowed contexts
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }

    if (isAllowedContext(line)) {
      return;
    }

    // Check for UUIDs
    const uuidMatches = line.match(UUID_PATTERN);
    if (uuidMatches) {
      // Filter out common false positives
      const realUuids = uuidMatches.filter((uuid) => {
        // Skip all-zero UUIDs (often used as defaults)
        if (uuid === '00000000-0000-0000-0000-000000000000') return false;
        // Skip type annotations
        if (line.includes(': string') && line.includes(uuid)) return false;
        return true;
      });

      realUuids.forEach(() => {
        findings.push({
          file: relativePath,
          line: index + 1,
          content: line.trim().substring(0, 100),
          type: 'uuid',
        });
      });
    }
  });

  return findings;
}

function findSourceFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);

      // Skip node_modules and .git
      if (item.name === 'node_modules' || item.name === '.git' || item.name === '.next') {
        continue;
      }

      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.name.endsWith('.ts') || item.name.endsWith('.tsx')) {
        if (!shouldSkipFile(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

export function checkHardcodedIds(): { findings: Finding[]; passed: boolean } {
  const srcDir = path.join(process.cwd(), 'src');

  if (!fs.existsSync(srcDir)) {
    console.error('Source directory not found:', srcDir);
    return { findings: [], passed: false };
  }

  const files = findSourceFiles(srcDir);
  const allFindings: Finding[] = [];

  files.forEach((file) => {
    const findings = scanFile(file);
    allFindings.push(...findings);
  });

  console.log('\n=== Hardcoded ID Check ===\n');
  console.log(`Files scanned: ${files.length}`);
  console.log(`Findings: ${allFindings.length}`);

  if (allFindings.length > 0) {
    console.log('\n--- FINDINGS ---');
    allFindings.forEach((f) => {
      console.log(`  [${f.type.toUpperCase()}] ${f.file}:${f.line}`);
      console.log(`    ${f.content}`);
    });
    console.log('\nNote: Some UUIDs may be intentional (constants, defaults).');
    console.log('Review each finding manually.');
  } else {
    console.log('No hardcoded IDs found.');
  }

  // This is a warning check, not a blocker
  return { findings: allFindings, passed: true };
}

// Run if executed directly
if (require.main === module) {
  const { passed } = checkHardcodedIds();
  process.exit(passed ? 0 : 1);
}
