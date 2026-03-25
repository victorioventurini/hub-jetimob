

# Plano de Testes Completos — Módulo OKRs e Wizards

## Contexto

O projeto tem **547 testes passando** (0 falhas) e boa cobertura em utils (`progressCalculation`, `krValidation`, `linkingRules`, `healthScore`). Porém, há lacunas significativas:

**Já coberto (não reimplementar):**
- `progressCalculation.ts` — 15 testes (up, down, maintain, >100%, baseline zero, aggregated, nullable)
- `krValidation.ts` — 22 testes (title, values, metrics, types, placeholders)
- `linkingRules.ts` — 27 testes (objective→objective, kr→kr, kr→objective, limits)
- `healthScore.ts` — 20 testes (6 fatores, health levels, config)

**Lacunas identificadas (o que falta):**
- `calculateKrState()` — **0 testes** (8 estados, priorização, filtering)
- `analyzePace()` — **0 testes** (pace analysis, cycle elapsed, tolerance)
- `useGenericWizardDraft` — **0 testes de integração** (draft persistence, clearDraft, session creation)
- `useCreateTeamOkrBundle` — **0 testes** (atomic creation, rollback)
- `useOkrMutations` — testes existentes são apenas type-checks, sem integration real
- Wizard E2E — apenas redirect tests, nenhum fluxo funcional
- Edge functions — **0 testes**

**Correções ao documento do Claude:**
- `okr_wizard_session_drafts` não existe — usar `okr_wizard_sessions`
- `validateKrValues` não valida "rejeita KR sem título" nem "sem meta" (essas são responsabilidades de formulário)
- `analyzePace` usa tolerância de 10% por padrão, não ±10% exato
- O campo `qbr_status` tem valores `open`, `collecting`, `reviewing`, `ready`, `done`, `closed` — o Claude omitiu `reviewing` e `ready`
- `calculateKrState` verifica `stagnant` ANTES de `at_risk` (prioridade correta)
- Os E2E de edge functions não são viáveis no Lovable (sem `supabase start`)

---

## Plano de Implementação (6 fases)

### Fase 1 — Testes unitários: `calculateKrState` e `analyzePace`
**Prioridade:** Alta | **Estimativa:** ~2 mensagens

**Arquivo:** `src/modules/okrs/hooks/__tests__/useKrStateInsights.test.ts`

Testes para `calculateKrState()`:
- 8 estados: not_started, healthy, stagnant, at_risk, off_track, achieved, exceeded, not_achieved
- Precedência: stagnant > at_risk quando daysSinceCheckin >= 14
- Ciclo encerrado: estados finais (exceeded/achieved/not_achieved)
- Gap > 15% com expectedProgress → at_risk
- RAG red → off_track, RAG yellow → at_risk

Testes para funções utilitárias:
- `sortByStatePriority`: critical → warning → info
- `filterKrsRequiringAttention`: stagnant, at_risk, off_track, not_achieved
- `filterKrsForCelebration`: achieved, exceeded
- `groupKrStatesBySeverity`: agrupamento correto
- `getKrStateConfig`: retorna config completa por estado

**Arquivo:** `src/modules/okrs/utils/__tests__/analyzePace.test.ts`

Testes para `analyzePace()`:
- above_pace quando gap >= tolerância (+10%)
- on_pace quando gap entre -10% e +10%
- below_pace quando gap <= -10%
- completed quando progress >= 100%
- not_started quando progress = 0 e ciclo > 10% transcorrido
- Início do ciclo (<=15%): sempre retorna on_pace (sem julgamentos precipitados)
- `calculateExpectedProgress`: antes/durante/após ciclo
- `calculateCycleElapsed`: cálculo correto
- `getPaceInterpretationText`: texto correto por status

### Fase 2 — Testes de integração: hooks de mutação
**Prioridade:** Alta | **Estimativa:** ~2 mensagens

**Arquivo:** `src/modules/okrs/hooks/__tests__/useOkrMutations.integration.test.ts`

Refatorar testes existentes (type-only) para integration com MSW:
- `createObjective`: insert com bu_id explícito, owner_user_id = profileId
- `updateObjective`: invalidação de queryKeys
- `deleteObjective`: soft delete (deleted_at, não físico)
- `createKeyResult`: owner_user_id = profileId
- `deleteKeyResult`: soft delete com cancelled_at

**Arquivo:** `src/modules/okrs/hooks/__tests__/useCreateCheckin.integration.test.ts`

