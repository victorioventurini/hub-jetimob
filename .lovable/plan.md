## Objetivo

Garantir que o **% de atingimento das OKRs** seja idêntico em toda a plataforma — mesma fórmula, mesma agregação, mesmo override por KPI primária — onde quer que apareça: página `/okrs`, **MBR Executive Report** (já alinhado), **QBR Executive Report**, e todos os ritos sob `/rituals` (MBR-Pré, MBR, QBR-Pré, QBR-Pré C-Level, QBR-Meeting, QBR-Post, Weekly, Team Check-in, C-Level Check-in, Leader Prep, Construction Review, Org Health Review).

## Diagnóstico (divergências encontradas)

| Local | Problema |
|---|---|
| `supabase/functions/qbr-executive-report/extractors.ts` | `calculateKrProgress` com clamp 0–100, sem unit, sem `maintain`. Não usa KPI primária. Sem `buildOverallAchievement` determinístico (LLM gera o %). |
| `supabase/functions/_shared/hub-tools.ts` (l.715) | `calculateProgress` duplicado, clamp 0–100, sem unit, sem `maintain`. Usado pelas hub-tools dos agentes (qbr/mbr/weekly opening, learnings, etc.). |
| `supabase/functions/okr-org-health-review/index.ts` | Recebe `progress` do caller; depende da fonte que o invoca (risco de divergência). |
| `supabase/functions/mbr-summary/index.ts` | Idem (recebe `o.progress`). |
| `supabase/functions/qbr-pre-summary`, `qbr-post-summary`, `qbr-meeting-summary`, `qbr-clevel-learnings-summary`, `mbr-curate-opening`, `mbr-pre-month-analysis`, `weekly-curate-opening` | Não recalculam progresso; consomem o que vem do payload/hub-tools — herdam o bug do `hub-tools.ts`. |
| `src/modules/okrs/components/OrgObjectiveCard.tsx`, `TeamObjectiveCard.tsx`, `KrHistoryDialog.tsx`, `cycle-checkins/CycleCheckinsEvolution.tsx` | Cálculo inline ad-hoc (sem unit, sem `maintain`, sem KPI primária). |

## Estratégia

Criar um único módulo canônico para edge functions, espelhando `src/modules/okrs/utils/progressCalculation.ts`, e refatorar todos os pontos acima para consumi-lo. Para o frontend, substituir formulações inline por `calculateProgress`.

## Mudanças

### 1. Canon compartilhado em edge functions
**Novo:** `supabase/functions/_shared/okr-progress.ts`
- Porta exata de `calculateProgress`, `calculateAggregatedProgress`, `calculateProgressFromNullable` e `calculateProgressRagStatus` do canon do frontend.
- Suporte a `unit` (R$, R$ mil, R$ milhão), `direction: 'up' | 'down' | 'maintain'`, sem upper clamp.
- Helper `resolveKrCurrentValue(kr)` priorizando `effective_current_value` (KPI primária) sobre `current_value` — extraído do que já existe em `mbr-executive-report/extractors.ts`.
- Helper `buildOverallAchievement(teamObjectives, { rounding })` retornando `{ overallProgress, byTeam, byObjective }` — média de objetivos como `useCompanyOkrs`.

### 2. QBR Executive Report
**`supabase/functions/qbr-executive-report/data-loader.ts`**
- SELECT explícito de `id, title, baseline, current_value, target, direction, unit, status, primary_kpi_id, deleted_at, cancelled_at` em KRs.
- Carregar valores de KPI primária por KR (mesma rotina já feita no MBR — `loadPrimaryKpiValuesForKrs`), tornando `effective_current_value` disponível.

**`supabase/functions/qbr-executive-report/extractors.ts`**
- Remover `calculateKrProgress` local.
- Importar do `_shared/okr-progress.ts`.
- `buildTeamHealthSummary` passa a usar canon + `resolveKrCurrentValue` + `getEffectiveKrRagStatus` (RAG 🟢≥70 / 🟡40–70 / 🔴<40, considerando ritmo do ciclo).
- Adicionar `buildOverallAchievement` agregando por objetivo → time → org.

