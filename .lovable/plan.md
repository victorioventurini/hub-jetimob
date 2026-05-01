## Objetivo

Reordenar os passos do Check-in do Colaborador (`/rituals/collaborator-checkin`) para a sequência narrativa solicitada, sem duplicar componentes — apenas trocando a ordem na configuração do wizard.

## Mudança de ordem

| # | Atual | Nova |
|---|-------|------|
| 1 | Contexto | Contexto (Visão geral) |
| 2 | Check-in (KRs) | **KPIs** (Indicadores operacionais) |
| 3 | KPIs | **Projetos** |
| 4 | Projetos | **Iniciativas** |
| 5 | Iniciativas | **Check-in (KRs)** |
| 6 | Pendências | Pendências |
| 7 | Reflexão | Reflexão final |
| 8 | Resumo | Resumo |

Decisão confirmada: manter Projetos e Iniciativas como dois steps separados, nessa ordem.

## Arquivos afetados

Apenas **um arquivo** — toda a orquestração de ordem vive na config do wizard:

- `src/modules/okrs/pages/CollaboratorCheckinPage.tsx`
  - Atualizar `WIZARD_STEPS` (rótulos/ordem) — linhas 60-69
  - Atualizar `STEP_ORDER` — linha 71
  - O `switch (draft.currentStep)` no `renderStepContent` não precisa mudar (continua mapeando por id)
  - Tipo `WizardStep` (linha 49) já é union de strings — sem alteração

## Detalhes técnicos

1. **Nova `STEP_ORDER`:**
   `['context', 'kpis', 'projects', 'initiatives', 'checkin', 'decisions', 'reflection', 'summary']`

2. **Rótulos atualizados** em `WIZARD_STEPS` para refletir a nomenclatura solicitada:
   - `kpis` → label "Indicadores operacionais", descrição "Atualização de métricas e KPIs (1 por sub-passo)"
   - `projects` → label "Projetos", descrição "Atualização de marcos"
   - `initiatives` → label "Iniciativas", descrição "Iniciativas vinculadas aos KRs"
   - `checkin` → label "KRs", descrição "Atualização das KRs"
   - `decisions` → label "Pendências"
   - `reflection` → label "Reflexão final"

3. **Step dinâmico `checkin`** (linhas 161-172): a regra "omitir checkin quando não há KRs" continua válida — apenas filtra na nova posição (índice 4).

4. **Drafts em andamento:** `useGenericWizardDraft` persiste `currentStep` por id (string), não por índice. Drafts existentes continuam funcionando — abrirão no step correto, e a navegação `goNext/goBack` usa a nova `STEP_ORDER`.

5. **Sem alterações de componentes:** `CollaboratorContextStep`, `CollaboratorKpiStep`, `CollaboratorProjectsStep`, `CollaboratorInitiativesStep`, `CollaboratorCheckinStep`, `CollaboratorDecisionsStep`, `CollaboratorReflectionStep`, `CollaboratorSummary` permanecem intactos. UI/padrões reaproveitados conforme TCR (FullPageWizardShell + step components centralizados).

6. **Pré-checklist canônico:**
   - Sem alterações em RLS, BU isolation, identity, query keys ou permissions — apenas reordenação de UI.
   - Sem mudança de schema/migrations.
   - Sem novos componentes (princípio de não-duplicação respeitado).

## Validação pós-implementação

- Abrir `/rituals/collaborator-checkin` e confirmar a sequência: Contexto → Indicadores → Projetos → Iniciativas → KRs → Pendências → Reflexão → Resumo.
- Confirmar que usuários sem KRs pulam direto de Iniciativas para Pendências (regra `hasKrStep`).
- Validar resumo de drafts em progresso (abrir um draft existente, garantir que retoma no step correto).
