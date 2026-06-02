# Alinhar % de atingimento das OKRs no MBR Executive Report

> Pré-checklist consultado: `docs/canonical/core/INDEX.md`, `docs/canonical/modules/okrs.md`, `mem://features/okrs/okrs-master-standard`, `mem://features/kpis/kpis-master-standard`, `mem://backend/edge-function-standard-v4`.

## Diagnóstico

O % de atingimento exibido em `/okrs/executive/mbr-report` diverge de `/okrs/` por **4 violações canônicas** na edge function `mbr-executive-report`:

1. **Fórmula duplicada e divergente** — `extractors.ts::calculateKrProgress` é uma reimplementação local que não segue a Progress Canon (`mem://features/okrs/okrs-master-standard`):
   - Aplica `Math.round` e arredonda antes da agregação (canônico não arredonda na função base; só na exibição).
   - Não trata `direction = "maintain"` (binário).
   - Não normaliza unidade (`%` etc.) como `progressCalculation.ts::normalizeProgressInputs`.
   - Não conhece a tolerância de 15% nem o "sem clamp superior" (156% é resultado válido — `prompts.ts` já cita isso, mas a função clipa indiretamente ao tratar baseline=target).
2. **Agregação por bucket, não por objetivo** — `buildTeamHealthSummary` só conta KRs em `achieved/onTrack/atRisk/offTrack`. A página `/okrs/` (`useCompanyOkrs`) calcula: progresso do objetivo = média das KRs; progresso geral = média dos objetivos. O LLM recebe só os baldes e **inventa** o %.
3. **Ignora Primary KPI como fonte da KR** — Core Rule: *"Primary KPIs dictate KR progress automatically"*. A edge usa `kr.current_value` cru; quando há KPI primária, o valor autoritativo é a última leitura da KPI (`calculateKrProgressFromKpi`).
4. **Status RAG não canônico** — usa `kr.status` direto; canônico exige `getEffectiveKrRagStatus` + `mapRagToCalculated` (evita "Não iniciada" indevida quando há check-in/KPI).

## Mudanças

### 1. `supabase/functions/mbr-executive-report/extractors.ts`
- Reescrever `calculateKrProgress` espelhando bit-a-bit `calculateProgress` de `src/modules/okrs/utils/progressCalculation.ts`:
  - Normalizar unidade.
  - Tratar `direction === "maintain"` (binário).
  - **Sem clamp superior** (manter 156% etc.); manter apenas `Math.max(0, x)`.
  - **Não arredondar** na função base; arredondar só ao montar `OVERALL_ACHIEVEMENT` final.
- Helper `resolveKrCurrentValue(kr)` que prefere o valor da KPI primária (carregado pelo data-loader) sobre `kr.current_value`.
- Helper `resolveKrRagStatus(kr, progress, cycleProgress)` espelhando `getEffectiveKrRagStatus` (RAG 🟢≥70% · 🟡40–70% · 🔴<40% · ⚪ sem progresso, em relação ao progresso esperado do ciclo).
- Novo `buildObjectiveAggregates(teamObjectives)` retornando:
  - `byObjective: [{ id, title, teamName, progress, krCount }]`
  - `byTeam: [{ teamId, teamName, progress, objectivesCount, krCount }]`
  - `overallProgress` (média de objetivos, igual a `useCompanyOkrs`).
- `buildTeamHealthSummary` continua existindo (buckets para narrativa qualitativa), mas passa a usar a fórmula canônica e o status efetivo.

### 2. `supabase/functions/mbr-executive-report/data-loader.ts`
- Garantir SELECT explícito (sem `*`) das colunas necessárias em `okr_*_key_results`: `id, title, baseline, current_value, target, direction, unit, status, primary_kpi_id, deleted_at, cancelled_at`.
- Carregar a última leitura de KPI primária por KR até `monthEndIso` (Promise.all conforme `mem://backend/edge-function-performance-standard`) e anexar como `effectiveCurrentValue` ao KR.

### 3. `supabase/functions/mbr-executive-report/prompts.ts`
- Adicionar bloco `OVERALL_ACHIEVEMENT` com `overallProgress`, `byTeam`, `byObjective` (números já calculados).
- Instrução firme: *"Use EXATAMENTE os valores de OVERALL_ACHIEVEMENT ao citar % de atingimento; nunca recalcule."*
- Manter o lembrete de que 100%+ é válido.

### 4. `supabase/functions/mbr-executive-report/types.ts`
- Estender `ReportResponse` (e `ParsedReport` se necessário) com `overallAchievement: { overallProgress, byTeam, byObjective }`.

### 5. `supabase/functions/mbr-executive-report/index.ts`
- Chamar os novos agregadores, logar `overallProgress` + `byTeam.length` + `byObjective.length`, propagar em `ReportResponse`.

### 6. `src/modules/okrs/hooks/useMbrExecutiveReport.ts`
- Tipar e expor `overallAchievement` em `MbrExecutiveReportData`.

### 7. `src/modules/okrs/pages/MbrExecutiveReportPage.tsx`
- Renderizar o % de atingimento (hero/sumário) a partir de `overallAchievement.overallProgress` (determinístico), não do texto do LLM.
- Quebra por time reaproveitando componente existente (`ProgressSummary` ou similar — sem duplicar).

## Detalhes técnicos

- Edge function não pode importar de `src/`. Replicar a Progress Canon em um helper interno, com comentário apontando para `src/modules/okrs/utils/progressCalculation.ts` como SSOT.
- Agregação (igual a `useCompanyOkrs`):
  - `objectiveProgress = mean(KR.progress)` (filtrar `deleted_at`/`cancelled_at` conforme Core Rule de soft delete).
  - `teamProgress = mean(objectiveProgress do time)`.
  - `overallProgress = mean(objectiveProgress de todos os objetivos do ciclo)`.
- Nenhuma alteração de schema/RLS; tudo derivado.

## Fora de escopo
- Wizard MBR-pré.
- QBR Executive Report (validar separadamente; mesma classe de bug provável).
- Refatorar `useCompanyOkrs` (já é a fonte canônica).

## Validação
1. `/okrs/?cycle=8fd8d5fa-...` — anotar % geral e por time.
2. `/okrs/executive/mbr-report?cycle=8fd8d5fa-...` — após implantação, conferir que o número bate.
3. Logs da edge: `overallProgress=X` deve coincidir com o da página de OKRs.
