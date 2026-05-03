## Pré-checklist (executado)

Consultei: TCR, `mem://standards/wizard-snapshot-denormalized-fields-deprecation` (Onda 4 — proibido gravar `krTitle`/`objectiveTitle`), framework SSOT em `src/modules/okrs/components/wizards/shared/framework/config/{stepDefinitions,stepCompletionRules,structureVersions}.ts`, `mem://features/okrs/cycles-and-rituals-master`, e os componentes shared em `src/modules/okrs/components/wizards/shared/`.

### Achado relevante

**O framework v3 do `mbr-pre` já declara um step `'krs'`** (`stepDefinitions.ts:112` e `stepCompletionRules.ts:63` em `requiredSteps`), mas a `MbrPrePage` atual **não o renderiza**. Existe um drift entre o SSOT estrutural e a página. A entrega do step de KRs **fecha esse gap** em vez de inflar a estrutura, então **não há bump de versão** (continua `v3`). O ID canônico já existente é `'krs'`.

## Objetivo

Inserir, no Pré-MBR, **logo após o step `projects`**, o step `'krs'` (ID já canônico no framework). Padrão reflexivo idêntico ao de KPIs/Projetos: **não atualiza** check-in nem `current_value`. Apenas **justifica o desvio** + plano de ação para KRs fora da meta. Justificativa **obrigatória** para severidades `critical` e `warning`.

## Princípios (sem duplicação)

| Necessidade | Reuso canônico |
|---|---|
| Layout do step | `WizardStepScaffold` + `WizardStepHeader` + `WizardStepFooter` |
| Campo de justificativa | `JustificationField` (shared, com `required` + hint) |
| Banner de bloqueio amarelo | mesmo padrão visual de `MbrPreProjectsStep` |
| Estados de KR + cores + ícones + severidade | `KR_STATE_CONFIG` (`useKrStateInsights`) |
| Progresso visual | `OkrProgressBar` |
| Status badge | `OkrStatusBadge` |
| Resolução de nomes (KR/Objetivo) | `useEntityLookup` + `resolveName` (Onda 4 — **nunca** gravar `krTitle`) |
| Agrupamento por objetivo | mesma lógica de `QbrBalanceStep` |
| Contagem por bucket de severidade | `KR_STATE_CONFIG[state].severity` |

Snapshot de KRs **já vem hidratado** em `draft.data.krFinalStates` no `MbrPrePage`; o novo step apenas consome — sem nova query.

## Critério "fora da meta" (obriga justificativa)

Baseado em `KR_STATE_CONFIG[state].severity`:

| state | severity | obriga? |
|---|---|---|
| `off_track` | critical | ✅ obrigatório |
| `not_achieved` | critical | ✅ obrigatório |
| `at_risk` | warning | ✅ obrigatório |
| `stagnant` | warning | ✅ obrigatório |
| `not_started` | info | ⚪ campo opcional (sem bloqueio) |
| `healthy` / `achieved` / `exceeded` | info | ⚫ campo oculto |

## Mudanças

### 1. Tipo (`src/modules/okrs/types/wizard/mbr.ts`)

Adicionar em `MbrPreDraftData`:
```ts
/**
 * Justificativas de KRs fora da meta (severidade warning/critical) — chave: krId.
 * Reflexivo: o líder explica o desvio sem registrar check-in nem alterar current_value.
 */
krJustifications: Record<string, string>;
```

### 2. `MbrPrePage.tsx`

- Adicionar `'krs'` em `MbrPreStep` (em `mbr.ts`) e nas constantes locais:
  - `WIZARD_STEPS`: novo item entre `projects` e `highlights` — label **"KRs do Time"**, descrição **"Resultados-chave e justificativas"**.
  - `STEP_ORDER`: `['opening','kpi-analysis','projects','krs','highlights','next-steps','summary']`.
- `DEFAULT_DATA.krJustifications = {}`.
- Novo `case 'krs':` em `renderStepContent`, renderizando `MbrPreKrAnalysisStep` com `krFinalStates`, `krJustifications`, handlers `onKrJustificationChange` (merge no `updateDraft`) e `onContinue/onBack`.
- Não há nova query — `draft.data.krFinalStates` já é populado pela seed existente (linhas 280-353).

### 3. Novo componente `MbrPreKrAnalysisStep.tsx`

Local: `src/modules/okrs/components/wizards/mbr-pre/MbrPreKrAnalysisStep.tsx`. Estrutura espelhada de `MbrPreProjectsStep` + `QbrKpiAnalysisStep`:

- `WizardStepScaffold` com `WizardStepHeader` (`icon: Target`, `variant: 'amber'`, `tooltip: 'mbr-pre-krs'`, badge "N fora da meta").
- Banner amarelo idêntico ao de Projetos quando `missingJustifications > 0`.
- Lista agrupada por objetivo (igual `QbrBalanceStep`):
  - Cabeçalho com título do objetivo via `useEntityLookup`.
  - `KrCard` memoizado para cada KR:
    - Nome via `useEntityLookup` (fallback `'(KR removido)'`).
    - `KR_STATE_CONFIG[state]` para `icon`, `label`, `colorClass`, `borderClass`, `bgClass`.
    - `OkrProgressBar finalProgress`.
    - Pill `paceStatus` (Atrasado/Atenção/No ritmo).
    - Pill "Contribuído" quando `isContributed`.
    - `JustificationField` apenas quando `severity ∈ {warning, critical}`, com `required`, label "Justifique o desvio do KR" e hint "Obrigatório — explique por que está fora da meta e o plano de ação."
