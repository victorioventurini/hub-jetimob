#!/usr/bin/env npx tsx
/**
 * Query Profiling Script
 * 
 * Generates EXPLAIN ANALYZE reports for critical queries.
 * This script outputs SQL that can be run against the database.
 * 
 * Run: npx tsx scripts/profile-queries.ts > docs/perf/explain/queries.sql
 */

import * as fs from "fs";
import * as path from "path";

interface QueryProfile {
  name: string;
  module: string;
  description: string;
  sql: string;
  indexes_used: string[];
}

// Critical queries to profile (replace UUIDs with actual test data)
const CRITICAL_QUERIES: QueryProfile[] = [
  // ========== HOME DASHBOARD ==========
  {
    name: "home_pending_checkins",
    module: "home",
    description: "Pending check-ins for home dashboard",
    sql: `
SELECT 
  kr.id, kr.title, kr.status, kr.current_value, kr.target, kr.direction,
  kr.last_checkin_at, kr.team_id,
  t.name as team_name
FROM okr_team_key_results kr
JOIN teams t ON t.id = kr.team_id
WHERE kr.bu_id = '<BU_ID>'
  AND kr.deleted_at IS NULL
  AND kr.status IN ('not_started', 'yellow', 'red')
  AND (kr.last_checkin_at IS NULL OR kr.last_checkin_at < NOW() - INTERVAL '7 days')
ORDER BY kr.last_checkin_at ASC NULLS FIRST
LIMIT 10;
    `,
    indexes_used: ["okr_team_key_results_bu_id_idx", "okr_team_key_results_status_idx"],
  },
  {
    name: "home_okr_summary",
    module: "home",
    description: "OKR status counts for dashboard",
    sql: `
SELECT 
  status,
  COUNT(*) as count
FROM okr_team_key_results
WHERE bu_id = '<BU_ID>'
  AND deleted_at IS NULL
GROUP BY status;
    `,
    indexes_used: ["okr_team_key_results_bu_id_status_idx"],
  },
  {
    name: "home_birthdays",
    module: "home",
    description: "Birthdays this month",
    sql: `
SELECT 
  id, display_name, job_title, photo_url, birth_day, birth_month, team_id
FROM profiles
WHERE bu_id = '<BU_ID>'
  AND deleted_at IS NULL
  AND employment_status = 'active'
  AND birth_month = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY birth_day ASC;
    `,
    indexes_used: ["profiles_bu_id_birth_month_idx"],
  },
  {
    name: "home_new_jetimobers",
    module: "home",
    description: "New employees in last 30 days",
    sql: `
SELECT 
  id, display_name, job_title, photo_url, start_date, team_id
FROM profiles
WHERE bu_id = '<BU_ID>'
  AND deleted_at IS NULL
  AND employment_status = 'active'
  AND start_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY start_date DESC
LIMIT 5;
    `,
    indexes_used: ["profiles_bu_id_start_date_idx"],
  },

  // ========== TICKETS ==========
  {
    name: "tickets_list",
    module: "tickets",
    description: "Ticket list with filters",
    sql: `
SELECT 
  t.id, t.title, t.type, t.status, t.priority, 
  t.created_at, t.updated_at, t.expected_due_at,
  t.owner_user_id, t.assigned_to_user_id,
  c.name as category_name,
  p.name as partner_name
FROM tickets t
LEFT JOIN ticket_categories c ON c.id = t.category_id
LEFT JOIN partner_companies p ON p.id = t.partner_company_id
WHERE t.bu_id = '<BU_ID>'
  AND t.deleted_at IS NULL
ORDER BY t.updated_at DESC
LIMIT 50;
    `,
    indexes_used: ["tickets_bu_id_updated_at_idx", "tickets_bu_id_status_idx"],
  },
  {
    name: "ticket_messages",
    module: "tickets",
    description: "Messages for a ticket",
    sql: `
SELECT 
  m.id, m.body_richtext, m.author_type, m.author_user_id, 
  m.author_contact_id, m.created_at, m.edited_at
FROM ticket_messages m
WHERE m.ticket_id = '<TICKET_ID>'
  AND m.deleted_at IS NULL
ORDER BY m.created_at ASC;
    `,
    indexes_used: ["ticket_messages_ticket_id_created_at_idx"],
  },

  // ========== OKRS ==========
  {
    name: "okrs_org_objectives",
    module: "okrs",
    description: "Organizational objectives with KRs",
    sql: `
SELECT 
  o.id, o.title, o.description, o.year, o.status, o.owner_user_id,
  (
    SELECT json_agg(json_build_object(
      'id', kr.id,
      'title', kr.title,
      'status', kr.status,
      'current_value', kr.current_value,
      'target', kr.target
    ))
    FROM okr_org_key_results kr
    WHERE kr.org_objective_id = o.id AND kr.deleted_at IS NULL
  ) as key_results
FROM okr_org_objectives o
WHERE o.bu_id = '<BU_ID>'
  AND o.year = 2026
  AND o.deleted_at IS NULL
ORDER BY o.created_at DESC;
    `,
    indexes_used: ["okr_org_objectives_bu_id_year_idx"],
  },
  {
    name: "okrs_team_krs",
    module: "okrs",
    description: "Team KRs for a team",
    sql: `
SELECT 
  kr.id, kr.title, kr.status, kr.type,
  kr.baseline, kr.current_value, kr.target, kr.direction, kr.unit,
  kr.owner_user_id, kr.last_checkin_at,
  obj.title as objective_title
FROM okr_team_key_results kr
JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
WHERE kr.bu_id = '<BU_ID>'
  AND kr.team_id = '<TEAM_ID>'
  AND kr.deleted_at IS NULL
ORDER BY kr.created_at DESC;
    `,
    indexes_used: ["okr_team_key_results_bu_id_team_id_idx"],
  },
  {
    name: "okrs_checkins",
    module: "okrs",
    description: "Check-ins for a KR",
    sql: `
SELECT 
  c.id, c.date, c.previous_value, c.current_value,
  c.confidence, c.blockers, c.comments, c.user_id, c.created_at
FROM okr_checkins c
WHERE c.kr_id = '<KR_ID>'
ORDER BY c.date DESC
LIMIT 20;
    `,
    indexes_used: ["okr_checkins_kr_id_date_idx"],
  },

  // ========== ASSETS ==========
  {
    name: "assets_inventory_list",
    module: "assets",
    description: "Asset inventory list with filters",
    sql: `
SELECT 
  a.id, a.name, a.internal_code, a.status, a.brand, a.model,
  a.current_holder_type, a.current_user_id, a.current_location_id,
  c.name as category_name,
  l.name as location_name
FROM asset_inventory a
LEFT JOIN asset_categories c ON c.id = a.category_id
LEFT JOIN bu_locations l ON l.id = a.home_location_id
WHERE a.bu_id = '<BU_ID>'
  AND a.deleted_at IS NULL
ORDER BY a.updated_at DESC
LIMIT 50;
    `,
    indexes_used: ["asset_inventory_bu_id_status_idx", "asset_inventory_bu_id_internal_code_idx"],
  },
  {
    name: "assets_movements",
    module: "assets",
    description: "Movements for an asset",
    sql: `
SELECT 
  m.id, m.movement_type, m.occurred_at, m.notes,
  m.from_holder_type, m.from_user_id, m.from_location_id,
  m.to_holder_type, m.to_user_id, m.to_location_id,
  m.performed_by_user_id
FROM asset_movements m
WHERE m.asset_id = '<ASSET_ID>'
ORDER BY m.occurred_at DESC
LIMIT 20;
    `,
    indexes_used: ["asset_movements_asset_id_occurred_at_idx"],
  },

  // ========== KPIS ==========
  {
    name: "kpis_list",
    module: "kpis",
    description: "KPI metrics list",
    sql: `
SELECT 
  k.id, k.name, k.description, k.category, k.unit, k.direction,
  k.frequency, k.target_value, k.status, k.is_global,
  k.team_id, k.owner_user_id,
  (
    SELECT v.value 
    FROM kpi_values v 
    WHERE v.kpi_id = k.id 
    ORDER BY v.reference_date DESC 
    LIMIT 1
  ) as latest_value
FROM kpi_metrics k
WHERE k.bu_id = '<BU_ID>'
  AND k.deleted_at IS NULL
  AND k.status = 'active'
ORDER BY k.name ASC;
    `,
    indexes_used: ["kpi_metrics_bu_id_status_idx"],
  },
  {
    name: "kpi_values_history",
    module: "kpis",
    description: "KPI value history",
    sql: `
SELECT 
  v.id, v.value, v.reference_date, v.source, v.notes, v.created_at
FROM kpi_values v
WHERE v.kpi_id = '<KPI_ID>'
ORDER BY v.reference_date DESC
LIMIT 30;
    `,
    indexes_used: ["kpi_values_kpi_id_reference_date_idx"],
  },

  // ========== GLOBAL SEARCH ==========
  {
    name: "search_profiles",
    module: "search",
    description: "Search profiles by name/email",
    sql: `
SELECT 
  id, first_name, last_name, display_name, job_title, work_email
FROM profiles
WHERE bu_id = '<BU_ID>'
  AND employment_status = 'active'
  AND deleted_at IS NULL
  AND (
    first_name ILIKE '%<QUERY>%' OR
    last_name ILIKE '%<QUERY>%' OR
    display_name ILIKE '%<QUERY>%' OR
    work_email ILIKE '%<QUERY>%'
  )
LIMIT 5;
    `,
    indexes_used: ["profiles_bu_id_idx", "profiles_search_trgm_idx (recommended)"],
  },
  {
    name: "search_assets",
    module: "search",
    description: "Search assets by name/code",
    sql: `
SELECT 
  id, name, internal_code, brand, model, status
FROM asset_inventory
WHERE bu_id = '<BU_ID>'
  AND deleted_at IS NULL
  AND (
    name ILIKE '%<QUERY>%' OR
    internal_code ILIKE '%<QUERY>%' OR
    brand ILIKE '%<QUERY>%' OR
    model ILIKE '%<QUERY>%'
  )
LIMIT 5;
    `,
    indexes_used: ["asset_inventory_bu_id_idx", "asset_inventory_search_trgm_idx (recommended)"],
  },

  // ========== NOTIFICATIONS ==========
  {
    name: "notifications_unread",
    module: "notifications",
    description: "Unread notifications for user",
    sql: `
SELECT 
  id, type, title, message, context_type, context_id, context_url,
  actor_id, created_at
FROM notifications
WHERE user_id = '<USER_ID>'
  AND bu_id = '<BU_ID>'
  AND is_read = false
ORDER BY created_at DESC
LIMIT 20;
    `,
    indexes_used: ["notifications_user_id_is_read_idx", "notifications_bu_id_user_id_idx"],
  },
];

