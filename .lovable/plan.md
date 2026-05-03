## Pré-checklist (executado)

- **TCR §4.8.1 (Princípio canônico #4)**: `KpiGateStep` deve permanecer agnóstico de `wizardType`. Variações vivem em `config` ou em props injetadas pelo container — não em forks do componente.
- **Docs canônicos**: `WIZARDS_FRAMEWORK_BOUNDARY.md`, `UI_COMPONENTS_REGISTRY.md`, `kpis/responsavel-vs-atualizado-por.md` revisados — KPIs de área (`scope=area`) sob responsabilidade do time são equivalentes a estratégicos do ponto de vista do líder e devem exigir o mesmo plano.
- **Padrão "1 item por step"**: já existe em `MbrPreKrAnalysisStep` (KRs) e em `QbrKpiAnalysisStep` (modo `paginated=true`). Vamos seguir o mesmo padrão (controlado por `currentIndex` + `WizardStepFooter`), sem duplicar componente — estendendo o `KpiGateStep` canônico.
- **Buckets atuais**: `classifyKpiGateBuckets` produz 6 buckets ordenados; `actionModeForBucket` no `KpiGateStep` mapeia bucket → modo de ação do líder. Hoje `teamContext` (que abriga KPIs de área via `responsible_team_id`) é `view` → não pede plano. **Esse é o bug principal do item 1.**

## Problema

Em `/rituals/mbr-pre?step=kpi-analysis`:

1. **KPIs de área** (ex.: Ticket Médio) caem hoje no bucket `teamContext`, cuja ação é `view` (read-only). O líder não tem campo de plano de ação — diferente dos KPIs org (que caem em `critical`/`attention`/`healthy` e exigem plano quando em alerta).
2. Todos os KPIs são renderizados **em lista única**, enquanto KRs do time já são apresentados **1 por página** (mesmo padrão do Check-in Individual). Falta paridade de UX.

## Solução (sem duplicar componentes)

Tudo vive no **`KpiGateStep` canônico** (já consumido por MBR-Pré, MBR, e potencialmente outros). Toda mudança é **opt-in via `config`** — wizards existentes não são afetados.

### Mudança 1 — Plano de ação para KPIs de área (item 1 do usuário)

**Onde:** `src/modules/okrs/components/wizards/shared/framework/components/KpiGateStep.tsx`
**O que:** Refinar `actionModeForBucket` para que, no bucket `teamContext`, KPIs em alerta passem a exigir plano (mesma regra dos buckets `critical`/`attention`).

Em vez de decidir o modo só pelo `bucketId`, passamos a considerar também o `status` do KPI quando o bucket é `teamContext`:

```ts
function actionModeForKpi(bucketId: KpiGateBucketId, kpi: KpiGateItem): ActionMode {
  switch (bucketId) {
    case 'overdue':            return 'explain-no-data';
    case 'critical':
    case 'guardrailViolated':  return 'justify-required';
    case 'attention':          return 'justify-optional';
    case 'teamContext':
      // KPI de área/time sob responsabilidade do time:
      //  - red    → justify-required (plano obrigatório)
      //  - amber  → justify-optional
      //  - green/unknown → view (read-only, como hoje)
      if (kpi.status === 'red')    return 'justify-required';
      if (kpi.status === 'amber')  return 'justify-optional';
      return 'view';
    case 'healthy':
    default:                   return 'view';
  }
}
```

Efeitos colaterais controlados:
- `MANDATORY_BUCKET_IDS` (`overdue`/`critical`/`guardrailViolated`) continua igual para o **gate de avanço** — KPIs de área `red` no `teamContext` aparecem como recomendados, **não bloqueiam o "Próximo"** (preservando o contrato atual do step). O `MbrPreKpiGateStep` controla seu próprio `mandatoryMissing` e seguirá igual.
- `teamContext` continua **colapsado por default** (`COLLAPSED_BY_DEFAULT`) — vamos abrir automaticamente se houver KPI em `red`/`amber` ali. Microajuste em `BucketSection`.

### Mudança 2 — 1 KPI por step (item 2 do usuário)

**Onde:** mesmo `KpiGateStep` canônico.
**O que:** adicionar suporte opcional a `cardVariant: 'rich-paginated'` (extensão do `'rich'`), seguindo o padrão de `paginated` já usado em `QbrKpiAnalysisStep`.

API novidades em `KpiGateStepConfig`:
```ts
cardVariant?: 'compact' | 'rich' | 'rich-paginated';
```

E props:
```ts
currentKpiIndex?: number;            // controlado pelo container
onKpiIndexChange?: (n: number) => void;
```

Comportamento:
- Achata os buckets em uma lista ordenada (mantém a ordem dos buckets canônicos: overdue → critical → guardrailViolated → attention → teamContext em alerta → healthy → teamContext restante).
- Renderiza **um único `RichKpiCard`** (o `currentKpiIndex`-ésimo da lista) com badge contextual do bucket (ex.: "KPI 2 de 7 — Atenção").
- Adiciona barra superior `topFixed` no scaffold com "Análise de KPI — N de M" + % concluído (mesmo padrão do `MbrPreKrAnalysisStep`, **reusando** `WizardStepHeader`/`WizardStepScaffold`).
- Ações de navegação (Anterior/Próximo) ficam no rodapé via `WizardStepFooter` injetado pelo container.
- KPIs em buckets obrigatórios sem plano continuam bloqueando o avanço final do step (já implementado).

Reuso explícito (sem duplicar):
- `RichKpiCard` (já existe — sparkline + bloco de plano).
- `WizardStepHeader`/`WizardStepScaffold`/`WizardStepFooter`.
- `classifyKpiGateBuckets` (sem mudança).
- `JustificationField` continua sendo o input dentro do `RichKpiCard`.

### Mudança 3 — Container do MBR-Pré

**Onde:** `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiGateStep.tsx`
**O que:**
- Trocar `cardVariant: 'rich'` por `cardVariant: 'rich-paginated'`.
- Manter estado local `currentIndex` (mesmo padrão do `MbrPreKrAnalysisStep`) e passar `currentKpiIndex` + `onKpiIndexChange`.
- Substituir `primaryDisabled` para considerar **ambos**: (a) `mandatoryMissing` do gate atual (não muda) e (b) bloquear "Próximo do step" só quando estiver no último KPI; "Anterior/Próximo" do KPI segue regras locais (`justOk` por KPI quando `red` em `teamContext` ou `critical`/etc.).
- Reconciliação de `kpiSnapshots` continua igual — `gateItemToSnapshot` já cobre todos os KPIs (não importa o bucket).

### Fora do escopo

- Não mexer em `useKpisForWizardV2` (fix anterior já cobriu `responsible_team_id`).
- Não mexer em RLS, query SQL, classificação de buckets, ou em outros wizards (Weekly, Collaborator, Leader Prep, MBR final). Eles continuam consumindo `cardVariant: 'rich'` (ou `'compact'`) sem mudança comportamental.
- Não duplicar `RichKpiCard` nem criar componente "MbrPreRichKpiCard". Toda variação vive em props.

### Validação

Em `/rituals/mbr-pre?team=…&step=kpi-analysis` do Comercial:

1. KPI **Ticket Médio** (`scope=area`, `responsible_team_id=Comercial`, RAG=`red` quando aplicável): aparece com bloco "Plano de ação do líder" obrigatório.
2. KPI **MRR commit** (`scope=org`): continua exigindo plano quando em alerta (sem mudança).
3. KPI verde no `teamContext`: continua read-only.
4. Step navega 1 KPI por vez (Anterior/Próximo no rodapé), com contador "N de M" no topo.
5. Botão "Avançar para Projetos" só habilita no último KPI **e** com todos os planos obrigatórios preenchidos (gate global preservado).
6. Outros wizards consumindo `KpiGateStep` (sem `cardVariant: 'rich-paginated'`) continuam idênticos — confirmar via build/teste do `MbrKpiGateStep` (variant `rich` sem paginação).

### Arquivos previstos

- `src/modules/okrs/components/wizards/shared/framework/components/KpiGateStep.tsx` (estender — sem fork)
- `src/modules/okrs/components/wizards/shared/framework/types.ts` (ampliar `KpiGateStepConfig.cardVariant` + novas props opcionais)
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiGateStep.tsx` (consumir nova config)
