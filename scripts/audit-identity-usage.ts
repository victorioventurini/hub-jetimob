#!/usr/bin/env tsx
/**
 * Identity Convention Audit Script
 * 
 * Scans SQL and TypeScript files for violations of the identity convention:
 * - Direct comparisons of auth.uid() with domain columns (profiles.id)
 * - Frontend code using user.id where profileId should be used
 * 
 * @see docs/IDENTITY_CONVENTION.md
 * 
 * Usage: npm run audit:identity
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface Violation {
  file: string;
  line: number;
  type: 'sql' | 'frontend';
  pattern: string;
  content: string;
  recommendation: string;
}

// Domain columns that store profiles.id (NOT auth.users.id)
const DOMAIN_COLUMNS = [
  'owner_user_id',
  'leader_user_id',
  'created_by_user_id',
  'current_user_id',
  'assigned_user_id',
  'cancelled_by',
  'from_user_id',
  'to_user_id',
  'performed_by_user_id',
  'authorized_by_user_id',
  'mentioned_user_id',
  'author_user_id',
];

// Patterns that indicate correct usage (these convert auth.uid() to profile_id)
const SAFE_PATTERNS = [
  'my_profile_id()',
  'is_team_leader(',
  'user_can_manage_team(',
  'profile_id_from_user_id(',
  'get_profile_id(',
  'current_profile_id()',
];

// SQL violations: auth.uid() compared with domain columns
const SQL_VIOLATION_PATTERNS = DOMAIN_COLUMNS.map(col => ({
  pattern: new RegExp(`${col}\\s*=\\s*auth\\.uid\\(\\)`, 'gi'),
  column: col,
}));

// Frontend violations: user.id used for domain columns
const FRONTEND_VIOLATION_PATTERNS = [
  { pattern: /owner_user_id:\s*user\.id/gi, field: 'owner_user_id' },
  { pattern: /owner_user_id:\s*user\?\.\s*id/gi, field: 'owner_user_id' },
  { pattern: /leader_user_id:\s*user\.id/gi, field: 'leader_user_id' },
  { pattern: /leader_user_id:\s*user\?\.\s*id/gi, field: 'leader_user_id' },
  { pattern: /created_by_user_id:\s*user\.id/gi, field: 'created_by_user_id' },
  { pattern: /created_by_user_id:\s*user\?\.\s*id/gi, field: 'created_by_user_id' },
  { pattern: /current_user_id:\s*user\.id/gi, field: 'current_user_id' },
  { pattern: /current_user_id:\s*user\?\.\s*id/gi, field: 'current_user_id' },
  { pattern: /authorized_by_user_id:\s*user\.id/gi, field: 'authorized_by_user_id' },
  { pattern: /authorized_by_user_id:\s*user\?\.\s*id/gi, field: 'authorized_by_user_id' },
  { pattern: /cancelled_by:\s*user\.id/gi, field: 'cancelled_by' },
  { pattern: /cancelled_by:\s*user\?\.\s*id/gi, field: 'cancelled_by' },
];

// Directories to scan
const SCAN_DIRS = {
  sql: ['supabase/migrations', 'supabase/functions'],
  frontend: ['src/modules', 'src/components', 'src/hooks', 'src/pages'],
};

// Extensions to check
const SQL_EXTENSIONS = ['.sql'];
const FRONTEND_EXTENSIONS = ['.ts', '.tsx'];

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath, extensions));
      } else if (extensions.includes(extname(item))) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist, skip
  }
  
  return files;
}

function checkSqlFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Skip if line contains safe patterns (conversion functions)
    if (SAFE_PATTERNS.some(p => line.includes(p))) {
      return;
    }
    
    // Check for violations
    for (const { pattern, column } of SQL_VIOLATION_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: index + 1,
          type: 'sql',
          pattern: `${column} = auth.uid()`,
          content: line.trim(),
          recommendation: `Use: ${column} = my_profile_id()`,
        });
      }
    }
  });
  
  return violations;
}

function checkFrontendFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Skip if line uses profileId (correct pattern)
    if (line.includes('profileId') || line.includes('profile_id')) {
      return;
    }
    
    for (const { pattern, field } of FRONTEND_VIOLATION_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: index + 1,
          type: 'frontend',
          pattern: `${field}: user.id`,
          content: line.trim(),
          recommendation: `Use useIdentity() hook and pass profileId instead of user.id`,
        });
      }
    }
  });
  
  return violations;
}

function main() {
  console.log('🔍 Identity Convention Audit');
  console.log('============================\n');
  console.log('Scanning for auth.uid() vs profiles.id violations...\n');
  
  const allViolations: Violation[] = [];
  
  // Scan SQL files
  console.log('📁 Scanning SQL files...');
  for (const dir of SCAN_DIRS.sql) {
    const files = getAllFiles(dir, SQL_EXTENSIONS);
    for (const file of files) {
      const violations = checkSqlFile(file);
      allViolations.push(...violations);
    }
  }
  
  // Scan frontend files
  console.log('📁 Scanning frontend files...\n');
  for (const dir of SCAN_DIRS.frontend) {
    const files = getAllFiles(dir, FRONTEND_EXTENSIONS);
    for (const file of files) {
      const violations = checkFrontendFile(file);
      allViolations.push(...violations);
    }
  }
  
  // Report results
  if (allViolations.length === 0) {
    console.log('✅ PASS: No identity convention violations found!\n');
    console.log('All comparisons correctly use:');
    console.log('  - my_profile_id() for domain column comparisons');
    console.log('  - profileId (from useIdentity()) in frontend\n');
    process.exit(0);
  } else {
    console.log(`❌ FAIL: Found ${allViolations.length} violation(s)\n`);
    
    // Group by type
    const sqlViolations = allViolations.filter(v => v.type === 'sql');
    const frontendViolations = allViolations.filter(v => v.type === 'frontend');
    
    if (sqlViolations.length > 0) {
      console.log(`\n📄 SQL Violations (${sqlViolations.length}):`);
      console.log('─'.repeat(60));
      for (const v of sqlViolations) {
        console.log(`\n  File: ${v.file}:${v.line}`);
        console.log(`  Pattern: ${v.pattern}`);
        console.log(`  Content: ${v.content.substring(0, 80)}${v.content.length > 80 ? '...' : ''}`);
        console.log(`  → ${v.recommendation}`);
      }
    }
    
    if (frontendViolations.length > 0) {
      console.log(`\n💻 Frontend Violations (${frontendViolations.length}):`);
      console.log('─'.repeat(60));
      for (const v of frontendViolations) {
        console.log(`\n  File: ${v.file}:${v.line}`);
        console.log(`  Pattern: ${v.pattern}`);
        console.log(`  Content: ${v.content.substring(0, 80)}${v.content.length > 80 ? '...' : ''}`);
        console.log(`  → ${v.recommendation}`);
      }
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log('\n📚 Reference: docs/IDENTITY_CONVENTION.md');
    console.log('   Rule: Never compare auth.uid() directly with domain columns.\n');
    
    process.exit(1);
  }
}

main();
