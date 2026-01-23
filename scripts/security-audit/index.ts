#!/usr/bin/env tsx
/**
 * Security Audit Orchestrator
 *
 * Runs all security audit checks and reports results.
 */

import { checkAuthPatterns } from './check-auth-patterns';
import { checkHardcodedIds } from './check-hardcoded-ids';
import { checkRLSMigrations } from './check-rls-migrations';

interface AuditResult {
  name: string;
  passed: boolean;
  details?: string;
}

async function runSecurityAudit(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║       PROJEKT L - SECURITY AUDIT           ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\nStarted at: ${new Date().toISOString()}\n`);

  const results: AuditResult[] = [];

  // Run auth patterns check
  try {
    const authResult = checkAuthPatterns();
    results.push({
      name: 'Auth Patterns',
      passed: authResult.passed,
    });
  } catch (error) {
    results.push({
      name: 'Auth Patterns',
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Run hardcoded IDs check
  try {
    const idsResult = checkHardcodedIds();
    results.push({
      name: 'Hardcoded IDs',
      passed: idsResult.passed,
      details: `${idsResult.findings.length} findings (review recommended)`,
    });
  } catch (error) {
    results.push({
      name: 'Hardcoded IDs',
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Run RLS migrations check
  try {
    const rlsResult = checkRLSMigrations();
    results.push({
      name: 'RLS Migrations',
      passed: rlsResult.passed,
    });
  } catch (error) {
    results.push({
      name: 'RLS Migrations',
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║            AUDIT SUMMARY                   ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;

  results.forEach((r) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${r.name}`);
    if (r.details) {
      console.log(`          ${r.details}`);
    }
  });

  console.log('');
  console.log(`Result: ${passedCount}/${results.length} checks passed`);
  console.log(`Finished at: ${new Date().toISOString()}`);

  if (!allPassed) {
    console.log('\n⚠️  Security audit failed. Please fix the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ Security audit passed.');
    process.exit(0);
  }
}

runSecurityAudit().catch((error) => {
  console.error('Security audit failed with error:', error);
  process.exit(1);
});
