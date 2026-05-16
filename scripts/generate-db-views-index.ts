/**
 * generate-db-views-index.ts
 *
 * Hybrid generator: preserves manual curation in DB_VIEWS_INDEX.md and
 * injects auto-generated authoritative listing between markers:
 *   <!-- @generated:db-views:start -->
 *   <!-- @generated:db-views:end -->
 *
 * Source: pg_views + information_schema.columns (schema public).
 *
 * Usage:
 *   npx tsx scripts/generate-db-views-index.ts
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";

const DOC_PATH = "docs/canonical/DB_VIEWS_INDEX.md";
const START = "<!-- @generated:db-views:start -->";
const END = "<!-- @generated:db-views:end -->";

interface ViewRow {
  name: string;
  columns: number;
  security_invoker: boolean;
}

function psql(sql: string): string {
  const r = spawnSync("psql", ["-tAF", "\u0001", "-v", "ON_ERROR_STOP=1"], {
    input: sql,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
  return r.stdout;
}

function fetchViews(): ViewRow[] {
  const sql = `
    select
      v.viewname,
      (select count(*) from information_schema.columns c
         where c.table_schema = v.schemaname and c.table_name = v.viewname),
      coalesce((select 'security_invoker=true' = any(c.reloptions)
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = v.schemaname and c.relname = v.viewname), false)
    from pg_views v
    where v.schemaname = 'public'
    order by v.viewname;
  `;
  const out = psql(sql).trim();
  if (!out) return [];
  return out.split("\n").map((line) => {
    const [name, columns, sec] = line.split("\u0001");
    return {
      name,
      columns: Number(columns),
      security_invoker: sec === "t" || sec === "true",
    };
  });
}

function buildAutoBlock(views: ViewRow[]): string {
  const lines: string[] = [];
  lines.push(START);
  lines.push("");
  lines.push("<!-- Gerado automaticamente por scripts/generate-db-views-index.ts — NÃO EDITAR -->");
  lines.push(`> **Gerado em:** ${new Date().toISOString()}`);
  lines.push(`> **Total:** ${views.length} views no schema \`public\``);
  lines.push("");
  lines.push("| View | Colunas | security_invoker |");
  lines.push("|------|---------|------------------|");
  for (const v of views) {
    lines.push(`| \`${v.name}\` | ${v.columns} | ${v.security_invoker ? "✅" : "❌"} |`);
  }
  lines.push("");
  lines.push(END);
  return lines.join("\n");
}

function injectOrAppend(doc: string, block: string): string {
  const startIdx = doc.indexOf(START);
  const endIdx = doc.indexOf(END);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return doc.slice(0, startIdx) + block + doc.slice(endIdx + END.length);
  }
  const appendix =
    "\n\n---\n\n## 🔄 Auto-Generated Reference (do banco)\n\n" + block + "\n";
  return doc.replace(/\s+$/, "") + appendix;
}

function main() {
  if (!fs.existsSync(DOC_PATH)) {
    console.error(`✗ ${DOC_PATH} não existe`);
    process.exit(1);
  }
  console.log("🔍 Querying pg_views...");
  const views = fetchViews();
  console.log(`   ${views.length} views encontradas`);
  const doc = fs.readFileSync(DOC_PATH, "utf8");
  const block = buildAutoBlock(views);
  const next = injectOrAppend(doc, block);
  fs.writeFileSync(DOC_PATH, next);
  console.log(`✓ ${DOC_PATH} atualizado`);
}

main();
