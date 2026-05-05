## Objetivo

Garantir que o "Registro de notas e decisões" (slot canônico `InlineDecisionInput` / `InlineDecisionsSlot`) apareça no footer de **todas** as páginas do MBR (`/rituals/mbr`), espelhando o padrão já usado nas demais steps e no Pré-MBR.

## Diagnóstico (estado atual)

| Step MBR | Slot inline hoje | Ação |
|---|---|---|
| `panorama` | ✅ `InlineDecisionInput` (sourceStep=`panorama`) | manter |
| `kpi-gate` | ❌ removido junto com os cards | **adicionar** |
| `kpi-deep-dive` | ❌ `suppressInlineDecisions` | **adicionar** |
| `team-okrs-overview` | ✅ | manter |
| `team-okrs-detail` | ✅ | manter |
| `org-okrs` | ✅ | manter |
| `decisions` | — (é o próprio step canônico de decisões) | manter sem (redundante) |
| `qbr-followup` | ✅ | manter |
| `evaluation` | ❌ (step do framework de avaliação) | **adicionar** |
| `closing` | ✅ | manter |

## Mudanças

Sem duplicar componentes — reutilizar o canônico (`InlineDecisionInput` exportado de `@/modules/okrs/components/wizards/shared`) e o slot do framework (`InlineDecisionsSlot` via `suppressInlineDecisions=false`). Sem alterações de regra de negócio.

### 1. `MbrKpiGateStep.tsx`
Adicionar `InlineDecisionInput` no `bottomFixed` do `WizardStepScaffold` (logo abaixo da mensagem de pendência), com `sourceStep="kpi-gate"`. Mantém o gate atual.

### 2. `MbrKpiDeepDiveStep.tsx`
Remover `suppressInlineDecisions` na chamada do `KpiGateStep` (framework já renderiza `InlineDecisionsSlot` com `stepId="kpi-deep-dive"`). Nada novo a criar.

### 3. `MbrPage.tsx` — case `evaluation`
Envelopar o `EvaluationCollectionStep` em um wrapper leve que renderize, abaixo do conteúdo, o mesmo `InlineDecisionInput` com `sourceStep="evaluation"`, ou — preferindo composição — adicionar a prop opcional ao step (se existir) ou injetar via slot já disponível. Decisão default: posicionar o `InlineDecisionInput` entre o conteúdo do step e o `WizardStepFooter`, sem alterar o componente compartilhado.

### 4. Sem mudanças em
`MbrPanoramaStep`, `MbrTeamOkrsOverviewStep`, `MbrTeamOkrsDetailStep`, `MbrOrgOkrsStep`, `MbrQbrFollowUpStep`, `MbrClosingStep` (já têm o slot), `MbrDecisionsStep` (é o consolidador — duplicação seria ruído).

## Canônicos respeitados

- `mem://architecture/wizards/wizards-master-standard` — slot inline ubíquo via `InlineDecisionsSlot` / `InlineDecisionInput`
- `mem://standards/wizard-vocabulary-canonical` — `sourceStep` reusa IDs já definidos das steps do MBR
- Sem novos componentes; apenas extensão/composição do existente
- Sem alteração de RLS, BU isolation ou regras de domínio
