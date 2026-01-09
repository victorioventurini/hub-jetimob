#!/usr/bin/env npx ts-node
/**
 * Audit Script: Auth User ID vs Profile ID in Notifications
 * 
 * This script scans the codebase for patterns that might indicate
 * incorrect usage of profile.id where auth.users.id is expected
 * (especially in notifications context).
 * 
 * Usage: npx ts-node scripts/audit-auth-vs-profile-id.ts
 * 
 * Exit codes:
 * - 0: No issues found
 * - 1: Critical issues found
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

// Patterns to detect
const PATTERNS = [
  {
    // Direct insert to notifications with profile.id
    regex: /\.from\(['"]notifications['"]\)[\s\S]*?\.insert\([\s\S]*?user_id:\s*(\w+)\.id(?!entifier)/g,
    severity: 'CRITICAL' as const,
    description: 'Inserting to notifications with .id (likely profile.id instead of user_id)',
  },
  {
    // RPC call with profile.id where auth user expected (old pattern)
    regex: /send_test_notification['"][\s\S]*?p_target_user_id:\s*(\w+)\.id/g,
    severity: 'CRITICAL' as const,
    description: 'Calling old RPC send_test_notification with .id (use v2 with profile_id)',
  },
  {
    // targetUserId receiving profile.id
    regex: /targetUserId:\s*(\w+)\.id(?!entifier)/g,
    severity: 'CRITICAL' as const,
    description: 'targetUserId receiving .id (should use targetProfileId or user_id)',
  },
  {
    // notification_outbox insert with profile.id
    regex: /\.from\(['"]notification_outbox['"]\)[\s\S]*?\.insert\([\s\S]*?user_id:\s*(\w+)\.id(?!entifier)/g,
    severity: 'CRITICAL' as const,
    description: 'Inserting to notification_outbox with .id (likely profile.id)',
  },
  {
    // Using old RPC name
    regex: /rpc\(['"]send_test_notification['"]\s*,/g,
    severity: 'WARNING' as const,
    description: 'Using deprecated send_test_notification RPC (use v2)',
  },
  {
    // Selecting user for notification without checking user_id
    regex: /profiles\.map\(.*?value={.*?\.id}/g,
    severity: 'INFO' as const,
    description: 'Select using profile.id - verify v2 RPC is used',
  },
];

// Files/directories to scan
const SCAN_PATHS = [
  'src/pages',
  'src/hooks',
  'src/components',
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.d\.ts$/,
  /\.test\./,
  /\.spec\./,
];

function shouldExclude(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function scanFile(filePath: string): void {
  if (shouldExclude(filePath)) return;
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const patternDef of PATTERNS) {
    const regex = new RegExp(patternDef.regex.source, patternDef.regex.flags);
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      // Find line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      
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
  console.log('🔍 Auditing for Auth User ID vs Profile ID issues...\n');
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
  console.log('  - UI should use ProfileId (profiles.id)');
  console.log('  - RPCs should accept profile_id and resolve auth_user_id internally');
  console.log('  - notifications.user_id stores auth.users.id (NOT profiles.id)');
  console.log('  - Use send_test_notification_v2 (accepts profile_id)');
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
