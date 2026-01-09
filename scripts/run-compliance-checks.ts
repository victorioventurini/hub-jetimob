#!/usr/bin/env npx tsx
/**
 * Compliance Baseline Aggregator
 * 
 * Executes ALL mandatory audits defined in COMPLIANCE_BASELINE.md
 * Fails on first blocking error.
 * 
 * Usage:
 *   npx tsx scripts/run-compliance-checks.ts [--continue-on-error] [--verbose]
 * 
 * Options:
 *   --continue-on-error  Run all audits even if one fails (for CI reporting)
 *   --verbose            Show detailed output from each audit
 * 
 * Exit codes:
 *   0: All audits passed (or only warnings)
 *   1: At least one blocking audit failed
 * 
 * @version 1.0.0
 * @see docs/engineering/COMPLIANCE_BASELINE.md
 */

import { spawn } from 'child_process';
import * as path from 'path';

// ==========================
// CONFIGURATION
// ==========================

interface AuditConfig {
  id: string;
  name: string;
  script: string;
  severity: 'blocking' | 'warning';
  description: string;
}

const AUDITS: AuditConfig[] = [
  {
    id: 'bu-scope',
    name: 'BU Scope',
    script: 'audit-bu-scope.ts',
    severity: 'blocking',
    description: 'Validates bu_id handling in all operations',
  },
  {
    id: 'identity',
    name: 'Identity Convention',
    script: 'audit-identity-usage.ts',
    severity: 'blocking',
    description: 'Checks auth.uid() vs profile_id usage',
  },
  {
    id: 'user-directory',
    name: 'User Directory',
    script: 'audit-user-directory.ts',
    severity: 'blocking',
    description: 'Validates user listing includes profiles without login',
  },
  {
    id: 'rbac',
    name: 'RBAC V2',
    script: 'audit-rbac.ts',
    severity: 'blocking',
    description: 'Ensures V2-only permission system usage',
  },
  {
    id: 'supabase-client',
    name: 'Supabase Client',
    script: 'audit-supabase-client.ts',
    severity: 'blocking',
    description: 'Validates correct client usage per context',
  },
  {
    id: 'querykeys',
    name: 'Query Keys',
    script: 'audit-querykeys.ts',
    severity: 'blocking',
    description: 'Checks query keys are from queryKeys.ts',
  },
  {
    id: 'data-model-registry',
    name: 'Data Model Registry',
    script: 'audit-sql-against-registry.ts',
    severity: 'blocking',
    description: 'Validates references against DATA_MODEL_REGISTRY.json',
  },
  {
    id: 'docs-vs-tcr',
    name: 'Docs vs TCR',
    script: 'audit-docs-vs-tcr.ts',
    severity: 'blocking',
    description: 'Checks documentation consistency with TCR',
  },
  {
    id: 'overfetch',
    name: 'Overfetch',
    script: 'audit-overfetch.ts',
    severity: 'warning',
    description: 'Detects select("*") usage',
  },
  {
    id: 'url-state',
    name: 'URL State',
    script: 'audit-url-state.ts',
    severity: 'warning',
    description: 'Checks filter/pagination URL state usage',
  },
  {
    id: 'permission-keys',
    name: 'Permission Keys',
    script: 'audit-permission-keys.ts',
    severity: 'blocking',
    description: 'Validates permission key format and usage',
  },
  {
    id: 'prebu-buscoped',
    name: 'PRE-BU vs POST-BU',
    script: 'audit-prebu-buscoped.ts',
    severity: 'blocking',
    description: 'Validates client usage by lifecycle phase',
  },
  {
    id: 'shared-components',
    name: 'Shared Components',
    script: 'audit-shared-components.ts',
    severity: 'blocking',
    description: 'Detects duplicated component patterns',
  },
  {
    id: 'shared-utils',
    name: 'Shared Utilities',
    script: 'audit-shared-utils.ts',
    severity: 'blocking',
    description: 'Detects non-canonical utility usage',
  },
];

// ==========================
// TYPES
// ==========================

interface AuditResult {
  audit: AuditConfig;
  status: 'pass' | 'fail' | 'warn' | 'error';
  exitCode: number;
  output: string;
  duration: number;
}

// ==========================
// CLI ARGUMENTS
// ==========================

const args = process.argv.slice(2);
const continueOnError = args.includes('--continue-on-error');
const verbose = args.includes('--verbose');

// ==========================
// UTILITIES
// ==========================

