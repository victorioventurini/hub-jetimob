/**
 * generate-db-functions-index.ts
 *
 * Hybrid generator: preserves manual curation in DB_FUNCTIONS_INDEX.md and
 * injects an auto-generated authoritative listing between markers:
 *   <!-- @generated:db-functions:start -->
 *   <!-- @generated:db-functions:end -->
 *
 * If markers are absent, appends a new "## 🔄 Auto-Generated Reference" section.
 *
 * Source: pg_proc (schema public).
 * Requires: PG* env vars (PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT) OR DATABASE_URL.
 *
 * Usage:
 *   npx tsx scripts/generate-db-functions-index.ts
 */
import { execSync } from "node:child_process";
import * as fs from "node:fs";

const DOC_PATH = "docs/canonical/DB_FUNCTIONS_INDEX.md";
const START = "<!-- @generated:db-functions:start -->";
const END = "<!-- @generated:db-functions:end -->";

interface FnRow {
  name: string;
  args: string;
  returns: string;
  security: string;
  volatility: string;
}

function psql(sql: string): string {
  return execSync(`psql -tAF '\u0001' -c ${JSON.stringify(sql)}`, {
    encoding: "utf8",
  });
}

function fetchFunctions(): FnRow[] {
  const sql = `
    select
      p.proname,
      pg_get_function_identity_arguments(p.oid),
      pg_get_function_result(p.oid),
      case when p.prosecdef then 'DEFINER' else 'INVOKER' end,
      case p.provolatile when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
    order by p.proname, pg_get_function_identity_arguments(p.oid);
  `;
  const out = psql(sql).trim();
  if (!out) return [];
  return out.split("\n").map((line) => {
    const [name, args, returns, security, volatility] = line.split("\u0001");
    return { name, args, returns, security, volatility };
  });
}

function buildAutoBlock(fns: FnRow[]): string {
  const lines: string[] = [];
  lines.push(START);
  lines.push("");
  lines.push("<!-- Gerado automaticamente por scripts/generate-db-functions-index.ts — NÃO EDITAR -->");
  lines.push(`> **Gerado em:** ${new Date().toISOString()}`);
  lines.push(`> **Total:** ${fns.length} funções no schema \`public\``);
  lines.push("");
  lines.push("| Função | Argumentos | Retorno | Security | Volatility |");
  lines.push("|--------|------------|---------|----------|------------|");
  for (const f of fns) {
    const args = f.args ? `\`${f.args}\`` : "—";
    lines.push(
      `| \`${f.name}\` | ${args} | \`${f.returns}\` | ${f.security} | ${f.volatility} |`,
    );
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
  console.log("🔍 Querying pg_proc...");
  const fns = fetchFunctions();
  console.log(`   ${fns.length} funções encontradas`);
  const doc = fs.readFileSync(DOC_PATH, "utf8");
  const block = buildAutoBlock(fns);
  const next = injectOrAppend(doc, block);
  fs.writeFileSync(DOC_PATH, next);
  console.log(`✓ ${DOC_PATH} atualizado`);
}

main();
