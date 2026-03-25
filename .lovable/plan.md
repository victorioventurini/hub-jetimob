

# Fase 3 — Test Factories + Fase 5 — Testes de Permissão

## Status atual

- **Fase 1:** Done (79 testes — calculateKrState + analyzePace) — requirement status needs update to `done`
- **Fase 2:** Done (52 testes — hooks de mutação)
- **Fases 3, 4, 5, 6:** Pendentes

A Fase 3 (factories) e Fase 5 (permissões) são independentes e podem ser implementadas juntas. A Fase 4 (wizard components) é a mais extensa e fica para a sequência.

---

## O que já existe em fixtures

`src/test/mocks/fixtures/okrs.ts` já tem:
- `createMockKr`, `createMockInitiative`, `createMockCycle` — para testes de cálculo/health
- `FIXTURES` com cenários pré-definidos (healthy, at_risk, stale, etc.)

**Falta:** factories para Objectives, WizardSessions, KPIs, Check-ins, e dados com campos de identidade (`bu_id`, `owner_user_id`, `team_id`).

---

## Plano de implementação

### Tarefa 1 — Expandir factories (`src/test/factories/okr.factory.ts`)

Criar arquivo com factories centralizadas usando IDs determinísticos (não `faker`, que não está no projeto):

- `createTestObjective(overrides?)` — com `bu_id`, `owner_user_id` (profileId), `deleted_at: null`, `cancelled_at: null`, `status: 'active'`
- `createTestKeyResult(overrides?)` — com `type`, `direction`, `unit`, `co_responsibles`, `deleted_at: null`, `cancelled_at: null`
- `createTestKpi(overrides?)` — com `scope`, `lifecycle_status`, `owner_user_id`, `responsible_area_id`
- `createTestWizardSession(overrides?)` — com `wizard_type`, `reflection_data`, `summary_sent_at`, `status`
- `createTestCheckin(overrides?)` — com `kr_id`, `user_id` (profileId), `confidence`
- `createTestCycle(overrides?)` — extend existente com `qbr_status` field

Reutiliza `createMockKr` e `createMockCycle` do fixtures existente onde aplicável.

**~0 testes (infraestrutura), 1 arquivo novo**

### Tarefa 2 — Testes de permissão (`src/modules/okrs/hooks/__tests__/permissions.test.ts`)

Hooks a testar (todos são hooks puros com `useMemo`, dependem de `useManageableTeams` e `useProfileId`):

**`useCanEditKr`:**
- `canEdit = true` quando profileId === kr.owner_user_id
- `canEdit = true` quando profileId está em kr.co_responsibles[]
- `canEdit = true` quando canManageTeamOkr (líder do time)
- `canEdit = false` quando profileId não é owner, co-responsável, nem líder
- `canEdit = false` quando kr é null/undefined
- `canEdit = false` quando profileId é null

**`useCanManageTeamOkr`:**
- `canManage = true` quando isWildcard (admin)
- `canManage = true` quando teamId está em teams gerenciáveis
- `canManage = false` quando teamId não está na lista
- `canManage = false` quando teamId é null

**`useCanManageOrgOkr`:**
- `canManage = true` quando isWildcard
- `canManage = true` quando has('okrs.org_objective.update:bu')
- `canManage = false` caso contrário

**`useCanEditTeamObjective`:**
- `canEdit = true` quando owner
- `canEdit = true` quando líder do time
- `canEdit = false` quando nem owner nem líder

**`useCanEditInitiative`:**
- `canEdit = true` quando owner da iniciativa
- `canEdit = true` quando líder do time

Mocks: `vi.mock` de `useManageableTeams`, `useProfileId`, `usePermissions`

**~18 testes, 1 arquivo novo**

### Tarefa 3 — Atualizar roadmap

- Fase 1 requirement → `done`
- Criar e completar tarefas

---

## Resumo

| Tarefa | Arquivo | Testes |
|--------|---------|--------|
| Factories | `src/test/factories/okr.factory.ts` | 0 (infra) |
| Permissões | `hooks/__tests__/permissions.test.ts` | ~18 |
| **Total** | **2 arquivos novos** | **~18 testes** |

Meta pós-implementação: **~600+ testes**, mantendo 100% pass rate. Após isso, restam Fase 4 (wizard components, ~40 testes) e Fase 6 (E2E, ~10 testes).