Expandir testes existentes (apenas helpers) com:
- Criação de check-in com valor, confiança, bloqueios
- user_id do check-in usa profileId

**Arquivo:** `src/modules/okrs/hooks/__tests__/useGenericWizardDraft.test.ts`

- Draft key único por tipo de wizard
- `clearDraft()` retorna sessionId
- Registro `completed` em okr_wizard_sessions ao concluir
- Draft keys isolados: `qbr-pre:{cycleId}:{teamId}` não conflita com `team-okr-creation:{teamId}`
- Rascunho recuperado ao reabrir wizard

### Fase 3 — Test factories e fixtures
**Prioridade:** Média | **Estimativa:** ~1 mensagem

**Arquivo:** `src/test/factories/okr.factory.ts`

Criar factories com dados realistas:
- `createTestCycle` (com qbr_status)
- `createTestObjective` (com owner_user_id = profileId, deleted_at, cancelled_at)
- `createTestKeyResult` (com type, direction, unit)
- `createTestKpi` (com scope, lifecycle_status)
- `createTestWizardSession` (com wizard_type, reflection_data, summary_sent_at)
- `createTestCheckin`

Atualizar `src/test/mocks/fixtures/okrs.ts` com novos fixtures alinhados às factories.

### Fase 4 — Testes de componentes de wizard (unitários)
**Prioridade:** Média | **Estimativa:** ~3 mensagens

Expandir testes existentes (que são majoritariamente interface/prop checks) com renderização real:

- **Collaborator Check-in steps:** KrStateInsightCard presente, gate de check-in
- **Team Check-in steps:** gate de KRs revisadas, DecisionCard com profileId
- **MBR steps:** snapshot imutável, governance checklist, feedback
- **QBR steps:** QbrOkrProposalStep inline, calibration flags, approval workflow
- **Shared components:** WizardStepScaffold, navigation gates

### Fase 5 — Testes de permissão e RLS (unitários)
**Prioridade:** Média | **Estimativa:** ~1 mensagem

**Arquivo:** `src/modules/okrs/hooks/__tests__/permissions.test.ts`

- `useCanEditKr`: false para não-owner e não-líder
- `useCanManageTeamOkr`: true apenas para líder ou BU Admin
- `useCanEditInitiative`: ownership validation
- `useCanEditTeamObjective`: ownership + leadership check

**Arquivo:** `src/hooks/__tests__/useBuScope.test.ts`

- Queries incluem `.eq('bu_id', currentBuId)`
- `useBuScopedSupabase()` injeta header x-current-bu-id
- Global client não é usado em módulos operacionais

### Fase 6 — E2E: fluxos críticos
**Prioridade:** Baixa (requer auth mock funcional) | **Estimativa:** ~2 mensagens

Expandir `e2e/okr-wizards.spec.ts` e `e2e/okrs.spec.ts`:
- Wizard redirects (já existem, manter)
- Dashboard OKR: filtros, visualização por role
- Ritual History: deep-link, filtros por tipo

**Nota:** E2E completos de wizards e edge functions requerem auth mockada e banco local, que não estão disponíveis no ambiente Lovable. Os testes E2E serão focados em navegação e presença de UI.

---

## Fora de escopo (com justificativa)

| Item do Claude | Razão |
|---|---|
| Testes de edge functions com `supabase functions serve` | Ambiente Lovable não suporta `supabase start` |
| Testes de RLS com banco real | Requer Supabase local |
| CI pipeline YAML completo | Já existe `.github/workflows/test.yml` funcional |
| `npm run compliance` script | Não existe no projeto e é ortogonal aos testes |
| Scripts `package.json` adicionais | Já existem `test`, `test:unit` equivalentes |

---

## Resumo de entregáveis

| Fase | Arquivos | Testes estimados |
|------|----------|-----------------|
| 1 — KrState + Pace | 2 arquivos novos | ~35 testes |
| 2 — Hooks integration | 3 arquivos novos | ~25 testes |
| 3 — Factories | 1 arquivo novo + 1 atualizado | 0 (infra) |
| 4 — Wizard components | 4-6 arquivos atualizados | ~40 testes |
| 5 — Permissions | 2 arquivos novos | ~15 testes |
| 6 — E2E | 2 arquivos atualizados | ~10 testes |
| **Total** | **~15 arquivos** | **~125 novos testes** |

Meta final: **670+ testes** (de 547 atuais), mantendo 100% pass rate.

