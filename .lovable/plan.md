# MBR Executive Report

Criar um relatório executivo mensal análogo ao QBR Executive Report, gerado por IA a partir dos snapshots do **MBR-pré** preenchidos pelos líderes + KPIs do mês de referência + decisões do ciclo. Reutiliza toda a estrutura existente (edge function multi-seção, página com seleção de ciclo/mês, renderização em seções, persistência em `okr_wizard_sessions`).

## Escopo

**Dentro:**
- Edge function `mbr-executive-report` (espelho de `qbr-executive-report`, adaptada ao recorte mensal).
- Página `/okrs/executive/mbr-report` com seletor de **mês de referência** (em vez de quarter).
- Hook `useMbrExecutiveReport` espelhando `useQbrExecutiveReport`.
- Persistência como sessão `wizard_type='mbr-executive-report'` em `okr_wizard_sessions`.
- Acessível a toda a BU (mesma regra do QBR Executive Report — `OkrRoute` sem `requiresBuAdmin`).
- Reaproveitar `KpiEvolutionSection`, `OrgOkrsReportSection`, `CriticalKpiComparison` (componentes data-driven, agnósticos de cadência).

**Fora:**
- Alterar o wizard MBR-pré em si.
- Mudar schema de tabelas (apenas inserir sessões no `okr_wizard_sessions` já existente).
- Mexer no QBR Executive Report.
- Cron/automação — o relatório é gerado on-demand (botão "Gerar relatório"), como o QBR.

## Estrutura do relatório (adaptada ao recorte mensal)

| Seção | QBR (referência) | MBR (adaptado) |
|---|---|---|
| 1. Narrativa | "O que o quarter nos disse" | **"O que o mês nos disse"** — leitura do mês de referência (saúde de OKRs, entregas, ritmo, ofensores) |
| 2. OKRs Org | `OrgOkrsReportSection` | mesmo componente, recorte do ciclo trimestral ativo (MBR é dentro de um quarter) |
| 3. Próximos passos / ajustes | "Propostas para o próximo ciclo" | **"Compromissos e ajustes para o próximo mês"** — agregando `nextSteps` dos MBR-pré |
| 4. Sinais de KPIs | healthy / atRisk / critical | mesmo schema, mas **ancorado no mês de referência** via `classifyKpiGateBucketsFromMonthlySnapshots` (consistente com Pré-MBR v3.30.0) |
| 5. KPI Evolution | `KpiEvolutionSection` | mesmo componente |
| 6. Decisões pendentes | extraídas de rituais do quarter | extraídas dos MBR-pré + MBR meeting do mês |

`teamProposals` do QBR vira `teamCommitments` no MBR (lista de times × próximos passos / highlights do mês).

## Fontes de dados (edge function)

`data-loader.ts` carrega para o mês N do ciclo trimestral ativo:
- `cycles` — ciclo trimestral atual (MBR vive dentro de quarter).
- `okr_wizard_sessions` onde `wizard_type='mbr-pre'`, `bu_id`, `cycle_id`, `status='completed'`, filtradas por mês de referência (`reflection_data->>'referenceMonth'` ou data de conclusão).
- `okr_wizard_sessions` onde `wizard_type='mbr'` do mesmo mês (se já existir).
- `kpi_values` consolidados do mês de referência (via `useMbrPreTeamKpisMonthly`-equivalente server-side, ou snapshot já gravado no MBR-pré).
- `objectives` org-level do ciclo trimestral.
- Sessões com decisões do mês (mbr-pre + mbr).

`extractors.ts` reaproveita lógica do QBR, com 2 novos:
- `extractMonthlyHighlights(mbrPreSessions, teamsMap)` — agrega `highlights` de cada MBR-pré por time.
- `extractTeamCommitments(mbrPreSessions, teamsMap)` — agrega `nextSteps` por time.

`prompts.ts`:
- `MBR_EXEC_SYSTEM_PROMPT` — adaptação do QBR (mesmo tom executivo, foco no recorte mensal e em "como chegamos ao fechamento do mês N do quarter X").
- `buildMbrExecUserPrompt` recebe `monthLabel`, `cycleName`, `teamHealthSummary`, `kpisSummary`, `monthlyHighlights`, `teamCommitments`, `pendingDecisions`, `orgObjectivesSummary`.

## Estrutura técnica

```text
supabase/functions/mbr-executive-report/
  index.ts            # handler (espelho do QBR)
  data-loader.ts      # loadCycle + loadMbrReportData
  extractors.ts       # reutiliza utilitários do QBR + 2 novos
  prompts.ts          # MBR_EXEC_SYSTEM_PROMPT + builder
  types.ts            # ReportRequest, ReportResponse, ParsedReport

src/modules/okrs/
  hooks/useMbrExecutiveReport.ts      # espelho de useQbrExecutiveReport
  pages/MbrExecutiveReportPage.tsx    # espelho de QbrExecutiveReportPage com seletor de mês
  components/mbr-report/
    MonthSelector.tsx                 # seletor mês ref dentro do quarter ativo
    (reutiliza KpiEvolutionSection, OrgOkrsReportSection, CriticalKpiComparison via re-export)

src/routes/okrs.routes.tsx
  + <Route path="/okrs/executive/mbr-report" element={<OkrRoute><MbrExecutiveReportPage /></OkrRoute>} />

src/lib/queryKeys/okrs.ts
  + mbrExecutiveReport(buId, cycleId, monthRef)

src/modules/okrs/constants/ritualWizardTypes.ts
  + 'mbr-executive-report' como wizard_type não-padrão (mesma pegada do qbr-executive-report)
```

Persistência: `okr_wizard_sessions` com `wizard_type='mbr-executive-report'`, `cycle_id=<quarter>`, `reflection_data={ monthRef, ...reportData }`, `structure_version='v1'`. Consulta busca o snapshot mais recente para o par `(cycleId, monthRef)`.

## LLM

- Modelo padrão: `google/gemini-3-flash-preview` (mesmo do QBR).
- `tryParseAiJson` para parsing seguro.
- Mesma tratativa de 429/402 → toasts no client.
- Saída JSON com schema:
  ```json
  { "monthNarrative": "...", "commitmentsAnalysis": "...",
    "kpiInsights": { "healthy": "...", "atRisk": "...", "critical": "..." },
    "decisionsNeeded": ["..."] }
  ```

## Navegação

- Adicionar entrada "Relatório Executivo de MBR" no menu/dashboard executivo (`ExecutiveDashboardPage`), ao lado do link do QBR Executive Report.

## Validação

- Gera relatório para mês com pelo menos 1 MBR-pré submetido → seções preenchidas, sem React #31.
- Mês sem MBR-pré → empty state coerente ("Nenhum líder submeteu MBR-pré para este mês ainda").
- BU isolation: edge function via `requireBu`, página via `useBuScopedSupabase`.
- Regenerar grava nova sessão e atualiza `generatedAt`.
- Bucket de KPIs reflete o mês de referência (não contamina meses futuros) — consistente com correção v3.30.0 do Pré-MBR.

## Pontos abertos

1. **Recorte do mês de referência:** usar `monthRef` (`YYYY-MM`) derivado da `reflection_data` dos MBR-prés submetidos, ou ler de uma fonte canônica (ex: `cycles.current_mbr_month`)? Preciso confirmar onde o MBR-pré atual guarda essa âncora — vou inspecionar antes de implementar e ajustar `data-loader.ts`.
2. **Acesso:** confirmar se "todos da BU" também vale para o MBR (espelhando QBR) ou se prefere restringir a líderes/`bu_admin`.
