## Objetivo

No step **Indicadores do Time** (`/rituals/mbr-pre?step=kpi-analysis`), tornar o **Plano de ação do líder obrigatório** para KPIs que estão:

1. **Sem atualização** (overdue) — já é obrigatório hoje ✅
2. **Sem meta** (`target_value = null`) — **falta implementar** ❌
3. KPIs em alerta (critical / guardrail / red) — já obrigatório ✅

KPIs **dentro do esperado** (atualizados, com meta, status verde/amarelo on-track) **continuam opcionais**.

## Mudança proposta

Em `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiGateStep.tsx`, ampliar a regra de obrigatoriedade da página atual (`currentRequiresPlan`) para incluir o caso "sem meta", independente do bucket onde o KPI tenha caído.

### Regra atual (linhas 177–184)
```ts
const currentRequiresPlan = !!currentEntry && (
  MANDATORY_BUCKETS.has(currentEntry.bucketId) ||      // overdue, critical, guardrailViolated
  (currentEntry.bucketId === 'teamContext' && currentEntry.kpi.status === 'red')
);
```

### Regra nova
```ts
const kpiHasNoTarget = !!currentEntry && (
  currentEntry.kpi.target == null || currentEntry.kpi.target === ''
);

const currentRequiresPlan = !!currentEntry && (
  MANDATORY_BUCKETS.has(currentEntry.bucketId) ||
  (currentEntry.bucketId === 'teamContext' && currentEntry.kpi.status === 'red') ||
  kpiHasNoTarget   // ← NOVO: sem meta sempre exige plano
);
```

## UX complementar (mesmo arquivo)

Para o usuário entender por que o plano ficou obrigatório num KPI aparentemente "saudável" (ex.: bucket `healthy` mas sem meta), passar uma prop / hint visual ao `KpiGateStep` indicando o motivo. Opções:

- **(A)** Apenas exibir o subtítulo do textarea como "Plano obrigatório — KPI sem meta cadastrada" quando `kpiHasNoTarget && !MANDATORY_BUCKETS.has(...)`. Implementação mínima, sem alterar o framework.
- **(B)** Adicionar um badge "Sem meta" no header do card (requer pequeno ajuste no `KpiGateStep` do framework para aceitar um label adicional).

Recomendado: **(A)** — fica 100% no consumidor MBR Pré, sem mexer no `wizards-framework`.

## Arquivos afetados

- `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiGateStep.tsx` (única alteração)

## Não-objetivos

- Não muda a classificação de buckets (`classifyKpiGateBuckets`) — KPI sem meta continua caindo no bucket natural pelo seu status.
- Não muda outras telas (KPI dashboard, QBR Pré, etc.).
- Não cria migration nem altera schema.
