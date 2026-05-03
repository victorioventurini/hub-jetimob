## Pré-checklist (executado)

- TCR: `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` v3.29.1 — KPI Frequency Split v3.0.0 ativo, KPI Gate canônico de **6 buckets**.
- SSOT KPIs: `mem://features/kpis/kpis-master-standard` — gate consome `KpiForWizardV2` via `useKpisForWizardV2`, classificação via `classifyKpiGateBuckets`, ordenação `byUpdateFrequencyThenDeviation`, decisões com `metadata.source='kpi_gate'`.
- Componente canônico: `src/modules/okrs/components/wizards/shared/framework/components/KpiGateStep.tsx` (já usado por `MbrKpiGateStep`).
- IDENTITY/RBAC/BU isolation/Soft-delete/Query keys conferidos — nada novo a criar nesses eixos; apenas reusar o que já existe.

## Diagnóstico do bug reportado

KPI **MRR commit** (`6b8c68f8…`, `scope=org`, `responsible_team_id=d3247da9…`, `consolidation/update_frequency=monthly`) tem em abril/2026 valor `15.450` com `rag_status='off_track'`. Pelo canon v3, deveria cair no bucket **`critical`** do KPI Gate e exigir decisão (justificativa + plano de ação).

Por que não está pedindo no Pré-MBR atual: a página **`MbrPrePage.tsx` não usa o KPI Gate canônico**. Em vez disso:
1. Faz uma **query própria** em `kpi_metrics`/`kpi_values`, monta `MbrKpiSnapshot` via `dedupeKpiSnapshots` e armazena em draft.
2. Renderiza `QbrKpiAnalysisStep` (do QBR-Pré) em modo `paginated`, que aplica um classificador paralelo de **4 buckets** (`getKpiActionBucket` em `KpiStatusBlocks.tsx`) baseado em `ragStatus` derivado on-the-fly.
3. Esse classificador paralelo: (a) ignora `update_frequency` v3 corretamente apenas no fallback, (b) depende de um snapshot stale-em-memória cuja reconciliação é posicional (`reconciled.some((s, i) => …)`), e (c) não dispara o gate `critical` quando o snapshot do mês de referência não casa com o registro real do `kpi_values` por causa do `period_label=2026-Q2` herdado (registro abril foi gravado como Q2, não como abril/mensal).

Resultado prático: o snapshot de MRR commit cai em estado intermediário que não bate `'red'` no `getKpiActionBucket` do MBR-Pré, e o card **"Plano de ação do líder"** não é renderizado.

## Decisão arquitetural

Substituir, no Pré-MBR, a etapa atual `kpi-analysis` (que reusa `QbrKpiAnalysisStep + getKpiActionBucket`) por uma etapa que consome o **KPI Gate canônico v3**:
- Hook: `useKpisForWizardV2` (já existente — usado por `MbrKpiGateStep` e Check-in Individual).
- Classificador: `classifyKpiGateBuckets` (já existente).
- UI: `KpiGateStep` (`shared/framework/components/KpiGateStep.tsx`) ou `MbrKpiGateStep` parametrizado para o contexto Pré-MBR.

Sem novos componentes. Sem nova query duplicada. Sem novo classificador paralelo. Reuso integral do canon v3.

## Plano

### 1. Adoção do KPI Gate canônico no Pré-MBR
- Em `src/modules/okrs/pages/MbrPrePage.tsx`:
  - Remover a query inline `useQuery(... mbrKeys.preTeamKpis ...)` que monta `MbrKpiSnapshot`.
  - Remover o effect de "seed/reconcile" posicional do snapshot.
  - Carregar KPIs via `useKpisForWizardV2({ teamId, referenceMonth, ...escopo do Pré-MBR })`, alinhado ao modo já usado pelo `MbrKpiGateStep` e validado pelo SSOT.
  - Filtrar/agrupar com `classifyKpiGateBuckets`.
- Substituir o render de `QbrKpiAnalysisStep paginated` por `KpiGateStep` (ou `MbrKpiGateStep` reaproveitado) configurado com:
  - Variantes de copy/tooltip do Pré-MBR (já há slot p/ `tooltip='qbr-kpi-analysis'` análogo).
  - Persistência das decisões/justificativas em `kpiJustifications`/`kpiNoDataReasons` do draft (chaveado por `kpi_id`).
  - Decisões inline com `metadata.source='kpi_gate', kpi_id, kpi_rag_status, kpi_input_type, kpi_confidence` conforme SSOT §4.

### 2. Garantias de UX (sem regressão)
- Manter os blocos de saúde: **Atrasados → Críticos → Guardrails → Atenção → Saudáveis → Contexto do time**, ordenação intra-bloco `byUpdateFrequencyThenDeviation`.
- Bloqueio de avanço enquanto houver KPI no gate sem decisão registrada (já é comportamento do `KpiGateStep`).
- Header da etapa continua indicando "Análise de KPIs / Indicadores do Time" — apenas o conteúdo passa a ser o gate canônico.

### 3. Limpeza pós-migração
- Manter `getKpiActionBucket` e o modo `paginated` de `QbrKpiAnalysisStep` apenas se ainda houver consumidor; auditar e marcar `@deprecated` se restar somente o QBR-Pré (o QBR também deveria migrar para o canon, mas isso fica como follow-up fora deste escopo).
- Atualizar `mem://features/rituals/qbr-master-standard` (ou criar nota leve em memory) caso o Pré-MBR passe a divergir do Pré-QBR temporariamente.

### 4. Verificação manual
- `/rituals/mbr-pre?team=d3247da9-3e07-4fa8-9d0a-2527fdf6548f&step=kpi-analysis` (default abril/2026):
  - MRR commit deve aparecer no bucket **Críticos** com badge vermelho.
  - Card de decisão obrigatória deve renderizar com `Justificativa` + `Plano de ação` (campos canônicos do KPI Gate).
  - Botão de avançar fica `disabled` até preencher a decisão.
- Trocar para março/2026 → MRR commit cai em **Saudáveis** (on_track), sem cobrança.
- Conferir que decisões salvas aparecem em `okr_decisions` com `metadata.source='kpi_gate'` e `kpi_id` correto.

## Detalhes técnicos

- Arquivos tocados:
  - `src/modules/okrs/pages/MbrPrePage.tsx` — remoção da query/seed inline e troca de step para o gate canônico.
  - Nenhum componente novo. Reuso de `useKpisForWizardV2`, `classifyKpiGateBuckets`, `KpiGateStep`/`MbrKpiGateStep`.
- Sem mudanças de schema/RLS/edge.
- Query keys: usar `kpisKeys.*` já padronizado (sem inventar novas chaves).
- BU isolation: `useKpisForWizardV2` já consome `currentBuId` corretamente.
- Soft-delete e RAG: já encapsulados pelo hook canônico (sem replicar lógica).

## Critérios de aceite

- KPIs `off_track` no mês de referência aparecem em **Críticos** e exigem decisão antes de avançar — caso do MRR commit.
- KPIs `at_risk` aparecem em **Atenção** e exigem decisão.
- KPIs `overdue` (sem update na cadência) aparecem em **Atrasados** e exigem update/decisão.
- Decisões registradas carregam `metadata.source='kpi_gate'` e `kpi_id`.
- Nenhum classificador paralelo de KPI sobrevive no caminho do Pré-MBR; canon v3 é a única fonte de verdade.
