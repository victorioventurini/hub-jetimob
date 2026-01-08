#!/usr/bin/env tsx
/**
 * Profile Lookup Audit Script
 * 
 * Scans TypeScript/TSX files for incorrect profile lookups:
 * - Queries using .in('user_id', profileIds) when should use .in('id', profileIds)
 * - Queries using profiles.user_id to resolve domain columns that store profiles.id
 * 
 * Domain columns that store profiles.id (NOT auth.users.id):
 * - owner_user_id, leader_user_id, current_user_id, assigned_user_id
 * - from_user_id, to_user_id, performed_by_user_id, authorized_by_user_id
 * - created_by_user_id, mentioned_user_id, author_user_id, cancelled_by
 * 
 * @see docs/IDENTITY_CONVENTION.md
 * 
 * Usage: npm run audit:profile-lookup
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

interface Finding {
  file: string;
  line: number;
  content: string;
  pattern: string;
  severity: 'error' | 'warning';
  recommendation: string;
}

// Domain columns that store profiles.id
const DOMAIN_PROFILE_COLUMNS = [
  'owner_user_id',
  'leader_user_id',
  'current_user_id',
  'assigned_user_id',
  'cancelled_by',
  'from_user_id',
  'to_user_id',
  'performed_by_user_id',
  'authorized_by_user_id',
  'mentioned_user_id',
  'author_user_id',
  'created_by_user_id',
  'created_by',
  'updated_by',
];

// Patterns that indicate INCORRECT usage
const ERROR_PATTERNS = [
  // Using .in('user_id', ...) to resolve domain columns
  {
    pattern: /\.in\s*\(\s*['"]user_id['"]\s*,\s*(\w+Ids?|profileIds?)\s*\)/gi,
    description: "Lookup by user_id when resolving domain column IDs",
    recommendation: "Use .in('id', profileIds) - domain columns store profiles.id",
  },
  // Selecting user_id and mapping by it when resolving profiles
  {
    pattern: /\.select\s*\([^)]*['"]user_id['"][^)]*\)[\s\S]{0,200}\.in\s*\(\s*['"]user_id['"]/gi,
    description: "Select user_id and filter by user_id for profile resolution",
    recommendation: "Use .select('id, ...').in('id', profileIds)",
  },
  // Creating map with user_id as key when it should be id
  {
    pattern: /new Map\s*\([^)]*\.map\s*\(\s*\w+\s*=>\s*\[\s*\w+\.user_id/gi,
    description: "Map keyed by user_id when resolving domain columns",
    recommendation: "Use p.id as map key since domain columns store profiles.id",
  },
  // profileMap using user_id
  {
    pattern: /profileMap\.get\s*\(\s*\w+\.(current_user_id|from_user_id|to_user_id|performed_by_user_id|authorized_by_user_id|owner_user_id)/gi,
    description: "Getting from profileMap using domain column that stores profiles.id",
    recommendation: "Ensure profileMap is keyed by profiles.id, not profiles.user_id",
  },
];

// Patterns that indicate correct usage (skip these lines)
const SAFE_PATTERNS = [
  // Correct pattern: lookup by id
  /\.in\s*\(\s*['"]id['"]\s*,\s*profileIds\)/i,
  // Converting auth user to profile
  /\.eq\s*\(\s*['"]user_id['"]\s*,\s*(auth\.uid|userId|user\.id|user\?\.id)/i,
  // bu_user_memberships correctly uses auth user_id
  /bu_user_memberships/i,
  // user_roles uses auth user_id
  /user_roles/i,
];

// Directories to scan
const SCAN_DIRS = [
  'src/modules',
  'src/hooks',
  'src/components',
  'src/pages',
  'supabase/functions',
];

const EXTENSIONS = ['.ts', '.tsx'];

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else if (EXTENSIONS.includes(extname(item))) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist, skip
  }
  
  return files;
}

function checkFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Skip if line matches safe patterns
    if (SAFE_PATTERNS.some(p => p.test(line))) {
      return;
    }
    
    // Check for error patterns
    for (const { pattern, description, recommendation } of ERROR_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        findings.push({
          file: filePath,
          line: index + 1,
          content: line.trim().substring(0, 100),
          pattern: description,
          severity: 'error',
          recommendation,
        });
      }
    }
  });
  
  // Also check for multi-line patterns (context-aware)
  const contextPatterns = [
    {
      // Variable named userIds used with profiles lookup
      setup: /const\s+userIds\s*=.*current_user_id|from_user_id|to_user_id|performed_by_user_id/,
      violation: /profiles.*\.in\s*\(\s*['"]user_id['"].*userIds/,
      description: "userIds derived from domain columns but used with .in('user_id')",
      recommendation: "Rename to profileIds and use .in('id', profileIds)",
    },
  ];
  
  for (const { setup, violation, description, recommendation } of contextPatterns) {
    if (setup.test(content) && violation.test(content)) {
      // Find approximate line
      const match = content.match(violation);
      if (match) {
        const lineIndex = content.substring(0, match.index).split('\n').length;
        findings.push({
          file: filePath,
          line: lineIndex,
          content: match[0].substring(0, 80),
          pattern: description,
          severity: 'error',
          recommendation,
        });
      }
    }
  }
  
  return findings;
}

function main() {
  console.log('🔍 Profile Lookup Audit');
  console.log('========================\n');
  console.log('Scanning for incorrect profile.user_id vs profile.id lookups...\n');
  
  const allFindings: Finding[] = [];
  let filesScanned = 0;
  
  for (const dir of SCAN_DIRS) {
    const files = getAllFiles(dir);
    filesScanned += files.length;
    
    for (const file of files) {
      const findings = checkFile(file);
      allFindings.push(...findings);
    }
  }
  
  console.log(`📁 Scanned ${filesScanned} files\n`);
  
  // Generate report
  const timestamp = new Date().toISOString();
  const reportLines = [
    '# Profile Lookup Audit Report',
    `Generated: ${timestamp}`,
    '',
    '## Summary',
    `- Files scanned: ${filesScanned}`,
    `- Issues found: ${allFindings.length}`,
    '',
  ];
  
  if (allFindings.length === 0) {
    console.log('✅ PASS: No profile lookup violations found!\n');
    console.log('All profile lookups correctly use:');
    console.log('  - profiles.id for domain column resolution');
    console.log('  - profiles.user_id only for auth user conversion\n');
    
    reportLines.push('## Result: ✅ PASS');
    reportLines.push('No violations found.');
  } else {
    console.log(`❌ FAIL: Found ${allFindings.length} issue(s)\n`);
    
    reportLines.push('## Result: ❌ FAIL');
    reportLines.push('');
    reportLines.push('## Issues Found');
    reportLines.push('');
    
    // Group by file
    const byFile = new Map<string, Finding[]>();
    for (const finding of allFindings) {
      const existing = byFile.get(finding.file) || [];
      existing.push(finding);
      byFile.set(finding.file, existing);
    }
    
    for (const [file, findings] of byFile) {
      console.log(`\n📄 ${file}`);
      console.log('─'.repeat(60));
      reportLines.push(`### ${file}`);
      reportLines.push('');
      
      for (const f of findings) {
        console.log(`  Line ${f.line}: ${f.pattern}`);
        console.log(`    Content: ${f.content}${f.content.length >= 100 ? '...' : ''}`);
        console.log(`    → ${f.recommendation}\n`);
        
        reportLines.push(`- **Line ${f.line}**: ${f.pattern}`);
        reportLines.push(`  - Content: \`${f.content}\``);
        reportLines.push(`  - Recommendation: ${f.recommendation}`);
        reportLines.push('');
      }
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log('\n📚 Reference: docs/IDENTITY_CONVENTION.md');
    console.log('   Rule: Domain columns (current_user_id, owner_user_id, etc.)');
    console.log('         store profiles.id, NOT profiles.user_id\n');
  }
  
  // Add convention reference to report
  reportLines.push('');
  reportLines.push('## Convention Reference');
  reportLines.push('');
  reportLines.push('Domain columns that store `profiles.id`:');
  reportLines.push('');
  for (const col of DOMAIN_PROFILE_COLUMNS) {
    reportLines.push(`- \`${col}\``);
  }
  reportLines.push('');
  reportLines.push('Columns that store `auth.users.id`:');
  reportLines.push('- `profiles.user_id`');
  reportLines.push('- `bu_user_memberships.user_id`');
  reportLines.push('- `user_roles.user_id`');
  reportLines.push('');
  reportLines.push('See: [docs/IDENTITY_CONVENTION.md](../docs/IDENTITY_CONVENTION.md)');
  
  // Write report
  try {
    writeFileSync('docs/perf/PROFILE_LOOKUP_AUDIT.md', reportLines.join('\n'));
    console.log('📝 Report saved to: docs/perf/PROFILE_LOOKUP_AUDIT.md\n');
  } catch {
    console.log('⚠️ Could not save report file\n');
  }
  
  process.exit(allFindings.length > 0 ? 1 : 0);
}

main();
