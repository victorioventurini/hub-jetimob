/**
 * Audit Script: User Directory Global
 * 
 * Detecta violações do padrão User Directory Global:
 * - SQL: INNER JOIN bu_user_memberships para listar pessoas
 * - Frontend: queries usando bu_user_memberships como filtro de pessoas
 * - Hooks que não usam v_bu_active_profiles
 * 
 * Uso: npx tsx scripts/audit-user-directory.ts
 * 
 * Referência: TCR v2.11.0 - User Directory Global
 */

import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  file: string;
  line: number;
  pattern: string;
  severity: 'error' | 'warning';
  message: string;
  recommendation: string;
}

const findings: Finding[] = [];

// Directories to scan
const SCAN_DIRS = [
  'src/hooks',
  'src/components',
  'src/modules',
  'supabase/migrations',
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.sql'];

// Patterns that indicate violations
const VIOLATION_PATTERNS = [
  {
    // INNER JOIN on memberships for user listing
    pattern: /FROM\s+(?:public\.)?profiles\s+(?:\w+\s+)?(?:INNER\s+)?JOIN\s+(?:public\.)?bu_user_memberships/gi,
    severity: 'error' as const,
    message: 'INNER JOIN on bu_user_memberships excludes users without first login',
    recommendation: 'Use v_bu_active_profiles view instead',
  },
  {
    // Direct query on profiles with employment_status filter in user lists
    pattern: /\.from\s*\(\s*["']profiles["']\s*\)[\s\S]{0,500}\.(?:eq|neq)\s*\(\s*["']employment_status["']/gi,
    severity: 'warning' as const,
    message: 'Direct query on profiles table with employment_status filter',
    recommendation: 'Use v_bu_active_profiles view via useBuUsersDirectory hook',
  },
  {
    // Query on bu_user_memberships for user listing (not auth validation)
    pattern: /\.from\s*\(\s*["']bu_user_memberships["']\s*\)[\s\S]{0,200}\.select\s*\(/gi,
    severity: 'warning' as const,
    message: 'Query on bu_user_memberships may exclude users without membership',
    recommendation: 'Only use memberships for auth validation, not user listing. Use v_bu_active_profiles for directory.',
  },
];

// Allowed patterns (exceptions)
const ALLOWED_PATTERNS = [
  // Using the canonical view
  /v_bu_active_profiles/,
  // Using the canonical hook
  /useBuUsersDirectory/,
  // Auth validation context (checking if user has access)
  /role_in_bu|has_permission|can_access/i,
  // Migrations that create/update the view itself
  /CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?v_bu_active_profiles/i,
  // RLS policies
  /CREATE\s+POLICY/i,
  // Security definer functions
  /SECURITY\s+DEFINER/i,
];

// Files to skip
const SKIP_FILES = [
  'audit-user-directory.ts', // This script
  'useBuUsersDirectory.ts', // The canonical hook itself
  'useBuAdmins.ts', // Special case: fetching admins requires membership check
  'useAuthorizers.ts', // Special case: fetching authorizers requires role check
];

function scanFile(filePath: string): void {
  const fileName = path.basename(filePath);
  
  // Skip if in skip list
  if (SKIP_FILES.some(skip => fileName.includes(skip))) {
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Check if file uses allowed patterns (canonical approach)
  const usesCanonical = ALLOWED_PATTERNS.some(pattern => pattern.test(content));
  
  for (const violation of VIOLATION_PATTERNS) {
    const matches = content.matchAll(violation.pattern);
    
    for (const match of matches) {
      // Get line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      
      // Check if this specific line/context uses allowed patterns
      const contextStart = Math.max(0, match.index! - 200);
      const contextEnd = Math.min(content.length, match.index! + match[0].length + 200);
      const context = content.substring(contextStart, contextEnd);
      
      const contextIsAllowed = ALLOWED_PATTERNS.some(pattern => pattern.test(context));
      
      if (!contextIsAllowed) {
        findings.push({
          file: filePath,
          line: lineNumber,
          pattern: match[0].substring(0, 80) + (match[0].length > 80 ? '...' : ''),
          severity: violation.severity,
          message: violation.message,
          recommendation: violation.recommendation,
        });
      }
    }
  }
}

function scanDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and similar
      if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SCAN_EXTENSIONS.includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

function printReport(): void {
  console.log('\n========================================');
  console.log('  USER DIRECTORY GLOBAL AUDIT REPORT');
  console.log('========================================\n');
  
  if (findings.length === 0) {
    console.log('✅ No violations found!\n');
    console.log('All user directory queries follow the canonical pattern:');
    console.log('  - Using v_bu_active_profiles view');
    console.log('  - Using useBuUsersDirectory hook');
    console.log('  - Memberships used only for auth validation\n');
    process.exit(0);
  }
  
  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warning');
  
  console.log(`Found ${findings.length} potential violations:\n`);
  console.log(`  🔴 Errors: ${errors.length}`);
  console.log(`  🟡 Warnings: ${warnings.length}\n`);
  
  if (errors.length > 0) {
    console.log('─── ERRORS ───────────────────────────\n');
    for (const finding of errors) {
      console.log(`🔴 ${finding.file}:${finding.line}`);
      console.log(`   Pattern: ${finding.pattern}`);
      console.log(`   Issue: ${finding.message}`);
      console.log(`   Fix: ${finding.recommendation}\n`);
    }
  }
  
  if (warnings.length > 0) {
    console.log('─── WARNINGS ─────────────────────────\n');
    for (const finding of warnings) {
      console.log(`🟡 ${finding.file}:${finding.line}`);
      console.log(`   Pattern: ${finding.pattern}`);
      console.log(`   Issue: ${finding.message}`);
      console.log(`   Fix: ${finding.recommendation}\n`);
    }
  }
  
  console.log('─── RECOMMENDATIONS ──────────────────\n');
  console.log('1. Replace direct profiles queries with v_bu_active_profiles view');
  console.log('2. Use useBuUsersDirectory hook for frontend user lists');
  console.log('3. Use BuUserSelect/BuUserMultiSelect components');
  console.log('4. Only use bu_user_memberships for auth validation\n');
  
  console.log('─── DOCUMENTATION ────────────────────\n');
  console.log('- TCR v2.11.0: User Directory Global section');
  console.log('- docs/USER_DIRECTORY_GLOBAL_V2_REPORT.md');
  console.log('- docs/qa/QA_USER_DIRECTORY_GLOBAL_v2.md\n');
  
  // Exit with error code if there are errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

// Main execution
console.log('Scanning for User Directory violations...\n');

for (const dir of SCAN_DIRS) {
  console.log(`  Scanning ${dir}...`);
  scanDirectory(dir);
}

printReport();
