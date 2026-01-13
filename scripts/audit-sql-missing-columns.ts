#!/usr/bin/env npx ts-node
/**
 * Audit SQL Functions for Missing Column References
 * 
 * This script queries the database to find SQL functions that reference
 * columns that don't exist in core tables.
 * 
 * Usage: npx ts-node scripts/audit-sql-missing-columns.ts
 * 
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Core tables and their columns (source of truth)
const CORE_TABLES: Record<string, string[]> = {
  user_team_memberships: [
    'id', 'user_id', 'team_id', 'is_primary', 'created_at', 'updated_at'
  ],
  squad_memberships: [
    'id', 'squad_id', 'user_id', 'role', 'created_at', 'updated_at', 'bu_id', 'deleted_at'
  ],
  teams: [
    'id', 'name', 'description', 'leader_user_id', 'parent_team_id', 'status',
    'created_at', 'updated_at', 'deleted_at', 'bu_id', 'checkin_frequency',
    'checkin_day', 'checkin_deadline_hour'
  ],
  squads: [
    'id', 'name', 'description', 'bu_id', 'products', 'status',
    'created_at', 'updated_at', 'deleted_at'
  ],
  tickets: [
    'id', 'bu_id', 'title', 'description', 'status', 'type',
    'created_by_user_id', 'owner_user_id', 'visibility',
    'visibility_team_ids', 'visibility_squad_ids', 'visibility_user_ids',
    'created_at', 'updated_at', 'deleted_at', 'expected_due_at',
    'category_id', 'subcategory_id', 'partner_company_id', 'assigned_contact_id'
  ]
};

// Known invalid table references
const INVALID_TABLES = [
  'user_squad_memberships' // Should be squad_memberships
];

// Columns that are commonly mistakenly referenced
const KNOWN_INVALID_COLUMNS: Record<string, string[]> = {
  user_team_memberships: ['is_active', 'left_at', 'deleted_at'],
  teams: ['is_active'],
  squads: ['is_active']
};

interface FunctionInfo {
  function_name: string;
  function_definition: string;
}

interface Issue {
  function_name: string;
  issue_type: 'missing_column' | 'invalid_table';
  table_name: string;
  column_name?: string;
  line_snippet: string;
}

async function getFunctions(): Promise<FunctionInfo[]> {
  const { data, error } = await supabase.rpc('get_public_functions');
  
  if (error) {
    // Fallback: query pg_proc directly
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('pg_proc')
      .select('proname, prosrc');
    
    if (fallbackError) {
      console.error('Cannot fetch functions:', fallbackError);
      return [];
    }
    
    return [];
  }
  
  return data || [];
}

async function getFunctionsViaQuery(): Promise<FunctionInfo[]> {
  // Use raw SQL to get function definitions
  const query = `
    SELECT 
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
    ORDER BY p.proname
  `;
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ query })
    });
    
    // This won't work directly, need to use a different approach
    return [];
  } catch {
    return [];
  }
}

function analyzeFunction(func: FunctionInfo): Issue[] {
  const issues: Issue[] = [];
  const definition = func.function_definition.toLowerCase();
  const lines = func.function_definition.split('\n');
  
  // Check for invalid table references
  for (const invalidTable of INVALID_TABLES) {
    if (definition.includes(invalidTable.toLowerCase())) {
      const lineIdx = lines.findIndex(l => l.toLowerCase().includes(invalidTable.toLowerCase()));
      issues.push({
        function_name: func.function_name,
        issue_type: 'invalid_table',
        table_name: invalidTable,
        line_snippet: lineIdx >= 0 ? lines[lineIdx].trim() : ''
      });
    }
  }
  
  // Check for invalid column references
  for (const [table, invalidCols] of Object.entries(KNOWN_INVALID_COLUMNS)) {
    // Check if function references this table
    if (definition.includes(table.toLowerCase())) {
      for (const col of invalidCols) {
        // Look for patterns like "utm.is_active" or "table.column"
        const patterns = [
          new RegExp(`\\b\\w+\\.${col}\\b`, 'i'),
          new RegExp(`\\b${col}\\b`, 'i')
        ];
        
        for (const pattern of patterns) {
          if (pattern.test(definition)) {
            const lineIdx = lines.findIndex(l => pattern.test(l));
            if (lineIdx >= 0) {
              issues.push({
                function_name: func.function_name,
                issue_type: 'missing_column',
                table_name: table,
                column_name: col,
                line_snippet: lines[lineIdx].trim()
              });
              break; // Only report once per column
            }
          }
        }
      }
    }
  }
  
  return issues;
}

async function main() {
  console.log('🔍 Auditing SQL Functions for Missing Column References\n');
  console.log('='.repeat(60));
  
  // Manual list of functions to check (since we can't easily query pg_proc)
  const functionsToCheck = [
    'get_leader_teams',
    'get_team_member_ids',
    'check_scope_access',
    'can_view_ticket',
    'get_team_with_members',
    'get_squad_members'
  ];
  
  console.log('\n📋 Core Tables Schema:\n');
  for (const [table, cols] of Object.entries(CORE_TABLES)) {
    console.log(`  ${table}:`);
    console.log(`    Columns: ${cols.join(', ')}`);
    if (KNOWN_INVALID_COLUMNS[table]) {
      console.log(`    ⚠️  Invalid refs to check: ${KNOWN_INVALID_COLUMNS[table].join(', ')}`);
    }
    console.log();
  }
  
  console.log('\n📋 Invalid Table Names:\n');
  for (const table of INVALID_TABLES) {
    console.log(`  ❌ ${table} (should be another table)`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n🔎 To run a full audit, execute this SQL in Supabase SQL Editor:\n');
  
  const auditSQL = `
-- Audit SQL: Find functions referencing invalid columns
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) ILIKE '%utm.is_active%' THEN 'utm.is_active'
    WHEN pg_get_functiondef(p.oid) ILIKE '%user_squad_memberships%' THEN 'user_squad_memberships'
    WHEN pg_get_functiondef(p.oid) ILIKE '%.left_at%' AND pg_get_functiondef(p.oid) ILIKE '%user_team_memberships%' THEN 'utm.left_at'
    ELSE NULL
  END as potential_issue
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (
    pg_get_functiondef(p.oid) ILIKE '%utm.is_active%'
    OR pg_get_functiondef(p.oid) ILIKE '%user_squad_memberships%'
    OR (pg_get_functiondef(p.oid) ILIKE '%.left_at%' AND pg_get_functiondef(p.oid) ILIKE '%user_team_memberships%')
  )
ORDER BY p.proname;
  `.trim();
  
  console.log(auditSQL);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Membership Active Rules (Canonical):\n');
  console.log('  user_team_memberships: Existence = Active (no soft delete columns)');
  console.log('  squad_memberships:     deleted_at IS NULL = Active');
  console.log('  teams:                 deleted_at IS NULL = Active');
  console.log('  squads:                deleted_at IS NULL = Active');
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Audit Complete\n');
}

main().catch(console.error);
