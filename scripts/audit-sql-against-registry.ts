/**
 * Data Model Registry Audit Script
 * 
 * Validates SQL migrations, edge functions, and docs against the canonical
 * DATA_MODEL_REGISTRY.json to prevent references to non-existent or removed objects.
 * 
 * Usage:
 *   npx tsx scripts/audit-sql-against-registry.ts [--verbose] [--warn-only]
 * 
 * Exit codes:
 *   0: PASS (no blocking violations)
 *   1: FAIL (blocking violations found)
 * 
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ==========================
// CONFIGURATION
// ==========================

const REGISTRY_PATH = 'docs/canonical/DATA_MODEL_REGISTRY.json';
const CONFIG_PATH = 'scripts/registry-audit-config.json';

// Directories to scan
const SCAN_DIRS = {
  migrations: 'supabase/migrations',
  functions: 'supabase/functions',
  docs: 'docs',
};

// ==========================
// TYPES
// ==========================

interface RegistryTable {
  name: string;
  schema: string;
  rls_enabled?: boolean;
  bu_scoped?: boolean;
  status?: 'active' | 'deprecated' | 'removed';
}

interface RegistryView {
  name: string;
  status?: 'active' | 'deprecated' | 'removed';
}

interface RegistryFunction {
  name: string;
  return_type?: string;
  security_definer?: boolean;
  status?: 'active' | 'deprecated' | 'removed';
}

interface RegistryEnum {
  name: string;
  values: string[];
  status?: 'active' | 'deprecated' | 'removed';
}

interface DataModelRegistry {
  generated_at: string;
  tables: RegistryTable[];
  views: RegistryView[];
  functions: RegistryFunction[];
  enums: RegistryEnum[];
}

interface AuditConfig {
  ignore_paths: string[];
  allow_unknown_patterns: string[];
  allow_schemas: string[];
  allow_tokens: string[];
}

interface Violation {
  file: string;
  line: number | null;
  column: number | null;
  identifier: string;
  type: 'table' | 'view' | 'function' | 'enum' | 'unknown';
  severity: 'error' | 'warn';
  message: string;
  suggestion?: string;
}

// ==========================
// REGISTRY LOADING
// ==========================

function loadRegistry(): DataModelRegistry {
  const registryPath = path.join(process.cwd(), REGISTRY_PATH);
  
  if (!fs.existsSync(registryPath)) {
    console.error(`❌ Registry not found at ${REGISTRY_PATH}`);
    console.error('   Run: npx tsx scripts/generate-data-model-registry.ts');
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
}

function loadConfig(): AuditConfig {
  const configPath = path.join(process.cwd(), CONFIG_PATH);
  
  if (!fs.existsSync(configPath)) {
    return {
      ignore_paths: [],
      allow_unknown_patterns: [],
      allow_schemas: ['auth', 'storage', 'realtime', 'supabase_functions', 'vault', 'extensions'],
      allow_tokens: ['pg_catalog', 'information_schema', 'pg_class', 'pg_namespace', 'pg_proc', 'pg_trigger', 'pg_type', 'pg_enum', 'pg_policies'],
    };
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

// ==========================
// IDENTIFIER SETS
// ==========================

interface IdentifierSets {
  tables: Set<string>;
  tablesWithSchema: Set<string>;
  views: Set<string>;
  viewsWithSchema: Set<string>;
  functions: Set<string>;
  functionsWithSchema: Set<string>;
  enums: Set<string>;
  deprecated: Set<string>;
  removed: Set<string>;
}

function buildIdentifierSets(registry: DataModelRegistry): IdentifierSets {
  const sets: IdentifierSets = {
    tables: new Set(),
    tablesWithSchema: new Set(),
    views: new Set(),
    viewsWithSchema: new Set(),
    functions: new Set(),
    functionsWithSchema: new Set(),
    enums: new Set(),
    deprecated: new Set(),
    removed: new Set(),
  };

  for (const table of registry.tables) {
    const schema = table.schema || 'public';
    sets.tables.add(table.name.toLowerCase());
    sets.tablesWithSchema.add(`${schema}.${table.name}`.toLowerCase());
    
    if (table.status === 'deprecated') {
      sets.deprecated.add(table.name.toLowerCase());
    } else if (table.status === 'removed') {
      sets.removed.add(table.name.toLowerCase());
    }
  }

  for (const view of registry.views) {
    sets.views.add(view.name.toLowerCase());
    sets.viewsWithSchema.add(`public.${view.name}`.toLowerCase());
    
    if (view.status === 'deprecated') {
      sets.deprecated.add(view.name.toLowerCase());
    } else if (view.status === 'removed') {
      sets.removed.add(view.name.toLowerCase());
    }
  }

  for (const func of registry.functions) {
    sets.functions.add(func.name.toLowerCase());
    sets.functionsWithSchema.add(`public.${func.name}`.toLowerCase());
    
    if (func.status === 'deprecated') {
      sets.deprecated.add(func.name.toLowerCase());
    } else if (func.status === 'removed') {
      sets.removed.add(func.name.toLowerCase());
    }
  }

  for (const enumType of registry.enums) {
    sets.enums.add(enumType.name.toLowerCase());
    
    if (enumType.status === 'deprecated') {
      sets.deprecated.add(enumType.name.toLowerCase());
    } else if (enumType.status === 'removed') {
      sets.removed.add(enumType.name.toLowerCase());
    }
  }

  return sets;
}

// ==========================
// FILE DISCOVERY
// ==========================

function getFilesRecursive(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  const dirPath = path.join(process.cwd(), dir);

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dirPath);
  return files;
}

function shouldIgnorePath(filePath: string, ignorePaths: string[]): boolean {
  const relativePath = path.relative(process.cwd(), filePath);
  
  for (const pattern of ignorePaths) {
    // Simple glob matching
    if (pattern.endsWith('**')) {
      const prefix = pattern.slice(0, -2);
      if (relativePath.startsWith(prefix)) {
        return true;
      }
    } else if (relativePath === pattern || relativePath.startsWith(pattern + '/')) {
      return true;
    }
  }
  
  return false;
}

// ==========================
// SQL PARSING
// ==========================

// Patterns to extract table/view references from SQL
const SQL_TABLE_PATTERNS = [
  /\bFROM\s+(?:ONLY\s+)?([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bJOIN\s+(?:ONLY\s+)?([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bINTO\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bUPDATE\s+(?:ONLY\s+)?([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bINSERT\s+INTO\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bDELETE\s+FROM\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bTRUNCATE\s+(?:TABLE\s+)?([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
];

const SQL_VIEW_PATTERNS = [
  /\bCREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bDROP\s+VIEW\s+(?:IF\s+EXISTS\s+)?([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
];

const SQL_FUNCTION_PATTERNS = [
  /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bDROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bEXECUTE\s+FUNCTION\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
  /\bSELECT\s+([a-z_][a-z0-9_]*)\s*\(/gi, // Function calls like SELECT my_func()
];

interface ExtractedReference {
  identifier: string;
  line: number;
  column: number;
  type: 'table' | 'view' | 'function';
}

function extractSqlReferences(content: string): ExtractedReference[] {
  const refs: ExtractedReference[] = [];
  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    // Skip comments
    if (line.trim().startsWith('--')) continue;

    // Extract table references
    for (const pattern of SQL_TABLE_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        refs.push({
          identifier: match[1],
          line: lineNum + 1,
          column: match.index,
          type: 'table',
        });
      }
    }

    // Extract view references
    for (const pattern of SQL_VIEW_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        refs.push({
          identifier: match[1],
          line: lineNum + 1,
          column: match.index,
          type: 'view',
        });
      }
    }

    // Extract function references
    for (const pattern of SQL_FUNCTION_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        refs.push({
          identifier: match[1],
          line: lineNum + 1,
          column: match.index,
          type: 'function',
        });
      }
    }
  }

  return refs;
}

// ==========================
// TYPESCRIPT PARSING (Edge Functions)
// ==========================

const TS_FROM_PATTERN = /\.from\s*\(\s*['"`]([a-z_][a-z0-9_]*)['"`]\s*\)/gi;
const TS_RPC_PATTERN = /\.rpc\s*\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/gi;

function extractTsReferences(content: string): ExtractedReference[] {
  const refs: ExtractedReference[] = [];
  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Extract .from('table') calls
    TS_FROM_PATTERN.lastIndex = 0;
    let match;
    while ((match = TS_FROM_PATTERN.exec(line)) !== null) {
      refs.push({
        identifier: match[1],
        line: lineNum + 1,
        column: match.index,
        type: 'table',
      });
    }

    // Extract .rpc('function') calls
    TS_RPC_PATTERN.lastIndex = 0;
    while ((match = TS_RPC_PATTERN.exec(line)) !== null) {
      refs.push({
        identifier: match[1],
        line: lineNum + 1,
        column: match.index,
        type: 'function',
      });
    }
  }

  return refs;
}

// ==========================
// VALIDATION
// ==========================

function validateReference(
  ref: ExtractedReference,
  sets: IdentifierSets,
  config: AuditConfig,
  file: string
): Violation | null {
  const identifier = ref.identifier.toLowerCase();
  
  // Check if it's an allowed schema
  if (identifier.includes('.')) {
    const [schema] = identifier.split('.');
    if (config.allow_schemas.includes(schema)) {
      return null;
    }
  }

  // Check if it's an allowed token (pg_catalog, etc.)
  for (const token of config.allow_tokens) {
    if (identifier === token.toLowerCase() || identifier.startsWith(token.toLowerCase() + '.')) {
      return null;
    }
  }

  // Check if it's in the allowlist
  for (const pattern of config.allow_unknown_patterns) {
    if (identifier === pattern.toLowerCase() || identifier.includes(pattern.toLowerCase())) {
      return null;
    }
  }

  // Normalize: remove schema if present
  const baseName = identifier.includes('.') ? identifier.split('.')[1] : identifier;

  // Check if it's a removed object
  if (sets.removed.has(baseName)) {
    return {
      file,
      line: ref.line,
      column: ref.column,
      identifier: ref.identifier,
      type: ref.type,
      severity: 'error',
      message: `Reference to REMOVED ${ref.type}: "${ref.identifier}"`,
      suggestion: 'This object was removed from the schema. Check DATA_MODEL_REGISTRY.md for current objects.',
    };
  }

  // Check if it's a deprecated object
  if (sets.deprecated.has(baseName)) {
    return {
      file,
      line: ref.line,
      column: ref.column,
      identifier: ref.identifier,
      type: ref.type,
      severity: 'warn',
      message: `Reference to DEPRECATED ${ref.type}: "${ref.identifier}"`,
      suggestion: 'Consider migrating to the replacement object.',
    };
  }

  // Validate based on type
  let exists = false;
  
  if (ref.type === 'table') {
    exists = sets.tables.has(baseName) || sets.tablesWithSchema.has(identifier) || sets.views.has(baseName);
  } else if (ref.type === 'view') {
    exists = sets.views.has(baseName) || sets.viewsWithSchema.has(identifier) || sets.tables.has(baseName);
  } else if (ref.type === 'function') {
    exists = sets.functions.has(baseName) || sets.functionsWithSchema.has(identifier);
  }

  if (!exists) {
    // Check if it might be a function when we thought it was a table (common with RPC)
    if (ref.type === 'table' && sets.functions.has(baseName)) {
      return null; // It's actually a function, that's OK
    }

    return {
      file,
      line: ref.line,
      column: ref.column,
      identifier: ref.identifier,
      type: ref.type,
      severity: 'error',
      message: `Unknown ${ref.type}: "${ref.identifier}" not found in registry`,
      suggestion: `Check DATA_MODEL_REGISTRY.md for valid names. Did you mean one of the existing objects?`,
    };
  }

  return null;
}

// ==========================
// FILE AUDITING
// ==========================

function auditMigrationFile(
  filePath: string,
  sets: IdentifierSets,
  config: AuditConfig
): Violation[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const refs = extractSqlReferences(content);
  const violations: Violation[] = [];

  for (const ref of refs) {
    const violation = validateReference(ref, sets, config, filePath);
    if (violation) {
      violations.push(violation);
    }
  }

  return violations;
}

function auditEdgeFunctionFile(
  filePath: string,
  sets: IdentifierSets,
  config: AuditConfig
): Violation[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const refs = extractTsReferences(content);
  const violations: Violation[] = [];

  for (const ref of refs) {
    const violation = validateReference(ref, sets, config, filePath);
    if (violation) {
      violations.push(violation);
    }
  }

  return violations;
}

// ==========================
// OUTPUT FORMATTING
// ==========================

function formatViolation(v: Violation): string {
  const location = v.line ? `:${v.line}${v.column ? `:${v.column}` : ''}` : '';
  const icon = v.severity === 'error' ? '❌' : '⚠️';
  const relativePath = path.relative(process.cwd(), v.file);
  
  let output = `${icon} ${relativePath}${location}\n`;
  output += `   ${v.message}\n`;
  if (v.suggestion) {
    output += `   💡 ${v.suggestion}\n`;
  }
  
  return output;
}

// ==========================
// MAIN
// ==========================

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const warnOnly = args.includes('--warn-only');

  console.log('');
  console.log('========================================');
  console.log('  Data Model Registry Audit v1.0.0');
  console.log('========================================');
  console.log('');

  // Load registry and config
  const registry = loadRegistry();
  const config = loadConfig();
  const sets = buildIdentifierSets(registry);

  if (verbose) {
    console.log(`📊 Registry stats:`);
    console.log(`   Tables: ${sets.tables.size}`);
    console.log(`   Views: ${sets.views.size}`);
    console.log(`   Functions: ${sets.functions.size}`);
    console.log(`   Enums: ${sets.enums.size}`);
    console.log(`   Deprecated: ${sets.deprecated.size}`);
    console.log(`   Removed: ${sets.removed.size}`);
    console.log('');
  }

  const allViolations: Violation[] = [];

  // Audit migrations
  console.log('🔍 Scanning migrations...');
  const migrationFiles = getFilesRecursive(SCAN_DIRS.migrations, ['.sql']);
  let migrationCount = 0;
  
  for (const file of migrationFiles) {
    if (shouldIgnorePath(file, config.ignore_paths)) continue;
    migrationCount++;
    const violations = auditMigrationFile(file, sets, config);
    allViolations.push(...violations);
  }
  console.log(`   Found ${migrationCount} migration files`);

  // Audit edge functions
  console.log('🔍 Scanning edge functions...');
  const functionFiles = getFilesRecursive(SCAN_DIRS.functions, ['.ts', '.js']);
  let functionCount = 0;
  
  for (const file of functionFiles) {
    if (shouldIgnorePath(file, config.ignore_paths)) continue;
    functionCount++;
    const violations = auditEdgeFunctionFile(file, sets, config);
    allViolations.push(...violations);
  }
  console.log(`   Found ${functionCount} function files`);

  console.log('');

  // Separate errors and warnings
  const errors = allViolations.filter(v => v.severity === 'error');
  const warnings = allViolations.filter(v => v.severity === 'warn');

  // Output results
  if (errors.length > 0) {
    console.log('❌ ERRORS (blocking):');
    console.log('');
    for (const v of errors) {
      console.log(formatViolation(v));
    }
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    console.log('');
    for (const v of warnings) {
      console.log(formatViolation(v));
    }
  }

  // Summary
  console.log('========================================');
  console.log('  SUMMARY');
  console.log('========================================');
  console.log(`  Errors:   ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}`);
  console.log('');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All references are valid!');
    process.exit(0);
  } else if (errors.length === 0 || warnOnly) {
    console.log('✅ PASS (warnings only)');
    process.exit(0);
  } else {
    console.log('❌ FAIL - Fix errors before merging');
    console.log('');
    console.log('📚 See: docs/engineering/DATA_MODEL_REGISTRY_AUDIT.md');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