- Estado vazio: `EmptyState` (icon `Target`, "Nenhum KR vinculado a este time").
- Estado "tudo verde": card success "Nenhum KR fora da meta. Você pode avançar." + lista compacta.
- `WizardStepFooter` com `primaryDisabled = missingJustifications > 0`.

### 4. Framework SSOT (sincronizar)

Atualmente `mbr-pre` v3 já tem o id `'krs'` em `stepDefinitions` e `stepCompletionRules.requiredSteps` — **nenhuma mudança aqui**. Dois ajustes finos:

- `stepCompletionRules.ts` linha 63: `requiredSteps` lista `['balance', 'kpis', 'krs', 'next-steps', 'summary']`. A `MbrPrePage` usa IDs diferentes (`opening` em vez de `balance`, `kpi-analysis` em vez de `kpis`). Isso é gap pré-existente e **fora do escopo**; manter como está. O page calcula `completedSteps` localmente via `STEP_ORDER`, sem consultar o framework.
- Não bump de versão. `v3` continua adequado pois os ids do framework já contemplam `krs`.

### 5. `MbrPreSummary.tsx`

Acrescentar mini-bloco "Justificativas de KRs (N)" análogo aos blocos de KPIs/Projetos. Listar `krId → texto truncado`, resolvendo nome via `useEntityLookup` (consistente com Onda 4).

### 6. `MbrPreReport.tsx` (renderer histórico)

Adicionar seção opcional **"Justificativas de KRs"** quando `data.krJustifications` existir (snapshots novos). Sem schema migration — `reflection_data` é JSONB. Resolver nomes via `useEntityLookup` já presente no renderer.

### 7. Edge `mbr-summary`

Inspecionar payload de fechamento. Hoje já passa `snapshot` JSON inteiro ao LLM (sem desestruturar). `krJustifications` simplesmente acompanha o blob — sem alteração do edge necessária. Se vier a ser usado em prompt no futuro, há lookup de KR por id já presente em `qbr-pre-summary` (referência).

### 8. Tooltip

Registrar `'mbr-pre-krs'` em `WizardTooltips` com cópia: "Reflita sobre cada KR fora da meta. Não atualize check-ins aqui — apenas explique o desvio e o plano de ação."

### 9. Hidratação de drafts antigos

Drafts pré-mudança não terão `krJustifications`. Solução: `DEFAULT_DATA.krJustifications = {}` + merge raso já feito por `useGenericWizardDraft`. Nenhum draft antigo quebra. Drafts persistidos no step `'highlights'` continuam válidos (id de string), ao voltar `goBack` cairão no novo `'krs'` — comportamento desejado.

### 10. Testes (Vitest)

Criar `src/modules/okrs/components/wizards/mbr-pre/__tests__/MbrPreKrAnalysisStep.test.tsx` espelhando `QbrKpiAnalysisStep.test.tsx`:
- Renderiza badge correto (count por severity warning+critical).
- Bloqueia "Continuar" quando há critical/warning sem justificativa.
- Libera quando todas justificadas.
- Não exibe `JustificationField` para `healthy`/`achieved`/`exceeded`.
- Agrupa KRs por objetivo.
- Resolve nome via mock `useEntityLookup` (não usa `krTitle` legado).

## Não-objetivos

- **Não** registrar check-in nem alterar `current_value`.
- **Não** exibir KPIs vinculados ao KR (já há step dedicado).
- **Não** alterar Pré-QBR.
- **Não** alterar regras de elegibilidade de KRs (mesmo conjunto já carregado em `MbrPrePage`).
- **Não** sincronizar IDs divergentes entre framework v3 e page (gap pré-existente, fora de escopo).
- **Não** criar novo agente IA.

## Riscos & mitigação

| Risco | Mitigação |
|---|---|
| Drafts antigos sem `krJustifications` | Default `{}` + merge raso do hook |
| Drafts persistidos em `'highlights'` | `currentStep` é string livre — seguem válidos |
| Gravação acidental de `krTitle` no snapshot | Usar exclusivamente `useEntityLookup`; não inserir `krTitle` em payloads novos |
| Snapshot histórico (sessões já fechadas) | Renderer trata `krJustifications` como opcional — exibe seção só se existir |

## Entregáveis

1. `src/modules/okrs/types/wizard/mbr.ts` — campo `krJustifications` + step id `'krs'`.
2. `src/modules/okrs/components/wizards/mbr-pre/MbrPreKrAnalysisStep.tsx` (novo).
3. `src/modules/okrs/components/wizards/mbr-pre/index.ts` — export.
4. `src/modules/okrs/pages/MbrPrePage.tsx` — `WIZARD_STEPS`, `STEP_ORDER`, `DEFAULT_DATA`, `renderStepContent`.
5. `src/modules/okrs/components/wizards/mbr-pre/MbrPreSummary.tsx` — bloco "Justificativas de KRs".
6. `src/modules/okrs/components/wizards/shared/WizardTooltips.tsx` — entrada `mbr-pre-krs`.
7. `src/modules/okrs/components/ritual-report/renderers/MbrPreReport.tsx` — seção de justificativas (snapshots novos).
8. `src/modules/okrs/components/wizards/mbr-pre/__tests__/MbrPreKrAnalysisStep.test.tsx`.
