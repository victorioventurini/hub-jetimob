#!/usr/bin/env -S bun run
/**
 * scripts/audit-kpi-frequency-migration.ts
 *
 * Auditoria pós-migração v3.0.0 (split `consolidation_frequency` × `update_frequency`).
 *
 * Uso (requer PG* env vars do Supabase):
 *   bun run scripts/audit-kpi-frequency-migration.ts > /tmp/report.md
 *
 * Valida:
 * 1. Total de KPIs ativos por estado de migração.
 * 2. KPIs com `frequency NOT NULL` mas sem migração (deve ser 0).
 * 3. KPIs com `consolidation_frequency IS NULL` (ex-`manual` órfãos).
 * 4. Distribuição por par (consolidation, update).
 * 5. `kpi_values.input_type` consolidado vs projeção.
 * 6. Pendentes de revisão por BU.
 */

import { Client } from "pg";

const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function q<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const r = await client.query(sql);
  return r.rows as T[];
}

async function main() {
  await client.connect();

  const overview = await q(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE frequency_migration_reviewed)::int AS reviewed,
      COUNT(*) FILTER (WHERE NOT frequency_migration_reviewed)::int AS pending,
      COUNT(*) FILTER (WHERE consolidation_frequency IS NULL)::int AS missing_consolidation,
      COUNT(*) FILTER (WHERE update_frequency IS NULL)::int AS missing_update,
      COUNT(*) FILTER (WHERE frequency IS NOT NULL AND consolidation_frequency IS NULL)::int AS legacy_unmigrated
    FROM kpi_metrics WHERE deleted_at IS NULL AND status = 'active';
  `);

  const distribution = await q(`
    SELECT consolidation_frequency::text AS cons, update_frequency::text AS upd, COUNT(*)::int AS n
    FROM kpi_metrics WHERE deleted_at IS NULL AND status='active'
    GROUP BY 1,2 ORDER BY 1,2;
  `);

  const values = await q(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE input_type = 'consolidated')::int AS consolidated,
      COUNT(*) FILTER (WHERE input_type = 'projection')::int AS projection
    FROM kpi_values;
  `);

  const byBu = await q(`
    SELECT bu_id::text, COUNT(*) FILTER (WHERE NOT frequency_migration_reviewed)::int AS pending
    FROM kpi_metrics WHERE deleted_at IS NULL AND status='active'
    GROUP BY bu_id HAVING COUNT(*) FILTER (WHERE NOT frequency_migration_reviewed) > 0
    ORDER BY pending DESC;
  `);

  const date = new Date().toISOString().slice(0, 10);
  const o = overview[0] as Record<string, number>;
  const v = values[0] as Record<string, number>;

  console.log(`# KPI Frequency Migration — Audit Report\n`);
  console.log(`**Data:** ${date}\n**Versão:** v3.0.0\n\n---\n`);
  console.log(`## 1. Visão geral\n`);
  console.log(`| Métrica | Valor |\n|---|---:|`);
  console.log(`| Total de KPIs ativos | ${o.total} |`);
  console.log(`| Revisados | ${o.reviewed} |`);
  console.log(`| Pendentes | ${o.pending} |`);
  console.log(`| Sem consolidation | ${o.missing_consolidation} |`);
  console.log(`| Sem update | ${o.missing_update} |`);
  console.log(`| Legacy não migrado | ${o.legacy_unmigrated} |\n`);

  console.log(`## 2. Distribuição\n\n| consolidation | update | KPIs |\n|---|---|---:|`);
  for (const r of distribution as Array<{ cons: string; upd: string; n: number }>) {
    console.log(`| ${r.cons} | ${r.upd} | ${r.n} |`);
  }

  console.log(`\n## 3. kpi_values\n\n| Tipo | N |\n|---|---:|`);
  console.log(`| consolidated | ${v.consolidated} |`);
  console.log(`| projection | ${v.projection} |`);
  console.log(`| **Total** | ${v.total} |\n`);

  console.log(`## 4. Pendentes por BU\n\n| bu_id | Pendentes |\n|---|---:|`);
  for (const r of byBu as Array<{ bu_id: string; pending: number }>) {
    console.log(`| ${r.bu_id} | ${r.pending} |`);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
