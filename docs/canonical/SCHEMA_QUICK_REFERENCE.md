# Schema Quick Reference

**Versão:** 2.0.0 · **Atualizado:** 2026-05-16
**Status:** ⚠️ **Substituído** — listagens de colunas foram removidas.

---

## Fonte da verdade

Para qualquer informação sobre colunas, tipos, nullability e relations:

> **`src/integrations/supabase/types.ts`** (auto-gerado pelo Supabase, sempre atualizado).

Para presença de tabelas, RLS, BU-scoping e descrição:

> **`docs/canonical/DATA_MODEL_REGISTRY.md`** (gerado por `scripts/generate-data-model-registry.ts`).

Para RLS/triggers complexos e schema runtime:

> **MCP Supabase:** `read_query("SELECT ... FROM pg_policies / information_schema.columns WHERE ...")`.

---

## Por que removido

Listagem de colunas em `.md` é **sempre obsoleta** comparada a `types.ts`. Duplicar 500+ linhas era pura sobrecarga de contexto sem ganho — qualquer alteração de schema invalidava o arquivo.

---

## Convenções não-óbvias (mantidas aqui)

Estas regras não aparecem em `types.ts` e precisam ficar documentadas:

| Tabela | Observação |
|---|---|
| `partner_contacts` | ⚠️ Não possui `role` |
| `user_team_memberships` | ⚠️ Não possui `is_active` (usar membership/`deleted_at`) |
| `profiles` | Usa `employment_status` para status — não `is_active` |
| `bu_user_memberships` | Usa `deleted_at` para soft-delete — não `is_active` |
| `project_milestones` | `due_date`, `owner_id`, `notes` são **opcionais** |
| `projects` | `start_date`, `due_date`, `owner_id` são **obrigatórios** (validação frontend Zod) |
| `okr_initiatives`, `project_milestones` | Soft delete apenas via `deleted_at` (não têm `cancelled_at`) |

Identidade `user_id` vs `profile_id`: ver `docs/canonical/IDENTITY_CONVENTION.md`.

Schema de funções/views/enums: `DB_FUNCTIONS_INDEX.md`, `DB_VIEWS_INDEX.md`.
