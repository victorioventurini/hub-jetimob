## Problema

Na rota `/rituals/mbr-pre?team=…&step=opening`, o card **"Análise IA do mês"** é gerado a partir de dados que **não refletem o mês de referência** (ex.: abril) nem necessariamente os KPIs do time selecionado:

1. **KPIs sem ancoragem temporal.** Os `kpiSnapshots` enviados à edge function `mbr-pre-month-analysis` vêm do draft, populado pelo step "Indicadores do Time" (`MbrPreKpiGateStep`). Esse step usa `useKpisForWizardV2` que entrega o **estado atual** do KPI (último valor lançado) — `currentValue` não é o valor consolidado de abril e `previousValue` é sempre `null` (`gateItemToSnapshot` força `previousValue: null`). Resultado: a análise da IA fala do "mês" usando números do dia de hoje.

2. **Draft vazio quando o usuário abre direto na Abertura.** `STEP_ORDER` é `data-validation → opening → kpi-analysis → …`. Se o líder cair em `?step=opening` num draft novo, `draft.data.kpiSnapshots = []` e a IA é gerada **sem KPI algum** — só com KRs e projetos atrasados.

3. **Falta dado de "mês anterior" para o comparativo.** O bloco "Comparativo vs mês anterior" e o prompt da IA dependem de `previousValue`, mas hoje ele nunca é populado. A própria UI mostra "Nenhum KPI subiu/caiu este mês" mesmo havendo dados.

KRs (`krFinalStates`) e projetos atrasados (`useMbrPreTeamProjects`) **já estão corretos**: ambos são ancorados no `monthBoundsDate(refMonth)` e filtrados por `team_id`. O problema está restrito ao pipeline de KPIs que abastece a Abertura.

## Solução proposta

Introduzir um snapshot **mensal** de KPIs do time para a Abertura, independente do que o draft acumula no step seguinte. A análise IA passa a consumir esse snapshot ancorado em `referenceMonth`.

### 1. Novo hook `useMbrPreTeamKpisMonthly(teamId, referenceMonth)`

Localização: `src/modules/okrs/hooks/useMbrPreTeamKpisMonthly.ts`

Responsabilidades:
- Buscar KPIs onde `responsible_team_id = teamId` (BU-scoped, soft-delete-aware, sem `select('*')`).
- Para cada KPI, buscar de `kpi_values` o último valor consolidado com `reference_date` dentro de `monthBoundsDate(referenceMonth)` (mês alvo) **e** dentro de `monthBoundsDate(previousMonthOf(referenceMonth))` (mês anterior).
- Devolver `MbrKpiSnapshot[]` com `currentValue` (mês alvo), `previousValue` (mês anterior), `target`, `unit`, `ragStatus` derivado canonicamente, e `name`.
- Usar `mbrKeys.preTeamKpisMonthly(buId, teamId, referenceMonth)` (acrescentar helper em `src/lib/queryKeys/okrs.ts`).
- `staleTime: 5 * 60 * 1000`, `enabled` quando `buSupabase && currentBuId && teamId`.

### 2. `MbrPreOpeningStep` consome o hook em vez do draft

- Substituir a prop `kpiSnapshots` por dados do novo hook (chamado dentro do step usando `teamId` + `referenceMonth` que já recebe).
- Recalcular `stats.kpisAttention/Total` e `kpiDeltas` a partir do snapshot mensal.
- Ao chamar `generate(...)` para a IA, enviar o snapshot mensal (com `previousValue` populado) — não o do draft.
- Mostrar `Skeleton` enquanto o hook está carregando.

### 3. Invalidar análise cacheada quando `referenceMonth` muda

Já existe (`MbrPrePage` faz `updateDraft({ referenceMonth: next, monthAnalysis: null })`). Manter — apenas confirmar que o novo hook re-busca via query key.

### 4. Não alterar o pipeline do KPI Gate (step "Indicadores do Time")

O `MbrPreKpiGateStep` continua produzindo o `draft.data.kpiSnapshots` que alimenta o Resumo/Submissão. Esse snapshot tem outra função (gate de bucket + impactAssessment) e será mantido como SSOT do **gate**, não da **análise IA mensal**.

### 5. Edge function permanece igual

`mbr-pre-month-analysis` já aceita `previousValue`, `currentValue`, `target`, `ragStatus` e calcula `deltaPct` server-side. Nenhuma mudança necessária; ela vai apenas receber dados corretos.

## Aspectos técnicos

- Respeitar **BU isolation** (`bu_id = currentBuId` em todas as queries) — Core memory.
- Usar `useBuScopedSupabase` (não `globalClient`) — Core memory.
- Filtragem `.is('deleted_at', null)` em `kpis` (e `cancelled_at` se aplicável — verificar via `mem://standards/soft-delete-policy-v1`).
- Listar colunas explícitas (proibido `select('*')`).
- Query keys via helper em `src/lib/queryKeys/okrs.ts` (não inline).
- Não introduzir `React.memo` no Opening (não é list/card de alta densidade); seguir `frontend-memoization-standard`.
- Tipagem: reusar `MbrKpiSnapshot` de `@/modules/okrs/types/wizard`.

## Fora de escopo

- Alterar como `MbrPreKpiGateStep` calcula `currentValue` (continua sendo o estado atual — é apropriado para o gate).
- Mudar UI/copy do card de Análise IA.
- Mudar a edge function ou o agente `analista-estrategico`.
- Pré-MBR de outros times além do selecionado pela URL (`?team=`).

## Verificação

1. Abrir `/rituals/mbr-pre?team=<comercial>&step=opening`.
2. Confirmar que o "Resumo de abril" mostra os KPIs do time comercial com valores **de abril**.
3. Comparativo "vs mês anterior" exibe deltas reais (março → abril).
4. Clicar "Gerar análise" e validar que a narrativa cita números do mês de abril (não atuais).
5. Trocar mês de referência via `ReferenceMonthPicker` (se admin) → snapshot e análise são re-buscados/regenerados.
