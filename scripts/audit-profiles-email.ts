#!/usr/bin/env npx ts-node
/**
 * Audit Script: Detect invalid profiles.email usage
 * 
 * The profiles table does NOT have an 'email' field.
 * The correct field is 'work_email'.
 * 
 * This script scans the codebase for patterns that might indicate
 * incorrect usage of profiles.email (which does not exist).
 * 
 * Usage: npx tsx scripts/audit-profiles-email.ts
 * 
 * Exit codes:
 * - 0: No issues found
 * - 1: Critical issues found (profiles.email usage detected)
 */

import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  file: string;
  line: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  pattern: string;
  snippet: string;
}

const findings: Finding[] = [];

// Patterns to detect - profiles.email is ALWAYS wrong
const PATTERNS = [
  {
    // Direct property access: profiles.email or profile.email
    regex: /profiles?\.email(?!_|[a-zA-Z])/g,
    severity: 'CRITICAL' as const,
    description: 'Using profiles.email (field does not exist, use work_email)',
  },
  {
    // SQL select with email from profiles
    regex: /\.select\([^)]*['"]email['"][^)]*\)[\s\S]*?\.from\(['"]profiles['"]\)/g,
    severity: 'CRITICAL' as const,
    description: 'Selecting email from profiles (use work_email)',
  },
  {
    // SQL select profiles with email field
    regex: /\.from\(['"]profiles['"]\)[\s\S]*?\.select\([^)]*['"]email['"][^)]*\)/g,
    severity: 'CRITICAL' as const,
    description: 'Selecting email from profiles (use work_email)',
  },
  {
    // SQL query string with profiles.email
    regex: /SELECT[\s\S]*?profiles\.email/gi,
    severity: 'CRITICAL' as const,
    description: 'SQL query using profiles.email (use profiles.work_email)',
  },
  {
    // TypeScript interface with email in profile context
    regex: /interface\s+\w*[Pp]rofile[\s\S]*?\bemail\s*:/g,
    severity: 'WARNING' as const,
    description: 'Interface with email field - verify it uses work_email from DB',
  },
];

// Files/directories to scan
const SCAN_PATHS = [
  'src/pages',
  'src/hooks',
  'src/components',
  'src/modules',
  'supabase/functions',
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.d\.ts$/,
  /\.test\./,
  /\.spec\./,
  /audit-profiles-email\.ts$/, // Don't audit self
];

// Allowed patterns (false positives)
const ALLOWED_PATTERNS = [
  /work_email/, // Correct field
  /auth\.users\.email/, // Auth email is fine
  /email_confirmed/, // Different field
  /email_change/, // Different field
  /email_template/, // Template name
  /emailRedirectTo/, // Redirect config
  /validateEmail/, // Validation function
  /isValidEmail/, // Validation function
];

function shouldExclude(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function isAllowedContext(line: string): boolean {
  return ALLOWED_PATTERNS.some(pattern => pattern.test(line));
}

function scanFile(filePath: string): void {
  if (shouldExclude(filePath)) return;
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.sql')) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const patternDef of PATTERNS) {
    const regex = new RegExp(patternDef.regex.source, patternDef.regex.flags);
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      // Find line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      
      // Get the line content
      const lineContent = lines[lineNumber - 1] || '';
      
      // Skip if it's an allowed pattern (false positive)
      if (isAllowedContext(lineContent)) {
        continue;
      }
      
      // Get snippet (the matched line and context)
      const snippetStart = Math.max(0, lineNumber - 2);
      const snippetEnd = Math.min(lines.length, lineNumber + 1);
      const snippet = lines.slice(snippetStart, snippetEnd).join('\n').trim();
      
      findings.push({
        file: filePath,
        line: lineNumber,
        severity: patternDef.severity,
        pattern: patternDef.description,
        snippet: snippet.substring(0, 200),
      });
    }
  }
}

function scanDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) return;
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

function main(): void {
  console.log('🔍 Auditing for invalid profiles.email usage...\n');
  console.log('='.repeat(60));
  
  // Scan all configured paths
  for (const scanPath of SCAN_PATHS) {
    console.log(`\nScanning: ${scanPath}`);
    scanDirectory(scanPath);
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Group findings by severity
  const critical = findings.filter(f => f.severity === 'CRITICAL');
  const warnings = findings.filter(f => f.severity === 'WARNING');
  const info = findings.filter(f => f.severity === 'INFO');
  
  // Print findings
  if (critical.length > 0) {
    console.log('\n❌ CRITICAL ISSUES:\n');
    for (const finding of critical) {
      console.log(`  File: ${finding.file}:${finding.line}`);
      console.log(`  Issue: ${finding.pattern}`);
      console.log(`  Snippet: ${finding.snippet}`);
      console.log();
    }
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:\n');
    for (const finding of warnings) {
      console.log(`  File: ${finding.file}:${finding.line}`);
      console.log(`  Issue: ${finding.pattern}`);
      console.log();
    }
  }
  
  if (info.length > 0) {
    console.log('\n📋 INFO (review manually):\n');
    for (const finding of info) {
      console.log(`  File: ${finding.file}:${finding.line}`);
      console.log(`  Note: ${finding.pattern}`);
      console.log();
    }
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('\n📊 SUMMARY:\n');
  console.log(`  Critical: ${critical.length}`);
  console.log(`  Warnings: ${warnings.length}`);
  console.log(`  Info:     ${info.length}`);
  console.log();
  
  // Canonical rules reminder
  console.log('📖 CANONICAL RULES:\n');
  console.log('  - profiles.email DOES NOT EXIST - NEVER use it');
  console.log('  - Use profiles.work_email for user email');
  console.log('  - Use resolve_work_email() RPC for canonical resolution');
  console.log('  - Fallback: auth.users.email (resolved by RPC)');
  console.log();
  
  // Exit code
  if (critical.length > 0) {
    console.log('❌ AUDIT FAILED: Critical issues found\n');
    process.exit(1);
  } else {
    console.log('✅ AUDIT PASSED: No critical issues\n');
    process.exit(0);
  }
}

main();
