
# Plano: Melhorias MBR v1.2

## Análise de Delta (o que JÁ existe vs. o que falta)

### ✅ JÁ IMPLEMENTADO — Sem ação necessária:
1. **MBR Pre Step 1 (Balance)** — reutiliza `QbrBalanceStep` que **já inclui** `KrLinkedDetails` (iniciativas + projetos por KR) e `UnlinkedProjectsList` (projetos sem OKR). **Nenhuma alteração necessária.**
2. **MBR Step 4 (Análise por Time)** — **já inclui** `KrLinkedDetails` por KR, `ProjectsSummary` ao final, e `AddendumBadge` para adendos do mbr-pre. **Nenhuma alteração necessária.**
3. **MBR Step 7 (QBR Follow-up)** — já detecta itens vencidos com `isPast()` e exibe badge "vencido". **Necessita apenas melhorias visuais.**

---

### 🔧 DELTA — 5 alterações a implementar:

#### 1. `MbrPreNextStepsStep.tsx` — Bloco de projetos em andamento
- Adicionar bloco read-only **antes** do campo "foco principal"
- Usa `useProjectsForWizard(teamId)` (existente) — precisa receber `teamId` como nova prop
- Exibe projetos com status `in_progress` ou health `at_risk`
- Cada projeto: `ProjectHealthBadge` + nome + progresso + próximo milestone com data
- **Prop nova:** `teamId: string`
- **Impacto no MbrPrePage.tsx:** passar `teamId={teamIdParam}` ao componente

#### 2. `MbrPanoramaStep.tsx` — Scorecard + OKRs org + Agenda
- Inserir 3 blocos **antes** do conteúdo de KPIs existente:
  - **Bloco 1 — Scorecard:** 4 metric cards (on track / at risk / off track / sem pré-MBR). Props novas: `scorecardMetrics: { healthy, atRisk, offTrack, noSubmission }`
  - **Bloco 2 — OKRs org:** Cards colapsáveis com KRs e contribuições por time. Props novas: `orgObjectives: OrgObjectiveWithKrs[]`
  - **Bloco 3 — Agenda:** Lista visual dos 8 steps do MBR com indicador de step atual. Props novas: `currentStepIndex: number`
- **Padrão:** Reutilizar exatamente a UI do `QbrMeetingOpeningStep` (scorecard cards, collapsible org OKRs, agenda)
- **Impacto no MbrPage.tsx:** Calcular `scorecardMetrics` via `teamOkrSnapshots` + `calculateKrState`, passar `orgObjectives` via `useAllOrgObjectivesView`, passar `currentStepIndex: 0`

#### 3. `MbrOrgOkrsStep.tsx` — Contribuição dos times por KR org
- Dentro de cada KR org, após `OkrProgressBar`, adicionar lista de times contribuindo via `linked_org_kr_id`
- Usa `useAllOrgObjectivesView(year, cycleId)` — os dados de contribuição vêm agregados nesse hook
- KR org sem time contribuindo: badge vermelho "Sem cobertura"
- **Props novas:** `orgObjectives: OrgObjectiveWithKrs[]` (dados live, não snapshot)
- **Impacto no MbrPage.tsx:** passar dados do hook já existente

#### 4. `MbrQbrFollowUpStep.tsx` — Alertas visuais por urgência + contador no header
- **Header:** Adicionar contador "⚠️ N decisões vencidas · N vence esta semana" na description do `WizardStepHeader`
- **Items vencidos:** Borda vermelha + badge "Vencida há N dias", ordenados no topo
- **Items vencendo em 7 dias:** Borda âmbar + badge "Vence em N dias"
- **Estado positivo:** Se tudo resolvido, exibir "✅ Todas as decisões do QBR anterior foram resolvidas."
- **Sem novas props** — tudo calculável dos dados existentes

#### 5. `MbrClosingStep.tsx` — Resumo de governança + checklist dinâmico
- **Resumo:** Antes do checklist, exibir contadores (KPIs com decisão, times revisados, decisões com dono, OKRs org sem cobertura)
- **Checklist dinâmico:** Substituir 4 itens estáticos por 6 itens condicionais:
  - `kpiGateClear` — habilitado quando existem decisões do sourceStep `panorama` ou `kpi-gate`
  - `allTeamsReviewed` — habilitado quando todos os times estão `reviewed`
  - `orgOkrsVerified` — habilitado quando todas OKRs org têm `remainsStrategicPriority` definido
  - `decisionsHaveOwner` — habilitado quando decisões do step `decisions` têm owner
  - `qbrFollowUpAddressed` — habilitado quando itens vencidos do QBR foram resolvidos/escalados
  - `nextMbrScheduled` — checkbox livre
- **Props novas:** `teamOkrSnapshots`, `orgOkrSnapshots`, `qbrFollowUpItems`
- **Tipo `MbrGovernanceChecklist`:** Expandir com os novos campos
- **Impacto no MbrPage.tsx:** Passar as novas props e atualizar DEFAULT_DATA

---

## Arquivos impactados (em ordem de execução)

| # | Arquivo | Tipo |
|---|---------|------|
| 1 | `src/modules/okrs/types/wizard.ts` | Expandir `MbrGovernanceChecklist` |
| 2 | `src/modules/okrs/components/wizards/mbr-pre/MbrPreNextStepsStep.tsx` | Bloco de projetos |
| 3 | `src/modules/okrs/components/wizards/mbr/MbrPanoramaStep.tsx` | Scorecard + OKRs org + Agenda |
| 4 | `src/modules/okrs/components/wizards/mbr/MbrOrgOkrsStep.tsx` | Contribuições por KR org |
| 5 | `src/modules/okrs/components/wizards/mbr/MbrQbrFollowUpStep.tsx` | Alertas visuais |
| 6 | `src/modules/okrs/components/wizards/mbr/MbrClosingStep.tsx` | Resumo + checklist dinâmico |
| 7 | `src/modules/okrs/pages/MbrPrePage.tsx` | Passar `teamId` ao NextSteps |
| 8 | `src/modules/okrs/pages/MbrPage.tsx` | Calcular métricas, passar novas props |
| 9 | `src/modules/okrs/components/wizards/mbr/__tests__/*` | Atualizar testes |

## O que NÃO muda
- `QbrBalanceStep` (já tem KrLinkedDetails + UnlinkedProjectsList)
- `MbrTeamOkrsDetailStep` (já tem KrLinkedDetails + ProjectsSummary + AddendumBadge)
- Lógica de gates de navegação existente
- Snapshots `reflection_data` — sem novos campos de input
- Lógica do KPI Gate Step 2
