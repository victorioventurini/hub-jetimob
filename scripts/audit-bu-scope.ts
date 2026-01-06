#!/usr/bin/env npx tsx
/**
 * BU Scope Audit Scanner
 * 
 * Scans src/ for Supabase operations without proper bu_id handling.
 * 
 * Usage: npx tsx scripts/audit-bu-scope.ts
 * Or:    npm run audit:bu
 */

import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  type: 'INSERT_MISSING_BU_ID' | 'UPDATE_MISSING_BU_ID' | 'UPSERT_MISSING_BU_ID' | 'SELECT_MISSING_BU_FILTER' | 'UNKNOWN_DYNAMIC_TABLE';
  file: string;
  line: number;
  snippet: string;
  table?: string;
}

// Tables that require bu_id
const BU_SCOPED_TABLES = [
  'okr_org_objectives', 'okr_org_key_results',
  'okr_team_objectives', 'okr_team_key_results',
  'okr_initiatives', 'okr_checkins', 'cycles', 'okr_insights',
  'teams', 'squads', 'user_team_memberships',
  'asset_inventory', 'asset_movements', 'asset_keyrings',
  'asset_key_movements', 'asset_keys', 'asset_gift_items',
  'asset_gift_batches', 'asset_gift_movements', 'asset_categories',
  'asset_clavicularies', 'asset_groups', 'asset_group_items',
  'asset_permissions',
  'tickets', 'ticket_messages', 'ticket_attachments',
  'ticket_categories', 'ticket_subcategories', 'ticket_routing_rules',
  'kpi_metrics', 'kpi_values',
];

// Files to skip (tests, mocks, configs)
const SKIP_PATTERNS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /\.d\.ts$/,
  /\/types\//,
  /\/types\.ts$/,
];

// Patterns that indicate bu_id is handled
const BU_ID_PATTERNS = [
  /bu_id\s*:/,
  /bu_id\s*,/,
  /withBuId\s*\(/,
  /\.eq\s*\(\s*['"`]bu_id['"`]/,
  /useBuScopedSupabase/,
];

function getAllFiles(dir: string, files: string[] = []): string[] {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function shouldSkip(filePath: string): boolean {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

function extractTableName(line: string): string | null {
  // Match .from('table') or .from("table") or .from(`table`)
  const match = line.match(/\.from\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  return match ? match[1] : null;
}

function hasBuIdHandling(context: string): boolean {
  return BU_ID_PATTERNS.some(pattern => pattern.test(context));
}

function scanFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Look for supabase operations
  const patterns = [
    { regex: /\.from\s*\([^)]+\)\s*\.insert\s*\(/g, type: 'INSERT_MISSING_BU_ID' as const },
    { regex: /\.from\s*\([^)]+\)\s*\.update\s*\(/g, type: 'UPDATE_MISSING_BU_ID' as const },
    { regex: /\.from\s*\([^)]+\)\s*\.upsert\s*\(/g, type: 'UPSERT_MISSING_BU_ID' as const },
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Check for dynamic table usage
    if (line.includes('.from(') && !line.includes("'") && !line.includes('"') && !line.includes('`')) {
      if (line.match(/\.from\s*\(\s*[a-zA-Z_]/)) {
        findings.push({
          type: 'UNKNOWN_DYNAMIC_TABLE',
          file: filePath,
          line: lineNum,
          snippet: line.trim().substring(0, 100),
        });
        continue;
      }
    }
    
    const tableName = extractTableName(line);
    
    // Skip non-BU-scoped tables
    if (tableName && !BU_SCOPED_TABLES.includes(tableName)) {
      continue;
    }
    
    // Get context (current line + next 5 lines for checking bu_id)
    const context = lines.slice(i, Math.min(i + 6, lines.length)).join('\n');
    
    for (const { regex, type } of patterns) {
      regex.lastIndex = 0;
      if (regex.test(line)) {
        if (!hasBuIdHandling(context)) {
          findings.push({
            type,
            file: filePath,
            line: lineNum,
            snippet: line.trim().substring(0, 100),
            table: tableName || undefined,
          });
        }
      }
    }
    
    // Check for select without bu_id filter
    if (line.includes('.select(') && tableName && BU_SCOPED_TABLES.includes(tableName)) {
      // Look ahead for .eq('bu_id' or useBuScopedSupabase
      const selectContext = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
      if (!hasBuIdHandling(selectContext) && !content.includes('useBuScopedSupabase')) {
        findings.push({
          type: 'SELECT_MISSING_BU_FILTER',
          file: filePath,
          line: lineNum,
          snippet: line.trim().substring(0, 100),
          table: tableName,
        });
      }
    }
  }
  
  return findings;
}

function main() {
  console.log('🔍 BU Scope Audit Scanner\n');
  console.log('Scanning src/ for missing bu_id handling...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src/ directory not found');
    process.exit(1);
  }
  
  const files = getAllFiles(srcDir).filter(f => !shouldSkip(f));
  console.log(`📁 Scanning ${files.length} files...\n`);
  
  const allFindings: Finding[] = [];
  
  for (const file of files) {
    const findings = scanFile(file);
    allFindings.push(...findings);
  }
  
  // Group by type
  const byType: Record<string, Finding[]> = {};
  for (const finding of allFindings) {
    if (!byType[finding.type]) {
      byType[finding.type] = [];
    }
    byType[finding.type].push(finding);
  }
  
  // Summary
  console.log('=' .repeat(60));
  console.log('SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total findings: ${allFindings.length}\n`);
  
  for (const [type, findings] of Object.entries(byType)) {
    console.log(`  ${type}: ${findings.length}`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('DETAILS (Top 30)');
  console.log('=' .repeat(60));
  
  const criticalTypes = ['INSERT_MISSING_BU_ID', 'UPDATE_MISSING_BU_ID', 'UPSERT_MISSING_BU_ID'];
  const criticalFindings = allFindings.filter(f => criticalTypes.includes(f.type));
  const otherFindings = allFindings.filter(f => !criticalTypes.includes(f.type));
  
  const toShow = [...criticalFindings, ...otherFindings].slice(0, 30);
  
  for (const finding of toShow) {
    const relPath = finding.file.replace(process.cwd() + '/', '');
    console.log(`\n[${finding.type}]`);
    console.log(`  File: ${relPath}:${finding.line}`);
    if (finding.table) console.log(`  Table: ${finding.table}`);
    console.log(`  Snippet: ${finding.snippet}`);
  }
  
  console.log('\n' + '=' .repeat(60));
  
  // Exit with error if critical findings
  if (criticalFindings.length > 0) {
    console.log(`\n⚠️  ${criticalFindings.length} CRITICAL findings (INSERT/UPDATE/UPSERT without bu_id)`);
    process.exit(1);
  } else {
    console.log('\n✅ No critical findings');
    process.exit(0);
  }
}

main();