function generateExplainScript(): string {
  const lines: string[] = [
    "-- ============================================================",
    "-- Query Profiling Script",
    "-- Generated: " + new Date().toISOString(),
    "-- ",
    "-- Instructions:",
    "-- 1. Replace <BU_ID>, <USER_ID>, <TEAM_ID>, etc. with real UUIDs",
    "-- 2. Run in Supabase SQL Editor or psql",
    "-- 3. Analyze the query plans for performance issues",
    "-- ============================================================",
    "",
  ];

  for (const query of CRITICAL_QUERIES) {
    lines.push(`-- ============================================================`);
    lines.push(`-- ${query.module.toUpperCase()}: ${query.name}`);
    lines.push(`-- ${query.description}`);
    lines.push(`-- Expected indexes: ${query.indexes_used.join(", ")}`);
    lines.push(`-- ============================================================`);
    lines.push("");
    lines.push(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)`);
    lines.push(query.sql.trim());
    lines.push(";");
    lines.push("");
    lines.push("");
  }

  return lines.join("\n");
}

function generateSummaryReport(): string {
  const byModule = CRITICAL_QUERIES.reduce((acc, q) => {
    if (!acc[q.module]) acc[q.module] = [];
    acc[q.module].push(q);
    return acc;
  }, {} as Record<string, QueryProfile[]>);

  return `# Query Profiling Guide

Generated: ${new Date().toISOString()}

## Overview

This document lists the critical queries that should be profiled for performance optimization.

## Queries by Module

${Object.entries(byModule)
  .map(
    ([module, queries]) => `
### ${module.charAt(0).toUpperCase() + module.slice(1)}

| Query | Description | Expected Indexes |
|-------|-------------|------------------|
${queries.map((q) => `| ${q.name} | ${q.description} | ${q.indexes_used.join(", ")} |`).join("\n")}
`
  )
  .join("\n")}

## How to Run

1. Open the SQL file at \`docs/perf/explain/queries.sql\`
2. Replace placeholder values:
   - \`<BU_ID>\` - A valid Business Unit UUID
   - \`<USER_ID>\` - A valid User UUID
   - \`<TEAM_ID>\` - A valid Team UUID
   - \`<TICKET_ID>\` - A valid Ticket UUID
   - \`<KR_ID>\` - A valid Key Result UUID
   - \`<ASSET_ID>\` - A valid Asset UUID
   - \`<KPI_ID>\` - A valid KPI UUID
   - \`<QUERY>\` - A search term
3. Run in Supabase SQL Editor or psql
4. Analyze the EXPLAIN output for:
   - Sequential scans on large tables (should use Index Scan)
   - High row estimates
   - Slow operations

## Interpreting Results

### Good Signs
- \`Index Scan\` or \`Index Only Scan\` on filtered columns
- Low \`actual rows\` matching \`rows estimated\`
- Fast execution time

### Warning Signs
- \`Seq Scan\` on large tables
- High \`Buffers: shared read\` (cache misses)
- \`Hash Join\` or \`Nested Loop\` on large sets
- Execution time > 100ms for simple queries
`;
}

function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║              QUERY PROFILING SCRIPT                            ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const outputDir = path.join(process.cwd(), "docs", "perf", "explain");
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate SQL file
  const sqlPath = path.join(outputDir, "queries.sql");
  fs.writeFileSync(sqlPath, generateExplainScript());
  console.log(`✅ Generated: ${sqlPath}`);

  // Generate summary report
  const summaryPath = path.join(outputDir, "README.md");
  fs.writeFileSync(summaryPath, generateSummaryReport());
  console.log(`✅ Generated: ${summaryPath}`);

  console.log(`\n📊 Total queries profiled: ${CRITICAL_QUERIES.length}`);
  console.log("\n💡 Next steps:");
  console.log("   1. Edit queries.sql and replace placeholder UUIDs");
  console.log("   2. Run in Supabase SQL Editor");
  console.log("   3. Save outputs to docs/perf/explain/results/");
  console.log("");
}

main();
