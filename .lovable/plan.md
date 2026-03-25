

# Fase 3 — Test Factories + Fase 5 — Testes de Permissão

## Status: Em implementação

### Tarefa 1 — `src/test/factories/okr.factory.ts` ✅
Factories centralizadas com IDs determinísticos:
- `createTestObjective`, `createTestKeyResult`, `createTestInitiative`
- `createTestCheckin`, `createTestWizardSession`, `createTestKpi`
- `TEST_IDS` constantes compartilhadas
- `resetFactoryCounters()` para isolamento entre testes

### Tarefa 2 — `src/modules/okrs/hooks/__tests__/permissions.test.ts` ✅
18 testes de permissão cobrindo:
- `useCanEditKr` (6 testes): owner, co-responsible, leader, no-relation, null kr, null profile
- `useCanEditTeamObjective` (4 testes): owner, leader, neither, null
- `useCanEditInitiative` (5 testes): owner, contributor, leader, no-relation, null
- `useCanManageTeamOkr` (4 testes): wildcard, in-list, not-in-list, null
- `useCanManageOrgOkr` (3 testes): wildcard, permission key, no permission

## Próximas fases pendentes
- Fase 4: Testes de componentes de wizard (~40 testes)
- Fase 6: E2E fluxos críticos (~10 testes)