function printHeader(): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    COMPLIANCE BASELINE CHECK                      ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
}

function printFooter(results: AuditResult[]): void {
  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail' || r.status === 'error').length;

  console.log('╠══════════════════════════════════════════════════════════════════╣');
  
  if (failed === 0) {
    console.log(`║ RESULT: ✅ COMPLIANT (${passed} passed, ${warnings} warnings, ${failed} failed)           ║`);
  } else {
    console.log(`║ RESULT: ❌ NON-COMPLIANT (${passed} passed, ${warnings} warnings, ${failed} failed)       ║`);
    console.log('║                                                                   ║');
    
    const failedAudits = results.filter(r => r.status === 'fail' || r.status === 'error');
    for (const result of failedAudits) {
      const cmd = `npx tsx scripts/${result.audit.script}`;
      console.log(`║ Run '${cmd}' for details`.padEnd(67) + '║');
    }
  }
  
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
}

function formatAuditLine(index: number, total: number, name: string, status: string, details: string): string {
  const prefix = `║ [${String(index).padStart(2)}/${total}] ${name}`;
  const dots = '.'.repeat(Math.max(1, 40 - name.length));
  const statusStr = `${status} ${details}`;
  const line = `${prefix}${dots} ${statusStr}`;
  return line.padEnd(67) + '║';
}

async function runAudit(audit: AuditConfig): Promise<AuditResult> {
  const startTime = Date.now();
  const scriptPath = path.join('scripts', audit.script);

  return new Promise((resolve) => {
    let output = '';
    
    const proc = spawn('npx', ['tsx', scriptPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      const exitCode = code ?? 1;

      let status: 'pass' | 'fail' | 'warn' | 'error';
      
      if (exitCode === 0) {
        // Check if output contains warnings
        const hasWarnings = /warning|warn|\bWARN\b/i.test(output);
        status = hasWarnings && audit.severity === 'warning' ? 'warn' : 'pass';
      } else {
        status = audit.severity === 'warning' ? 'warn' : 'fail';
      }

      resolve({
        audit,
        status,
        exitCode,
        output,
        duration,
      });
    });

    proc.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({
        audit,
        status: 'error',
        exitCode: 1,
        output: err.message,
        duration,
      });
    });
  });
}

function extractFindingCount(output: string): string {
  // Try to extract finding count from various formats
  const patterns = [
    /(\d+)\s*(?:critical|blocking)\s*(?:finding|violation|error)/i,
    /(\d+)\s*(?:finding|violation|error)s?/i,
    /found\s*(\d+)/i,
    /total[:\s]+(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) {
      return `(${match[1]} findings)`;
    }
  }

  return '';
}

// ==========================
// MAIN
// ==========================

async function main(): Promise<void> {
  printHeader();

  const results: AuditResult[] = [];
  let hasBlockingFailure = false;

  for (let i = 0; i < AUDITS.length; i++) {
    const audit = AUDITS[i];
    
    // Run the audit
    const result = await runAudit(audit);
    results.push(result);

    // Determine status display
    let statusIcon: string;
    let details: string;

    switch (result.status) {
      case 'pass':
        statusIcon = '✅ PASS';
        details = extractFindingCount(result.output) || '(0 findings)';
        break;
      case 'warn':
        statusIcon = '⚠️  WARN';
        details = extractFindingCount(result.output) || '(warnings)';
        break;
      case 'fail':
        statusIcon = '❌ FAIL';
        details = extractFindingCount(result.output) || '(failures)';
        hasBlockingFailure = true;
        break;
      case 'error':
        statusIcon = '❌ ERROR';
        details = '(script error)';
        hasBlockingFailure = true;
        break;
    }

    console.log(formatAuditLine(i + 1, AUDITS.length, audit.name, statusIcon, details));

    // Show verbose output if requested
    if (verbose && result.output.trim()) {
      console.log('║' + '─'.repeat(66) + '║');
      const lines = result.output.split('\n').slice(0, 10);
      for (const line of lines) {
        console.log('║   ' + line.substring(0, 62).padEnd(62) + '║');
      }
      if (result.output.split('\n').length > 10) {
        console.log('║   ... (truncated)'.padEnd(66) + '║');
      }
      console.log('║' + '─'.repeat(66) + '║');
    }

    // Stop on first blocking failure unless --continue-on-error
    if (hasBlockingFailure && !continueOnError) {
      break;
    }
  }

  printFooter(results);

  // Exit with appropriate code
  process.exit(hasBlockingFailure ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
