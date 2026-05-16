/**
 * generate-rbac-templates.ts
 *
 * Hybrid generator: preserves manual curation in RBAC_TEMPLATES_V3.md and
 * injects auto-generated authoritative listing between markers:
 *   <!-- @generated:rbac-templates:start -->
 *   <!-- @generated:rbac-templates:end -->
 *
 * Source: permission_templates_v2 + permission_template_items_v2.
 *
 * Usage:
 *   npx tsx scripts/generate-rbac-templates.ts
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";

const DOC_PATH = "docs/canonical/RBAC_TEMPLATES_V3.md";
const START = "<!-- @generated:rbac-templates:start -->";
const END = "<!-- @generated:rbac-templates:end -->";

interface TemplateRow {
  slug: string;
  name: string;
  module: string | null;
  surface: string | null;
  is_system: boolean;
  keys: string[];
}

function psql(sql: string): string {
  const r = spawnSync("psql", ["-tAF", "\u0001", "-v", "ON_ERROR_STOP=1"], {
    input: sql,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
  return r.stdout;
}

function fetchTemplates(): TemplateRow[] {
  const sql = `
    select
      t.slug,
      t.name,
      coalesce(t.module, ''),
      coalesce(t.surface, ''),
      t.is_system,
      coalesce(string_agg(i.permission_key, ',' order by i.permission_key), '')
    from permission_templates_v2 t
    left join permission_template_items_v2 i on i.template_id = t.id
    group by t.slug, t.name, t.module, t.surface, t.is_system
    order by t.module nulls first, t.slug;
  `;
  const out = psql(sql).trim();
  if (!out) return [];
  return out.split("\n").map((line) => {
    const [slug, name, module, surface, is_system, keysCsv] = line.split("\u0001");
    return {
      slug,
      name,
      module: module || null,
      surface: surface || null,
      is_system: is_system === "t" || is_system === "true",
      keys: keysCsv ? keysCsv.split(",").filter(Boolean) : [],
    };
  });
}

function buildAutoBlock(templates: TemplateRow[]): string {
  const lines: string[] = [];
  lines.push(START);
  lines.push("");
  lines.push("<!-- Gerado automaticamente por scripts/generate-rbac-templates.ts — NÃO EDITAR -->");
  lines.push(`> **Gerado em:** ${new Date().toISOString()}`);
  lines.push(`> **Total:** ${templates.length} templates ativos`);
  lines.push("");
  lines.push("### Sumário");
  lines.push("");
  lines.push("| Slug | Nome | Módulo | Surface | System | # Keys |");
  lines.push("|------|------|--------|---------|--------|--------|");
  for (const t of templates) {
    lines.push(
      `| \`${t.slug}\` | ${t.name} | ${t.module || "—"} | ${t.surface || "—"} | ${t.is_system ? "✅" : "❌"} | ${t.keys.length} |`,
    );
  }
  lines.push("");
  lines.push("### Detalhamento por Template");
  lines.push("");
  for (const t of templates) {
    lines.push(`#### \`${t.slug}\` — ${t.name}`);
    lines.push("");
    if (t.keys.length === 0) {
      lines.push("_Sem permission keys associadas._");
    } else {
      for (const k of t.keys) lines.push(`- \`${k}\``);
    }
    lines.push("");
  }
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
  console.log("🔍 Querying permission_templates_v2...");
  const templates = fetchTemplates();
  console.log(`   ${templates.length} templates encontrados`);
  const doc = fs.readFileSync(DOC_PATH, "utf8");
  const block = buildAutoBlock(templates);
  const next = injectOrAppend(doc, block);
  fs.writeFileSync(DOC_PATH, next);
  console.log(`✓ ${DOC_PATH} atualizado`);
}

main();
