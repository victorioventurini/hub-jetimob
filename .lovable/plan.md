

# Fase 4 — Testes de Componentes de Wizard + Fase 6 — E2E

## Estado atual

Fases 1, 2, 3 e 5 concluídas. Restam duas fases:

**Fase 4 — Wizard Components:** Os wizards QBR (4 wizards, 19 componentes) têm **zero testes**. C-Level Check-in tem apenas testes de interface (sem renderização real). Os demais wizards (Collaborator, Team, Leader, Managers, MBR) já possuem testes com renderização real.

**Fase 6 — E2E:** Apenas testes de redirect unauthenticated existem. Todos os testes de fluxo são `test.skip`.

---

## Plano de implementação

### Mensagem 1 — QBR Pre + QBR Pre C-Level tests (~20 testes)

**Arquivo:** `src/modules/okrs/components/wizards/qbr-pre/__tests__/QbrBalanceStep.test.tsx`
- Renderiza header com título
- Agrupa KRs por estado (8 estados: not_started → exceeded)
- Exibe badges de estado com contagem correta
- InlineDecisionInput presente para cada KR

**Arquivo:** `src/modules/okrs/components/wizards/qbr-pre/__tests__/QbrKpiAnalysisStep.test.tsx`
- Renderiza KPIs com RAG badges
- Toggle zombie_candidate funciona
- Formulário "KPI a criar" adiciona/remove corretamente
- Botão continuar habilitado

**Arquivo:** `src/modules/okrs/components/wizards/qbr-pre/__tests__/QbrOkrProposalStep.test.tsx`
- 3 sub-steps inline (objective → kr-plan → kr-detail)
- Navegação entre sub-steps
- Limite máximo 3 objetivos enforced
- Draft-only — não persiste no banco

**Arquivo:** `src/modules/okrs/components/wizards/qbr-pre-clevel/__tests__/QbrCLevelSteps.test.tsx`
- SystemReadStep: renderiza com dados consolidados
- StrategicStep: textarea presente
- OkrValidationStep: flags too_conservative, gap, overlap
- DirectivesStep: DecisionCard com categories corretas

### Mensagem 2 — QBR Meeting + QBR Post tests (~18 testes)

**Arquivo:** `src/modules/okrs/components/wizards/qbr-meeting/__tests__/QbrMeetingOkrReviewStep.test.tsx`
- Navegação 1-de-N por time
- 4 status de aprovação (approved, approved_with_changes, discarded, defer)
- Gate: botão continuar desabilitado até todos revisados
- Justificativa obrigatória para discarded

**Arquivo:** `src/modules/okrs/components/wizards/qbr-meeting/__tests__/QbrMeetingSteps.test.tsx`
- OpeningStep: renderiza diretrizes do C-Level
- DecisionsStep: owner e deadline obrigatórios, gate mínimo 1 decisão
- CommitmentsStep: fromTeam/toTeam/deadline
- ClosingStep: GovernanceChecklist 4 itens obrigatórios

**Arquivo:** `src/modules/okrs/components/wizards/qbr-post/__tests__/QbrPostSteps.test.tsx`
- PromotionStep: checkboxes para approved/approved_with_changes, discarded como histórico
- DecisionsStep: complementa decisões do meeting
- CommitmentsStep: cria dependências
- FollowUpStep: decisões marcadas como pauta MBR
- MinutesStep: GovernanceChecklist com nextCycleOkrsActive

### Mensagem 3 — E2E route coverage + C-Level real rendering (~12 testes)

**Arquivo:** `src/modules/okrs/components/wizards/clevel-checkin/CLevelSteps.test.tsx` (reescrita)
- Renderização real dos 4 steps (CompanyOkrs, Insights, Decisions, Directives)
- VicInsightCard mockado mas presente

**Arquivo:** `e2e/okr-wizards.spec.ts` (expandir)
- QBR routes redirect when unauthenticated (4 rotas: qbr-pre, qbr-pre-clevel, qbr, qbr-post)
- MBR route redirect
- C-Level check-in route redirect

**Arquivo:** `e2e/okr-dashboard.spec.ts` (expandir)
- Rotas adicionais: /okrs/ritual-history, /okrs/analysis, /okrs/org-construction-review

---

## Padrão técnico (seguindo MbrKpiGateStep.test.tsx)

Cada teste de componente:
1. Mock `../../shared` com WizardStepHeader/Footer/Scaffold renderizáveis
2. Mock `@/modules/vic/components/AskToVic` quando presente
3. Factory local para criar dados (ex: `createKpi`, `createTeamForReview`)
4. Testa renderização do header, gates de navegação e callbacks

---

## Resumo

| Mensagem | Arquivos | Testes |
|----------|----------|--------|
| 1 — QBR Pre + C-Level Pre | 4 novos | ~20 |
| 2 — QBR Meeting + Post | 3 novos | ~18 |
| 3 — C-Level rewrite + E2E | 1 reescrito + 2 expandidos | ~12 |
| **Total** | **~10 arquivos** | **~50 testes** |

Meta final: **~700+ testes**, 100% pass rate. Completa as Fases 4 e 6, encerrando o roadmap.

