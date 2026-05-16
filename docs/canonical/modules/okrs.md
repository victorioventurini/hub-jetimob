# Módulo OKRs — Canonical

**Slug:** `okrs` · **Status:** ✅ Ativo
**Master/SSOT:** `mem://features/okrs/okrs-master-standard`
**Governança de ciclos:** `mem://features/okrs/cycles-and-rituals-master`

> Detalhes completos (RLS, status, progresso, metodologia, drafts, wizards) estão no Master. Este arquivo cobre apenas o que é **operacional/UI**.

## Tabelas principais

`okr_org_objectives`, `okr_org_key_results`, `okr_team_objectives`, `okr_team_key_results`, `okr_checkins`, `okr_initiatives`, `cycles`.

⚠️ **Soft delete `okr_initiatives`:** filtrar SÓ `deleted_at` (não tem `cancelled_at`).

Schema completo: `src/integrations/supabase/types.ts`.

## Limites de negócio

- Máximo **4 objetivos ativos** por time
- Máximo **4 KRs** por objetivo
- Validados via triggers no banco

## Cálculo de progresso

```ts
// src/modules/okrs/utils/calculateProgress.ts
function calculateProgress(baseline, current, target, direction) {
  if (baseline === target) return current >= target ? 100 : 0;
  return direction === 'up'
    ? ((current - baseline) / (target - baseline)) * 100
    : ((baseline - current) / (baseline - target)) * 100;
}
```

## RAG (semáforo)

🟢 ≥70% do esperado · 🟡 40-70% · 🔴 <40% · ⚪ sem progresso.

## Tipos de KR

| Tipo | Contribui para KR Org? |
|---|---|
| `contribution` | ✅ |
| `enabler` | ❌ não diretamente |
| `foundational` | ❌ nunca |

## Owner de KRs

`okr_org_key_results.owner_user_id` e `okr_team_key_results.owner_user_id` → FK para `profiles.id`. Joins via `okr_org_key_results_owner_profile_fkey` / `okr_team_key_results_owner_profile_fkey` (já configurados em `OKR_FIELDS` no `useOkrQueries.ts`).

## Primary KPIs ditam KR

Quando um KR está atrelado a um KPI primário, o input manual é **bloqueado**: o valor vem do KPI. Inputs de KPI são restritos a datas passadas. Ver `mem://features/kpis/kpis-master-standard`.

## Wizards / Rituais

10 wizards full-page (Collaborator/Team/Managers/C-Level Check-in, Pré-Weekly, Weekly, MBR, QBR Pre/C-Level/Meeting/Post, QBR Executive Report).
**Framework:** `@/wizards-framework` (versionamento estrutural por sessão).

Detalhes: `modules/rituals.md`, `mem://features/rituals/rituals-master-standard`, `mem://features/rituals/qbr-master-standard`, `mem://architecture/wizards/wizards-master-standard`.

## Collaborator Check-in — Filtro de KRs

`useUserKrsForWizard` retorna KRs onde o effective user é: owner OU co-responsável OU owner de iniciativa vinculada.

## Permissões

Permission keys: `okrs.org_objective.*`, `okrs.team_objective.*`, `okrs.key_result.*`, `okrs.checkin.*`, `okrs.initiative.*`, `okrs.cycle.manage:bu`. Templates: ver `RBAC_TEMPLATES_V3.md`.

## Páginas principais

`/okrs` (dashboard), `/okrs/org/:id`, `/okrs/team/:id`, `/okrs/org/kr/:id`, `/okrs/team/kr/:id`, `/okrs/executive/qbr-report`.

## Referências

- Master: `mem://features/okrs/okrs-master-standard`
- Ciclos: `mem://features/okrs/cycles-and-rituals-master`
- KPI ↔ KR: `modules/kpis.md`
- Wizards: `mem://architecture/wizards/wizards-master-standard`
