# Sugestão de pauta no Check-in Individual (rodapé, padrão MBR-pré)

## Objetivo

Permitir que o colaborador, durante o Check-in Individual, registre **sugestões de pauta para o Team Check-in** (rito do líder com o time) usando o mesmo componente já consolidado no MBR-pré e QBR-pré: `InlineAgendaSuggestionInput` no rodapé de cada step + `AgendaSuggestionsPrioritizer` no Summary (até 3 prioritárias).

Zero duplicação: reutiliza componentes compartilhados de `wizards/shared/`.

## Contexto

Já existe na base, totalmente reutilizável:

- `src/modules/okrs/components/wizards/shared/InlineAgendaSuggestionInput.tsx` — input collapsible com 3 categorias canônicas (Performance / Projetos / Pessoas), filtra por `sourceStep`.
- `src/modules/okrs/components/wizards/shared/AgendaSuggestionsPrioritizer.tsx` — prioriza até 3 sugestões antes de fechar.
- Tipo SSOT: `RitualAgendaSuggestion` em `types/wizard/shared.ts`.
- Padrão MBR-pré: input vai no slot `bottomFixed` do `WizardStepScaffold`; cada step injeta seu próprio `sourceStep`; `triggerLabel` parametrizável (ex.: "Registrar sugestão de pauta para o MBR").

## Mudanças

### 1. Estender `CollaboratorDraftData` com `agendaSuggestions`

Em `CollaboratorCheckinPage.tsx` (interface local) — adicionar:

```ts
agendaSuggestions: RitualAgendaSuggestion[];
```

Default `[]` no `DEFAULT_DATA`. Hidratação via `useGenericWizardDraft` continua funcionando sem mudanças.

### 2. Adicionar `bottomFixed` com `InlineAgendaSuggestionInput` em todos os steps operacionais

Trigger label canônico: **"Registrar sugestão de pauta para o Team Check-in"**.

| Step | sourceStep | Estratégia |
|---|---|---|
| `kpis` (CollaboratorKpiStep) | `'collaborator-kpis'` | **Refatorar** para usar `WizardStepScaffold` (hoje monta layout próprio) e mover footer atual para o slot `footer`. |
| `projects` (CollaboratorProjectsStep) | `'collaborator-projects'` | Já usa Scaffold — apenas adicionar `bottomFixed`. |
| `initiatives` (CollaboratorInitiativesStep) | `'collaborator-initiatives'` | Já usa Scaffold — apenas adicionar `bottomFixed`. |
| `checkin` (CollaboratorCheckinStep — KRs) | `'collaborator-krs'` | **Refatorar** para Scaffold + `bottomFixed`. |
| `decisions` (CollaboratorDecisionsStep) | `'collaborator-decisions'` | Já usa Scaffold — adicionar `bottomFixed`. |
| `reflection` (CollaboratorReflectionStep) | `'collaborator-reflection'` | **Refatorar** para Scaffold + `bottomFixed`. |

Steps fora do escopo: `context` (abertura ritual — sem inputs operacionais), `summary` (recebe Prioritizer, ver §3).

Cada step recebe três props novas opcionais (mesma assinatura do MBR-pré):

```ts
agendaSuggestions?: RitualAgendaSuggestion[];
onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
agendaTriggerLabel?: string;
```

A página injeta as três em todos os steps relevantes via:

```ts
agendaSuggestions={draft.data.agendaSuggestions ?? []}
onAgendaSuggestionsChange={(next) => updateDraft({ agendaSuggestions: next })}
agendaTriggerLabel="Registrar sugestão de pauta para o Team Check-in"
```

### 3. `CollaboratorSummary` — incluir Prioritizer

Adicionar prop `agendaSuggestions` + `onAgendaSuggestionsChange` e renderizar uma seção **acima das ações de fechamento** com `<AgendaSuggestionsPrioritizer />` (mesmo padrão do `QbrPreSummary`/`MbrPreSummary`).

