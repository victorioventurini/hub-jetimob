/**
 * regen-canonical-docs.ts
 *
 * Orquestrador que regenera todos os docs canônicos derivados do banco.
 * Roda os geradores específicos em sequência.
 *
 * Uso:
 *   DATABASE_URL=... npx tsx scripts/regen-canonical-docs.ts
 *   ou
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/regen-canonical-docs.ts
 *
 * Docs regenerados (atualmente):
 *   - docs/canonical/DATA_MODEL_REGISTRY.md (+ .json)  via generate-data-model-registry.ts
 *
 * TODO (futuro — gerar a partir do banco):
 *   - DB_FUNCTIONS_INDEX.md   (pg_proc + descrições)
 *   - DB_VIEWS_INDEX.md       (pg_views + colunas)
 *   - RBAC_TEMPLATES_V3.md    (permission_templates + permission_template_keys)
 *
 * @version 1.0.0
 */

import { execSync } from "node:child_process";

const STEPS: Array<{ name: string; cmd: string; required?: boolean }> = [
  {
    name: "Data Model Registry",
    cmd: "npx tsx scripts/generate-data-model-registry.ts",
    required: true,
  },
  // Adicionar futuros geradores aqui:
  // { name: "DB Functions Index", cmd: "npx tsx scripts/generate-db-functions-index.ts" },
  // { name: "DB Views Index",     cmd: "npx tsx scripts/generate-db-views-index.ts" },
  // { name: "RBAC Templates",     cmd: "npx tsx scripts/generate-rbac-templates.ts" },
];

function log(prefix: string, msg: string) {
  console.log(`[regen-canonical] ${prefix} ${msg}`);
}

async function main() {
  const results: Array<{ name: string; ok: boolean; error?: string }> = [];

  for (const step of STEPS) {
    log("▶", `${step.name} — ${step.cmd}`);
    try {
      execSync(step.cmd, { stdio: "inherit" });
      results.push({ name: step.name, ok: true });
      log("✓", `${step.name} OK`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name: step.name, ok: false, error: msg });
      log("✗", `${step.name} FAIL: ${msg}`);
      if (step.required) {
        log("!", "Etapa obrigatória falhou — abortando.");
        process.exit(1);
      }
    }
  }

  console.log("\n=== Resumo ===");
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.error ? ` — ${r.error}` : ""}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[regen-canonical] erro fatal:", err);
  process.exit(1);
});
