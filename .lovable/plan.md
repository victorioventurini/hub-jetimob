## Diagnóstico — temas do MBR-pré x MBR Executive Report

A função `mbr-executive-report` hoje consome apenas **3 sub-objetos** do `reflection_data` do MBR-pré:

| Campo MBR-pré (`MbrPreDraftData`) | Step do wizard | Hoje vai pro relatório? |
|---|---|---|
| `highlights` (accelerated/blocked/needsDecision) | Highlights | ✅ via `extractMonthlyHighlights` |
| `nextSteps` (focus/prioritizedItems/crossDependencies) | NextSteps | ✅ via `extractTeamCommitments` |
| `decisions[]` | (transversal) | ✅ via `extractDecisions` |
| **`projectJustifications.projects` / `.milestones`** | **MbrPreProjectsStep** | ❌ **IGNORADO** |
| **`krJustifications` (KRs fora da meta)** | KrAnalysisStep | ❌ IGNORADO |
| **`krFinalStates[]` (estado final dos KRs)** | KrAnalysisStep | ❌ IGNORADO (só usa KRs vindos do banco) |
| **`kpiSnapshots[]` (com impactAssessment)** | KpiGateStep | ❌ IGNORADO |
| **`kpiJustifications` (RAG ≠ verde)** | KpiGateStep | ❌ IGNORADO |
| **`kpiNoDataReasons`** | KpiGateStep | ❌ IGNORADO |
| **`kpisToCreate[]`** | KpiGateStep | ❌ IGNORADO |
| **`monthAnalysis` (análise IA na abertura)** | OpeningStep | ❌ IGNORADO |
| **`agendaSuggestions[]`** | (transversal) | ❌ IGNORADO |

Resumo: o relatório atualmente cobre **destaques, compromissos e decisões**, mas perde toda a camada **reflexiva/de justificativas** (KPIs, KRs e projetos) e a **análise IA do mês** que o próprio líder revisou.

## Objetivo
Garantir cobertura completa dos temas do MBR-pré no relatório executivo, com destaque para **Projetos** (lacuna mais visível) e **justificativas** (KPI/KR), sem inflar o JSON do LLM.

## Mudanças

### 1. `supabase/functions/mbr-executive-report/extractors.ts`
Adicionar 5 novos extratores puros (mesmo padrão dos existentes):

- `extractProjectIssues(sessions, teams)` → por time, lista `{projectsLate, milestonesLate}` com a justificativa do líder (a partir de `projectJustifications.projects` e `.milestones`).
- `extractKrIssues(sessions, teams)` → KRs com `krJustifications` preenchido (RAG vermelho/amarelo), com texto da justificativa e — quando disponível em `krFinalStates` — `finalProgress` e `paceStatus`.
- `extractKpiIssues(sessions, teams)` → KPIs com `kpiJustifications` ou `kpiNoDataReasons`, normalizados em uma única lista `{teamName, kpiId, kind: 'justified'|'no_data', text}`.
- `extractKpisToCreate(sessions, teams)` → sugestões de novos KPIs (até 10).
- `extractAgendaSuggestions(sessions, teams)` → sugestões de pauta para o MBR (top 10 por prioridade).
- `extractMonthAnalyses(sessions, teams)` → resumo curto da `monthAnalysis` de cada time (summary + offenders/risks/recommendations).

### 2. `supabase/functions/mbr-executive-report/data-loader.ts`
Nenhuma mudança de query — todos os campos novos já vêm em `reflection_data`.

### 3. `supabase/functions/mbr-executive-report/prompts.ts`
- Incluir as novas seções no `buildMbrExecUserPrompt` (cada bloco com `.slice(0, 15)` para conter o payload).
- Estender o JSON de saída com novos campos:
  ```json
  {
    "monthNarrative": "...",
    "commitmentsAnalysis": "...",
    "kpiInsights": {...},
    "decisionsNeeded": [...],
    "projectsAnalysis": "parágrafo 3-5 linhas sobre projetos/milestones em atraso, citando justificativas recorrentes",
    "krIssuesAnalysis": "parágrafo 3-5 linhas sobre KRs fora da meta e padrões nas justificativas",
    "leaderSignals": "parágrafo 2-4 linhas consolidando o que os líderes pediram (pauta + KPIs a criar + sinais da monthAnalysis)"
  }
  ```
- Reforçar instrução: "Use SEMPRE as justificativas dos líderes — não invente causa quando houver texto declarado."

### 4. `supabase/functions/mbr-executive-report/types.ts`
- Adicionar `projectsAnalysis?`, `krIssuesAnalysis?`, `leaderSignals?` em `ParsedReport` e `ReportResponse`.
- Adicionar contagens brutas em `ReportResponse` para a UI: `projectIssuesCount`, `krIssuesCount`, `kpiIssuesCount`, `kpisToCreateCount`, `agendaSuggestionsCount` (para badges/skeletons).
- Persistir também os arrays crus de `projectIssues`, `krIssues`, `kpiIssues`, `kpisToCreate`, `agendaSuggestions` para a UI listar (sem depender só do parágrafo do LLM).

### 5. `supabase/functions/mbr-executive-report/index.ts`
- Chamar os novos extratores e passar pro prompt.
- Logar contagens (`projects=X, krIssues=Y, kpiIssues=Z, kpisToCreate=W, agenda=K, monthAnalyses=M`).
- Compor `ReportResponse` final com os novos campos.

### 6. `src/modules/okrs/hooks/useMbrExecutiveReport.ts`
- Estender `MbrExecutiveReportData` com os novos campos textuais + arrays crus.
- Normalizar via `toText` / `toStringArray` com fallback seguro.

### 7. `src/modules/okrs/pages/MbrExecutiveReportPage.tsx`
Adicionar 3 novas seções, reaproveitando os componentes existentes (`Card`, `Badge`, `ProjectHealthBadge` onde fizer sentido):

- **"Projetos do mês"** — narrativa `projectsAnalysis` + lista compacta de projetos/milestones com justificativa (agrupados por time).
- **"KRs fora da meta"** — narrativa `krIssuesAnalysis` + lista de KRs com justificativa do líder.
- **"Sinais dos líderes"** — narrativa `leaderSignals` + chips com sugestões de pauta e KPIs a criar.

Reordenar o layout para que **Projetos** apareça logo após o bloco de KPIs (para resolver o feedback do usuário).

### 8. `SourceChecklist` na mesma página
Acrescentar bullets:
- "Projetos e milestones em atraso justificados pelos líderes"
- "KRs fora da meta com justificativa do time"
- "Sugestões de pauta e KPIs a criar para o próximo mês"

## Fora de escopo
- Mudar o wizard MBR-pré
- Esquema do banco (todos os dados já vivem em `reflection_data`)
- QBR Executive Report (mantido como está; pode ganhar paridade num passo seguinte)
- Cache/edge function bumps de versão (só se quebrar parsing de snapshots antigos — não quebra, pois novos campos são opcionais).

## Validação
1. Abrir `/okrs/executive/mbr-report?cycle=8fd8d5fa-...` mês 2026-05.
2. Confirmar nos logs da edge function: `projects=X, krIssues=Y, kpiIssues=Z` > 0 dado que há 6 times com submissões.
3. Confirmar visualmente as 3 novas seções com dados reais.