**`supabase/functions/qbr-executive-report/types.ts`**
- Estender `ReportResponse` com `overallAchievement`.

**`supabase/functions/qbr-executive-report/prompts.ts`**
- Bloco `OVERALL_ACHIEVEMENT` (mesma abordagem do MBR) com números pré-calculados e instrução "use exatamente estes valores".

**`supabase/functions/qbr-executive-report/index.ts`**
- Chamar agregador, logar `overallProgress` e contagens.

**`src/modules/okrs/hooks/useQbrExecutiveReport*` + página `QbrExecutiveReportPage` (ou equivalente em `executive-quarter-review`)**
- Tipar e expor `overallAchievement`.
- Renderizar card determinístico "% de atingimento das OKRs" (overall + tabela por time), espelhando o que já existe no MBR.

### 3. Hub tools (afeta todos os ritos)
**`supabase/functions/_shared/hub-tools.ts`**
- Remover `calculateProgress` local.
- Substituir por import do `_shared/okr-progress.ts`.
- Ao buscar KRs em hub-tools (linha ~359), passar `unit` e respeitar `maintain`.
- Quando KR tiver `primary_kpi_id`, resolver valor via KPI primária antes de calcular.

Impacto direto (sem editar cada função): `qbr-pre-summary`, `qbr-post-summary`, `qbr-meeting-summary`, `qbr-clevel-learnings-summary`, `mbr-curate-opening`, `mbr-pre-month-analysis`, `weekly-curate-opening`, `okr-construction-review`, `okr-org-health-review` (quando usam hub-tools).

### 4. okr-org-health-review e mbr-summary
- Não recalculam, recebem do caller. Auditar `src/modules/okrs/hooks/useOkrOrgHealthReview.ts` e `useMbrSummary*` para garantir que enviam `progress` calculado via `calculateProgress` (canon), nunca via fórmula inline.

### 5. Componentes frontend com cálculo inline
Substituir formulações ad-hoc por `calculateProgress` (com `unit`):
- `src/modules/okrs/components/OrgObjectiveCard.tsx` (l.65–68)
- `src/modules/okrs/components/TeamObjectiveCard.tsx` (l.100–103)
- `src/modules/okrs/components/KrHistoryDialog.tsx` (l.82)
- `src/modules/okrs/components/cycle-checkins/CycleCheckinsEvolution.tsx` (l.180, 256)

### 6. Wizards de ritos (`/rituals`)
- Verificar que `MbrOrgOkrsStep`, `MbrTeamOkrsDetailStep`, `MbrPanoramaStep`, `QbrCLevelQuarterBalanceStep`, `QbrCLevelSystemReadStep`, `QbrMeetingOpeningStep`, `TeamKrReviewStep`, `KrContextCard`, `CheckinProgressBlock`, `AiInsightsCard` e `OrgOkrsReportSection` estão consumindo `calculateProgress` (ou um hook que o use) e não duplicando lógica. Onde houver duplicação, substituir.
- `useCompanyOkrs` permanece a fonte de agregação org-level no frontend.

## Fora de escopo
- Refatoração do `useCompanyOkrs` (já canônico).
- Mudanças no cálculo de KPI attainment (`KpiEvolutionSection`) — domínio distinto.
- Alteração de RAG thresholds.

## Validação
Para o ciclo `8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3`:
1. Abrir `/okrs/?cycle=...` → registrar `overallProgress` por time + org.
2. Abrir `/okrs/executive/mbr-report?cycle=...` → conferir igualdade (já alinhado).
3. Abrir QBR Executive Report do mesmo ciclo → conferir igualdade.
4. Abrir wizards de Weekly, MBR-Pré, MBR, QBR-Pré, QBR-Meeting de um time → conferir que % por KR/objetivo bate com `/okrs/`.
5. Rodar `src/modules/okrs/utils/progressCalculation.test.ts` e adicionar casos para o novo `_shared/okr-progress.ts` (mesmos asserts).