Quando não houver nenhuma sugestão, esconder a seção (não exibir cabeçalho vazio).

### 4. Refator pequeno do Scaffold nos 3 steps que não o usam

Para `CollaboratorKpiStep`, `CollaboratorCheckinStep` e `CollaboratorReflectionStep`:

- Envolver o conteúdo atual em `<WizardStepScaffold header={...} footer={<WizardStepFooter ... />} bottomFixed={...} />`.
- Mover o `<WizardStepFooter>` interno para o slot `footer`.
- Manter conteúdo, comportamento e props do componente.

Isso normaliza o padrão arquitetural (mesmo Wizard Master SSOT) e habilita o `bottomFixed` sem código novo de layout.

### 5. SSOT do trigger label

Criar uma constante exportada em `src/modules/okrs/constants/ritualLabels.ts`:

```ts
export const COLLABORATOR_AGENDA_TRIGGER_LABEL =
  'Registrar sugestão de pauta para o Team Check-in';
```

Página importa e passa aos steps. Um único ponto de mudança caso o texto evolua.

## Persistência e consumo pelo Team Check-in

**Estado atual da base (importante)**: tanto MBR-pré quanto QBR-pré já capturam `agendaSuggestions` no draft, mas o **rito-mãe ainda não as consome** (verificado em `MbrPage.tsx`/`TeamCheckinPage.tsx` — nenhuma referência). Esta entrega segue o **mesmo nível de maturidade**: captura limpa no draft + Summary, sem mexer no Team Check-in.

A integração "Team Check-in lê as sugestões dos check-ins individuais do time da semana" é uma **segunda fase**, fora deste escopo, e deve receber plano próprio (envolve query agregada por team_id + ciclo + janela de tempo, posicionamento na UI do team-checkin e governança de quem vê o quê).

## Arquivos afetados

- **edit** `src/modules/okrs/pages/CollaboratorCheckinPage.tsx` (draft data, props nos steps, Summary)
- **edit** `src/modules/okrs/components/wizards/collaborator/CollaboratorKpiStep.tsx` (Scaffold + bottomFixed)
- **edit** `src/modules/okrs/components/wizards/collaborator/CollaboratorCheckinStep.tsx` (Scaffold + bottomFixed)
- **edit** `src/modules/okrs/components/wizards/collaborator/CollaboratorReflectionStep.tsx` (Scaffold + bottomFixed)
- **edit** `src/modules/okrs/components/wizards/collaborator/CollaboratorProjectsStep.tsx` (bottomFixed)
- **edit** `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx` (bottomFixed)
- **edit** `src/modules/okrs/components/wizards/collaborator/CollaboratorDecisionsStep.tsx` (bottomFixed)
- **edit** `src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx` (Prioritizer)
- **edit** `src/modules/okrs/constants/ritualLabels.ts` (constante)
- **edit** `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (§4.8 — registrar que Collaborator também emite agenda suggestions)
- **new** `.lovable/memory/features/rituals/collaborator-agenda-suggestions.md` + entrada no `index.md`

## Critérios de aceite

- Em todos os 6 steps operacionais (KPIs, Projetos, Iniciativas, KRs, Decisões, Reflexão) aparece a faixa "Registrar sugestão de pauta para o Team Check-in" ancorada acima do footer.
- Cada item adicionado é categorizável (Performance / Projetos / Pessoas) e armazena o `sourceStep` correto.
- Sugestões persistem entre navegação back/forward (via draft) e sobrevivem a "Salvar rascunho".
- No Summary aparece o `AgendaSuggestionsPrioritizer` quando há ao menos 1 sugestão; permite marcar até 3 prioritárias.
- Zero duplicação de componentes — reuso integral de `InlineAgendaSuggestionInput`, `AgendaSuggestionsPrioritizer`, `WizardStepScaffold`, `WizardStepFooter`.
