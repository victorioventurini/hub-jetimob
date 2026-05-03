## Pré-checklist (executado)

- ✅ `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` — confirmado que KPI Gate v3.29.x usa 6 buckets canônicos (`overdue`, `critical`, `guardrailViolated`, `attention`, `healthy`, `teamContext`).
- ✅ `mem://features/kpis/kpis-master-standard` (seção 4 — Ritual Gates) — confirma que `MbrKpiGateStep` e o `KpiGateStep` genérico consomem `KpiForWizardV2` + `classifyKpiGateBuckets`. Não há regra publicada hoje sobre "sem meta" / "sem dados em teamContext".
- ✅ `docs/canonical/WIZARDS_FRAMEWORK_BOUNDARY.md` — `KpiGateStep` é módulo de plataforma, agnóstico de OKR. Mudanças vão no framework, não no consumidor.
- ✅ Inventário de consumidores: apenas `MbrPreKpiGateStep` e `MbrKpiGateStep` usam o `KpiGateStep` rich/rich-paginated. Weekly v2 e QBR usam outras superfícies — fora do escopo. "Aplicar a todos" cobre exatamente esses dois ritos via mudança canônica no framework.

Conclusão do checklist: a mudança é coerente com a SSOT (não cria 6º bucket nem novo enum; apenas estende `actionModeForKpi` que é função interna do componente), e o lugar correto é o framework (`KpiGateStep.tsx`).

## Diagnóstico

Na URL do Pré-MBR (`?step=kpi-analysis`), o KPI **"Crescimento de MRR"** aparece com:
- bucket `teamContext` (KPI de área sob responsabilidade operacional do time Comercial)
- status `unknown` ("Sem dados")
- `target = null`

`actionModeForKpi(bucket, kpi)` em `KpiGateStep.tsx` (linhas 130-147) retorna `'view'` para `teamContext` quando o status não é `red`/`amber` — então o textarea "Plano de ação do líder" não é renderizado. O ajuste anterior em `MbrPreKpiGateStep` cobriu apenas o **gate** do botão Próximo, não a **renderização** do campo (e ainda assim deixava o usuário travado sem ter onde digitar).

## Regra canônica a publicar

Plano de ação do líder é **obrigatório** quando o KPI:
1. Está em bucket MANDATORY (`overdue`, `critical`, `guardrailViolated`) — já implementado
2. Está em `teamContext` com status `red` — já implementado
3. **(novo)** Está em `teamContext` com status `unknown` (sem dados) → modo `explain-no-data`
4. **(novo)** Tem `target == null` (sem meta cadastrada), em qualquer bucket que não seja `view`-puro → modo `justify-required`

KPIs saudáveis com meta e dados continuam **opcionais** (sem textarea, comportamento atual).

## Mudanças (canônicas, no framework)

### 1. `src/modules/okrs/components/wizards/shared/framework/components/KpiGateStep.tsx`

**a)** Estender `actionModeForKpi` (linhas 130-147):

```ts
function actionModeForKpi(bucketId, kpi): ActionMode {
  const noTarget = kpi.target == null || kpi.target === '';
  switch (bucketId) {
    case 'overdue': return 'explain-no-data';
    case 'critical':
    case 'guardrailViolated': return 'justify-required';
    case 'attention': return noTarget ? 'justify-required' : 'justify-optional';
    case 'teamContext':
      if (kpi.status === 'unknown') return 'explain-no-data';
      if (noTarget) return 'justify-required';
      if (kpi.status === 'red') return 'justify-required';
      if (kpi.status === 'amber') return 'justify-optional';
      return 'view';
    case 'healthy':
    default:
      return noTarget ? 'justify-required' : 'view';
  }
}
```

**b)** Atualizar `mandatoryUnaddressed` (linhas 496-510) para a mesma regra, mantendo coerência entre badge "X pendente(s)", aviso fixo "Registre o plano de ação" e gate global do framework:

```ts
const requiresPlan =
  MANDATORY_BUCKET_IDS.has(bucket.id) ||
  (bucket.id === 'teamContext' && (item.status === 'red' || item.status === 'unknown')) ||
  (bucket.id !== 'view' && (item.target == null || item.target === ''));
```

### 2. `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiGateStep.tsx`

Sincronizar `currentRequiresPlan` (linhas 186-190) com a mesma fórmula — adicionar `status === 'unknown'` no `teamContext`. `kpiHasNoTarget` já existe.

### 3. `src/modules/okrs/components/wizards/mbr/MbrKpiGateStep.tsx`

Verificar e alinhar (não tem regra duplicada hoje — herda do framework). Apenas confirmar e adicionar comentário.

### 4. Testes

`MbrKpiGateStep.test.tsx` — adicionar 4 casos:
- `teamContext` + `status='unknown'` → textarea visível + obrigatório
- `teamContext` + `target=null` → textarea visível + obrigatório
- `healthy` + `target=null` → textarea visível + obrigatório
- `healthy` + tudo OK → sem textarea (regressão)

### 5. SSOT

Atualizar `mem://features/kpis/kpis-master-standard` seção 4 com as duas novas regras (`unknown` em teamContext, `target=null` em qualquer bucket não-view) — manter o canon vivo.

## Não muda

- `classifyKpiGateBuckets` (6 buckets continuam intactos — SSOT respeitada)
- Enums DB, RLS, edge functions, schema
- Demais ritos (Weekly v2, QBR Pre, etc.) — não consomem `KpiGateStep` rich
- UX de KPIs saudáveis com meta — continuam sem textarea
