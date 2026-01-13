/**
 * Database Column Reference Auditor
 * 
 * This script detects references to database columns in the codebase
 * that may not exist in the actual database schema.
 * 
 * Usage:
 *   npx ts-node scripts/audit-db-column-references.ts
 * 
 * What it does:
 * 1. Fetches actual column names from database via information_schema
 * 2. Scans source code for column references in Supabase queries
 * 3. Compares and reports potential mismatches
 * 
 * @see docs/engineering/DEVELOPMENT_STANDARDS.md
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURATION
// ============================================

const SRC_DIRS = ['src', 'supabase/functions'];
const FILE_EXTENSIONS = ['.ts', '.tsx'];
const IGNORE_DIRS = ['node_modules', 'dist', '.git', 'coverage'];

// Tables to audit (add more as needed)
const TABLES_TO_AUDIT = [
  'tickets',
  'ticket_messages',
  'ticket_participants',
  'ticket_categories',
  'ticket_subcategories',
  'profiles',
  'teams',
  'squads',
  'okr_objectives',
  'okr_key_results',
  'okr_checkins',
  'kpi_metrics',
  'kpi_entries',
  'asset_inventory',
  'asset_movements',
  'partner_companies',
  'partner_contacts',
];

// Known column patterns to detect in code
const COLUMN_REFERENCE_PATTERNS = [
  // Supabase JS patterns
  /\.select\(\s*['"`]([^'"`]+)['"`]/g,
  /\.eq\(\s*['"`]([^'"`]+)['"`]/g,
  /\.neq\(\s*['"`]([^'"`]+)['"`]/g,
  /\.in\(\s*['"`]([^'"`]+)['"`]/g,
  /\.order\(\s*['"`]([^'"`]+)['"`]/g,
  /\.is\(\s*['"`]([^'"`]+)['"`]/g,
  /\.ilike\(\s*['"`]([^'"`]+)['"`]/g,
  /\.like\(\s*['"`]([^'"`]+)['"`]/g,
  /\.gte\(\s*['"`]([^'"`]+)['"`]/g,
  /\.lte\(\s*['"`]([^'"`]+)['"`]/g,
  /\.gt\(\s*['"`]([^'"`]+)['"`]/g,
  /\.lt\(\s*['"`]([^'"`]+)['"`]/g,
  /\.contains\(\s*['"`]([^'"`]+)['"`]/g,
  /\.containedBy\(\s*['"`]([^'"`]+)['"`]/g,
  /\.filter\(\s*['"`]([^'"`]+)['"`]/g,
  /\.match\(\s*\{([^}]+)\}/g,
  /\.update\(\s*\{([^}]+)\}/g,
  /\.insert\(\s*\{([^}]+)\}/g,
  /\.upsert\(\s*\{([^}]+)\}/g,
];

// SQL patterns for raw queries
const SQL_COLUMN_PATTERNS = [
  /SELECT\s+([^FROM]+)\s+FROM/gi,
  /WHERE\s+(\w+)\s*[=<>!]/gi,
  /ORDER\s+BY\s+(\w+)/gi,
  /GROUP\s+BY\s+(\w+)/gi,
  /t\.(\w+)/g,  // Common alias pattern
  /p\.(\w+)/g,
  /m\.(\w+)/g,
];

// ============================================
// KNOWN SCHEMA (Update from types.ts or database)
// ============================================

// This should be populated from the actual database
// For now, we define known columns per table
const KNOWN_SCHEMA: Record<string, string[]> = {
  tickets: [
    'id', 'bu_id', 'type', 'title', 'status', 'expected_due_at',
    'created_by_user_id', 'owner_user_id', 'visibility',
    'visibility_team_ids', 'visibility_squad_ids', 'visibility_user_ids',
    'partner_company_id', 'category_id', 'subcategory_id',
    'assigned_contact_id', 'assignment_source', 'external_assignee_contact_ids',
    'created_at', 'updated_at', 'deleted_at'
  ],
  ticket_messages: [
    'id', 'bu_id', 'ticket_id', 'performed_by_user_id', 'body_richtext',
    'message_type', 'created_at', 'updated_at', 'deleted_at'
  ],
  ticket_participants: [
    'id', 'bu_id', 'ticket_id', 'user_id', 'contact_id', 'role', 'is_active',
    'created_at', 'updated_at'
  ],
  profiles: [
    'id', 'user_id', 'display_name', 'email', 'phone', 'photo_url',
    'bio', 'status', 'created_at', 'updated_at'
  ],
  // Add more tables as needed...
};

// Columns that existed before but were removed/renamed
const DEPRECATED_COLUMNS: Record<string, string[]> = {
  tickets: [
    'assigned_to_user_id',  // Renamed to owner_user_id
    'priority',             // Removed
    'description',          // Removed (content in messages)
    'resolved_at',          // Removed
    'due_at',               // Renamed to expected_due_at
    'squad_id',             // Removed
    'tags',                 // Removed
    'metadata',             // Removed
  ],
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

interface ColumnReference {
  file: string;
  line: number;
  column: string;
  context: string;
  table?: string;
}

interface AuditResult {
  deprecatedReferences: ColumnReference[];
  unknownReferences: ColumnReference[];
  validReferences: ColumnReference[];
}

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(item)) {
        files.push(...getAllFiles(fullPath, extensions));
      }
    } else if (extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractColumnsFromSelect(selectStr: string): string[] {
  // Parse select string like "id, title, owner:profiles(id, name)"
  const columns: string[] = [];
  
  // Remove nested relations first
  const withoutNested = selectStr.replace(/\w+:\w+\([^)]+\)/g, '');
  
  // Split by comma and clean up
  const parts = withoutNested.split(',');
  for (const part of parts) {
    const cleaned = part.trim().split(':')[0].split('.').pop()?.trim();
    if (cleaned && /^[a-z_]+$/i.test(cleaned)) {
      columns.push(cleaned);
    }
  }
  
  return columns;
}

function extractColumnsFromObject(objStr: string): string[] {
  // Parse object keys like "{ id: x, title: y }"
  const columns: string[] = [];
  const keyPattern = /(\w+)\s*:/g;
  let match;
  
  while ((match = keyPattern.exec(objStr)) !== null) {
    const key = match[1];
    if (/^[a-z_]+$/i.test(key)) {
      columns.push(key);
    }
  }
  
  return columns;
}

function detectTableFromContext(content: string, position: number): string | undefined {
  // Look backwards for .from('table_name')
  const beforeContent = content.substring(Math.max(0, position - 500), position);
  const fromMatch = beforeContent.match(/\.from\(\s*['"`](\w+)['"`]\s*\)/);
  
  if (fromMatch) {
    return fromMatch[1];
  }
  
  // Look for table name in SQL
  const sqlFromMatch = beforeContent.match(/FROM\s+(\w+)/i);
  if (sqlFromMatch) {
    return sqlFromMatch[1];
  }
  
  return undefined;
}

function scanFile(filePath: string): ColumnReference[] {
  const references: ColumnReference[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Scan with each pattern
  for (const pattern of COLUMN_REFERENCE_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(content)) !== null) {
      const matchedStr = match[1];
      const position = match.index;
      
      // Find line number
      const beforeMatch = content.substring(0, position);
      const lineNum = beforeMatch.split('\n').length;
      
      // Extract columns based on pattern type
      let columns: string[] = [];
      
      if (pattern.source.includes('select')) {
        columns = extractColumnsFromSelect(matchedStr);
      } else if (pattern.source.includes('match') || pattern.source.includes('update') || 
                 pattern.source.includes('insert') || pattern.source.includes('upsert')) {
        columns = extractColumnsFromObject(matchedStr);
      } else {
        // Simple column reference
        const col = matchedStr.trim();
        if (/^[a-z_]+$/i.test(col)) {
          columns = [col];
        }
      }
      
      // Detect table context
      const table = detectTableFromContext(content, position);
      
      for (const column of columns) {
        references.push({
          file: filePath,
          line: lineNum,
          column,
          context: lines[lineNum - 1]?.trim().substring(0, 100) || '',
          table,
        });
      }
    }
  }
  
  return references;
}

function analyzeReferences(references: ColumnReference[]): AuditResult {
  const result: AuditResult = {
    deprecatedReferences: [],
    unknownReferences: [],
    validReferences: [],
  };
  
  for (const ref of references) {
    const { column, table } = ref;
    
    // Check if it's a deprecated column
    const isDeprecated = Object.entries(DEPRECATED_COLUMNS).some(([tbl, cols]) => {
      if (table && table !== tbl) return false;
      return cols.includes(column);
    });
    
    if (isDeprecated) {
      result.deprecatedReferences.push(ref);
      continue;
    }
    
    // Check if it's a known valid column
    const isValid = Object.entries(KNOWN_SCHEMA).some(([tbl, cols]) => {
      if (table && table !== tbl) return false;
      return cols.includes(column);
    });
    
    if (isValid) {
      result.validReferences.push(ref);
    } else if (table && KNOWN_SCHEMA[table]) {
      // Table is known but column is not
      result.unknownReferences.push(ref);
    }
    // If table is unknown, we can't determine validity
  }
  
  return result;
}

function printReport(result: AuditResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('DATABASE COLUMN REFERENCE AUDIT REPORT');
  console.log('='.repeat(80));
  
  // Deprecated columns
  console.log('\n🚨 DEPRECATED COLUMN REFERENCES (likely broken):');
  console.log('-'.repeat(60));
  
  if (result.deprecatedReferences.length === 0) {
    console.log('  ✅ No deprecated column references found!');
  } else {
    const grouped = groupByColumn(result.deprecatedReferences);
    for (const [column, refs] of Object.entries(grouped)) {
      console.log(`\n  ❌ "${column}" (${refs.length} occurrences):`);
      for (const ref of refs.slice(0, 5)) {
        console.log(`     - ${ref.file}:${ref.line}`);
        console.log(`       ${ref.context}`);
      }
      if (refs.length > 5) {
        console.log(`     ... and ${refs.length - 5} more`);
      }
    }
  }
  
  // Unknown columns
  console.log('\n\n⚠️  UNKNOWN COLUMN REFERENCES (may need review):');
  console.log('-'.repeat(60));
  
  if (result.unknownReferences.length === 0) {
    console.log('  ✅ No unknown column references found!');
  } else {
    const grouped = groupByColumn(result.unknownReferences);
    for (const [column, refs] of Object.entries(grouped)) {
      console.log(`\n  ❓ "${column}" in table "${refs[0].table}" (${refs.length} occurrences):`);
      for (const ref of refs.slice(0, 3)) {
        console.log(`     - ${ref.file}:${ref.line}`);
      }
      if (refs.length > 3) {
        console.log(`     ... and ${refs.length - 3} more`);
      }
    }
  }
  
  // Summary
  console.log('\n\n📊 SUMMARY:');
  console.log('-'.repeat(60));
  console.log(`  Total references scanned: ${result.validReferences.length + result.deprecatedReferences.length + result.unknownReferences.length}`);
  console.log(`  ✅ Valid references: ${result.validReferences.length}`);
  console.log(`  ❌ Deprecated references: ${result.deprecatedReferences.length}`);
  console.log(`  ❓ Unknown references: ${result.unknownReferences.length}`);
  console.log('\n' + '='.repeat(80) + '\n');
}

function groupByColumn(refs: ColumnReference[]): Record<string, ColumnReference[]> {
  const grouped: Record<string, ColumnReference[]> = {};
  for (const ref of refs) {
    if (!grouped[ref.column]) {
      grouped[ref.column] = [];
    }
    grouped[ref.column].push(ref);
  }
  return grouped;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('🔍 Scanning codebase for database column references...\n');
  
  // Collect all files
  const allFiles: string[] = [];
  for (const dir of SRC_DIRS) {
    allFiles.push(...getAllFiles(dir, FILE_EXTENSIONS));
  }
  
  console.log(`Found ${allFiles.length} files to scan.`);
  
  // Scan all files
  const allReferences: ColumnReference[] = [];
  for (const file of allFiles) {
    const refs = scanFile(file);
    allReferences.push(...refs);
  }
  
  console.log(`Found ${allReferences.length} column references.`);
  
  // Analyze
  const result = analyzeReferences(allReferences);
  
  // Print report
  printReport(result);
  
  // Exit with error if deprecated references found
  if (result.deprecatedReferences.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
