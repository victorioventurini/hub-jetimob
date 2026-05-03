## Pré-checklist (concluído)

- ✅ TCR §4.8.1 (Framework Unificado de Wizards)
- ✅ `docs/canonical/WIZARDS_FRAMEWORK_BOUNDARY.md` (fronteira pública)
- ✅ `mem://architecture/wizards/wizards-master-standard`
- ✅ `mem://features/kpis/kpis-master-standard` (gate canônico 6-bucket v3.0.0)
- ✅ `mem://features/okrs/management-rituals-standard-v2` + `mbr-ritual-specification`
- ✅ Codebase: `framework/components/KpiGateStep.tsx`, `MbrKpiGateStep.tsx`, `QbrKpiAnalysisStep.tsx`, `stepDefinitions.ts`

## Diagnóstico

A diferença visual entre **MRR commit** (card rico, paginado, com sparkline e "Plano de ação do líder") e **New Logos** (card minimalista "Sem dados") existe porque o build atual em produção mistura dois renderers:

- **MRR commit (Crítico)** → renderizado pelo `QbrKpiAnalysisStep` em modo `paginated detailed` (legacy wizard-específico, herança do QBR-Pré reaproveitada no MBR-Pré antigo).
- **New Logos (Sem dados)** → renderizado pelo `MbrKpiGateStep` ou pelo `KpiGateStep` do framework em modo lista, ambos com UI minimalista.

**Causa de fundo (arquitetural)**: o step `kpis` do `mbr-pre v3` está declarado em `stepDefinitions.ts` como `KpiGateStep` do framework (canônico, agnóstico), mas a `MbrPrePage` ainda **não usa o dispatcher** — renderiza manualmente um wrapper (`MbrPreKpiGateStep`) que delega ao `MbrKpiGateStep` legacy. Resultado: a UI do step varia conforme o caminho de render que cada KPI atravessa, e `no_data` não tem tratamento equivalente a `red`/`yellow`.

## Decisão arquitetural (alinhada ao TCR §4.8.1 e ao BOUNDARY)

