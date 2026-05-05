# Plano — MBR · KPI Deep Dive (1 página por KPI fora da meta)

## Contexto / TCR (pré-checklist)

- Consultei TCR §4.8.1 (Princípio #4 — variação por config; agnostic `wizardType`) e `mem://architecture/wizards/wizards-master-standard`.
- O Pré-MBR já usa o **`KpiGateStep` canônico** do framework (`@/wizards-framework`) em `cardVariant: 'rich-paginated'` via `MbrPreKpiGateStep` — mesma UI desejada.
- `useMbrPreSubmissions(referenceMonth)` já entrega, por time:
  `kpiSnapshots[].impactAssessment`, `kpiJustifications`, `kpiNoDataReasons`, `decisions` (com `metadata.kpi_id`).
- O step atual `kpi-gate` (`MbrKpiGateStep`) é o **overview executivo** (KPIs Globais + Área). Mantemos como está.
- Sem novas tabelas, sem migrações, sem alterações de RLS. Sem mudanças no Pré-MBR.

## O que fazer

Inserir uma nova etapa `kpi-deep-dive` **logo após `kpi-gate`** no MBR. Lista apenas KPIs `red`/`amber` (fora da meta) e renderiza **um KPI por página**, com a mesma UI do Pré-MBR (gráfico + bloco do líder), em **modo somente-leitura** consolidando o que cada líder respondeu no Pré-MBR daquele mês.

### Estrutura da página (por KPI)

```
[ KpiSparkline + valores + badges ]   ← reaproveitado do KpiGateStep rich
─────────────────────────────────
[ Justificativa do líder (Pré-MBR) ]  ← read-only, por time
[ Razão sem dados (se overdue) ]      ← read-only, por time
[ Plano de ação registrado no Pré-MBR ] ← decisões com metadata.kpi_id, por time
```

Quando o KPI é `org`/`area` e múltiplos times responderam, agrupa as respostas por nome do time (mesma área visual do `KpiMonthlyComparisonCard`).

## Arquivos

### Criar

1. `src/modules/okrs/components/wizards/shared/KpiLeaderInsightsPanel.tsx`
   - Componente shared, **somente leitura**, recebe `kpiId` + `entriesByTeam: { teamId, teamName, justification?, noDataReason?, decisions: TeamCheckinDecision[] }[]`.
   - Reutiliza `JustificationField` (variant read-only) e o estilo de `DecisionCard` para os planos.
   - Vazio-state explícito ("Nenhum líder respondeu este KPI no Pré-MBR de {mês}").

2. `src/modules/okrs/hooks/useMbrKpiLeaderInsights.ts`
   - Deriva, a partir de `mbrPreByTeam` (já disponível no `MbrPage`), `Map<kpiId, LeaderInsightEntry[]>`.
   - Memoizado; sem queries novas.

3. `src/modules/okrs/components/wizards/mbr/MbrKpiDeepDiveStep.tsx`
   - Container que filtra `kpiSnapshots` para `ragStatus ∈ {red, amber}` (igual ao `criticalKpis` do `MbrKpiGateStep`).
   - Reusa o **`KpiGateStep` canônico** (`@/wizards-framework`) em `cardVariant: 'rich-paginated'`, classificando via `classifyKpiGateBucketsFromMonthlySnapshots` para entregar `buckets` com a mesma flatten-pagination do Pré-MBR.
   - Passa `justifications`/`noDataReasons` apenas como leitura (sem callbacks de edição → desabilita edição no rich card via prop existente `readOnlyJustification`; se não existir, adicionar flag `readOnly?: boolean` no `KpiGateStep` — alteração mínima).
   - Renderiza `KpiLeaderInsightsPanel` **abaixo** do card do KPI atual via prop nova `extraContentForCurrentKpi?: (kpi) => ReactNode` no `KpiGateStep` (extensão mínima do framework, agnóstica de wizard).

### Editar

4. `src/modules/okrs/types/wizard/mbr.ts`
   - Adicionar `'kpi-deep-dive'` ao union `MbrStep`.

5. `src/modules/okrs/pages/mbr/constants.ts`
   - Inserir `{ id: 'kpi-deep-dive', label: 'Indicadores fora da meta', description: 'Justificativas e planos do Pré-MBR' }` em `WIZARD_STEPS` e `STEP_ORDER`, **logo após `kpi-gate`**.

6. `src/modules/okrs/pages/MbrPage.tsx`
   - Novo `case 'kpi-deep-dive'` no switch, passando `kpiSnapshots` filtrados, `referenceMonth` e `mbrPreByTeam` (já disponível).
   - Sem alterações no `kpi-gate` existente.

7. `src/modules/okrs/components/wizards/shared/framework/components/KpiGateStep.tsx`
   - Adicionar 2 props opcionais (extensão, sem breaking change):
     - `readOnlyJustification?: boolean` → desabilita `Textarea` da justificativa quando `true`.
     - `extraContentForCurrentKpi?: (kpi: KpiGateItem) => ReactNode` → slot renderizado abaixo do card no modo `rich-paginated`.

### Não duplicar

- **NÃO** criar nova UI de gráfico — reusar `KpiSparkline` já consumido pelo `KpiGateStep` rich.
- **NÃO** criar novo wizard — é um novo step do MBR existente.
- **NÃO** copiar a lógica de paginação — usar `flattenBucketsForPagination` + `cardVariant: 'rich-paginated'` já canônicos.
- **NÃO** tocar no `MbrPreKpiGateStep` nem no `MbrKpiGateStep` (overview).

## Gate / Navegação

- Sem gate obrigatório (somente leitura). `Próximo` sempre habilitado.
- Paginação: `Voltar` na primeira página → volta ao step `kpi-gate`; `Próximo` na última → avança para `team-okrs-overview`.

## Riscos / Validação

- Verificar que `KpiGateStep` rich-paginated aceita lista vazia (caso não haja KPI red/amber) — fallback: pular automaticamente o step ou exibir empty-state ("Nenhum KPI fora da meta neste mês 🎉") + botão `Próximo`. Usar empty-state.
- Confirmar que `mbrPreByTeam` chega vazio quando nenhum time submeteu — `KpiLeaderInsightsPanel` mostra empty-state apropriado (não bloqueia navegação, alinhado ao pedido anterior do usuário sobre listar KPIs independente de submissão).