A solução canônica **NÃO é** importar `QbrKpiAnalysisStep` para dentro do MBR-Pré (violaria o BOUNDARY: misturaria componentes wizard-específicos entre ritos). A solução canônica é **enriquecer o `KpiGateStep` do framework** para suportar a UI rica que cada rito quer, mantendo-o agnóstico via config — exatamente como o framework prevê (Princípio #4: variação vive em config, não em `if (wizardType)`).

**Estratégia**: criar um nível de UI "rich" no `KpiGateStep` do framework, dirigido por config, usado pelo `mbr-pre` (e disponível para `qbr-pre`/`mbr` no futuro). UI minimalista atual (`KpiCardItem`) permanece como default para casos enxutos.

## Escopo (faseado, cirúrgico)

### Fase 1 — Enriquecer `framework/components/KpiGateStep.tsx`

Adicionar prop opcional na config:

```ts
// stepDefinitions.ts (mbr-pre v3)
{ id: 'kpis', component: 'KpiGateStep',
  config: { requireResolution: false, cardVariant: 'rich' } }
```

Onde `cardVariant: 'rich' | 'compact'` (default `compact`, mantém comportamento atual). Quando `rich`:

- `KpiCardItem` ganha:
  - **Sparkline canônica** (reusar `KpiMiniChart` ou `KpiTrendSparkline` já existentes — auditar `src/modules/kpis/components/`).
  - **Header expandido**: nome + `KpiNameLink` (deep link) + badges (Crítico/Em alerta/Saudável/Sem dados/Global/Time/Área) + valor atual + meta + último input em texto humanizado.
  - **Bloco "Ação do líder"** condicionado pelo bucket:
    - `overdue` → `Por que está sem dados? Plano para destravar` (textarea obrigatória).
    - `critical`/`guardrail` → `Justificativa e plano de ação` (textarea obrigatória).
    - `attention` → `Justificativa` (opcional).
    - `healthy`/`teamContext` → somente leitura (sem campo).
- Persistência da justificativa: campo `impactAssessment` (já existe em `MbrKpiSnapshot`) — semântica unificada por bucket. Aceitar Opção A do plano original (uma string só, semântica clara pelo bucket; `noDataReason` separado fica para uma onda futura se IA precisar distinguir).
- **Não renderizar** `InlineDecisionInput` por KPI (mantém comportamento já alinhado com a remoção feita anteriormente).
- **Não renderizar** toggle "Exige decisão estratégica" (não é responsabilidade do step canônico).
- Manter `BucketSection` colapsável (default expandido para os 5 primeiros, colapsado para `teamContext`).

### Fase 2 — Adapter de leitura/escrita por step

Estender `framework/config/stepContentAdapters.ts` para que o adapter do `KpiGateStep` em modo `rich` exponha callbacks `onJustificationChange(kpiId, value)` que o consumidor (MBR-Pré) liga ao seu draft (`kpiSnapshots[i].impactAssessment`).

### Fase 3 — Migrar `MbrPrePage` para consumir o `KpiGateStep` canônico

Refatorar `MbrPreKpiGateStep` (wrapper) para:

- Continuar buscando KPIs via `useKpisForWizardV2` + `classifyKpiGateBuckets` (já está canônico).
- Renderizar o `KpiGateStep` do framework (`@/wizards-framework`) com `cardVariant='rich'`, em vez de `MbrKpiGateStep` legacy.
- Passar todos os 6 buckets (incluindo `healthy` e `teamContext`) — assim "New Logos" entra em `overdue` (Sem dados) e ganha a mesma UI rica.
- Persistir justificativas em `kpiSnapshots[i].impactAssessment`.

**Não migrar `MbrPrePage` inteira para o dispatcher do framework nesta onda** — isso é tema da Onda 2.5/3 separada. Apenas o step `kpis` é trocado.

### Fase 4 — Gate de avanço

`stepCompletionRules.ts` ganha regra `allMandatoryKpisAddressed` (já existe variante similar `allAtRiskKpisAddressed`): valida que todos os KPIs em `overdue`/`critical`/`guardrail` têm `impactAssessment` não vazio. `attention`/`healthy`/`teamContext` não bloqueiam.

Para o `mbr-pre`, configurar `requireResolution: true` na `stepDefinitions` (substitui `false` atual) — o gate passa a valer quando a UI rica permite responder a obrigação dentro do próprio card.

### Fase 5 — Limpeza

- Marcar `MbrKpiGateStep` (`mbr/MbrKpiGateStep.tsx`) como `@deprecated` para uso fora do **MBR executivo**. MBR executivo continua usando até sua própria migração (não nesta onda).
- Atualizar memórias:
  - Estender `mem://features/kpis/kpis-master-standard` com nota sobre `cardVariant: 'rich'`.
  - Atualizar `mem://architecture/wizards/wizards-master-standard` com o padrão "step canônico → variant via config".

### Fase 6 — Testes

- Suite nova `KpiGateStep.rich.test.tsx`:
  - Renderiza sparkline + bloco de plano para `overdue`/`critical`/`guardrail`.
  - Renderiza somente leitura para `healthy`/`teamContext`.
  - `onJustificationChange` dispara para o bucket correto.
- Atualizar `stepCompletionRules.test.ts` cobrindo `allMandatoryKpisAddressed`.
- Smoke em `MbrPreKpiGateStep` validando que "New Logos" (no_data) renderiza com mesma estrutura visual que "MRR commit" (red).

## Detalhes técnicos

**Arquivos afetados**:

- `src/modules/okrs/components/wizards/shared/framework/components/KpiGateStep.tsx` — adiciona `cardVariant`, `RichKpiCard`.
- `src/modules/okrs/components/wizards/shared/framework/types.ts` — `KpiGateStepConfig.cardVariant?: 'compact' | 'rich'`.
- `src/modules/okrs/components/wizards/shared/framework/config/stepDefinitions.ts` — `mbr-pre.v3.kpis` ganha `cardVariant: 'rich'` + `requireResolution: true`.
- `src/modules/okrs/components/wizards/shared/framework/config/stepCompletionRules.ts` — regra `allMandatoryKpisAddressed`.
- `src/modules/okrs/components/wizards/shared/framework/config/stepContentAdapters.ts` — expor callback de justificativa.
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiGateStep.tsx` — passa a renderizar `KpiGateStep` do framework via `@/wizards-framework`.
- `src/modules/okrs/components/wizards/mbr/MbrKpiGateStep.tsx` — JSDoc `@deprecated` para uso em MBR-Pré.
- Testes correspondentes.

**Componente de sparkline**: auditar primeiro o que já existe em `src/modules/kpis/components/` (`KpiMiniChart`, `KpiTrendSparkline`, etc.) para reusar — proibido duplicar.

**Vínculo com TCR §4.8.1**: esta evolução **mantém** o framework agnóstico (Princípio #4) — `wizardType` não vaza para o componente; toda variação é resolvida por `cardVariant` na config.

## Não escopo

- Migração completa do MBR-Pré para o dispatcher do framework (Onda 2.5).
- Refatoração do MBR executivo (continua com `MbrKpiGateStep` por enquanto).
- Distinção semântica entre `noDataReason` e `impactAssessment` no payload (uma string só nesta onda).
- Refatoração do `QbrKpiAnalysisStep` (será sunset gradual quando QBR-Pré migrar para o framework).
- Mexer em copy/labels além do necessário para o card rich.
