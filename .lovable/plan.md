## Objetivo

Padronizar a sugestão de pauta no **Check-in Individual** usando o mesmo card visual do Pré-MBR (`AgendaSuggestionsPrioritizer`), aplicado nas etapas **Reflexão** e **Resumo**, **sem categorias** (Performance/Projetos/Pessoas), permitindo priorizar até 3 sugestões.

Hoje:
- Na **Reflexão** o input renderiza “solto” via `InlineAgendaSuggestionInput categoryless`.
- O `AgendaSuggestionsPrioritizer` existe e é usado no Pré-MBR/Pré-QBR, mas só em modo **com categorias**.

Nada de duplicar componentes — vamos **estender o `AgendaSuggestionsPrioritizer` existente** para suportar o modo `categoryless` e reutilizá-lo nos dois pontos do Check-in Individual.

## Mudanças

### 1. Estender `AgendaSuggestionsPrioritizer` (componente compartilhado)
Arquivo: `src/modules/okrs/components/wizards/shared/AgendaSuggestionsPrioritizer.tsx`

- Adicionar prop opcional `categoryless?: boolean` (default `false`).
- Quando `categoryless = true`:
  - Esconder o agrupamento por bloco (Performance/Projetos/Pessoas) e os badges de categoria.
  - Renderizar todas as sugestões em uma lista única, com checkbox de priorização + badge `#1/#2/#3` + botão remover (mesmo layout do print).
  - Repassar `categoryless` para o `InlineAgendaSuggestionInput` interno (que já suporta esse modo) — assim o seletor de categoria some no “Adicionar sugestão”.
- Manter 100% do comportamento atual quando `categoryless = false` (Pré-MBR / Pré-QBR não mudam).
- Manter `React.memo` e a regra de até 3 priorizadas.

### 2. Reflexão do Check-in Individual
Arquivo: `src/modules/okrs/components/wizards/collaborator/CollaboratorReflectionStep.tsx`

- Substituir o `InlineAgendaSuggestionInput categoryless` solto pelo `AgendaSuggestionsPrioritizer` com:
  - `ritualLabel="Check-in do Time"`
  - `categoryless`
- Remover a prop `agendaTriggerLabel` desse ponto (o card já cuida do título e do CTA inline).

### 3. Resumo do Check-in Individual
Arquivo: `src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx`

- Adicionar (se ainda não houver) o mesmo card no fim da Summary, replicando o padrão do `MbrPreSummary`:
  ```tsx
  {onAgendaSuggestionsChange && (
    <AgendaSuggestionsPrioritizer
      suggestions={agendaSuggestions}
      onSuggestionsChange={onAgendaSuggestionsChange}
      ritualLabel="Check-in do Time"
      categoryless
    />
  )}
  ```
- Garantir que as props `agendaSuggestions` e `onAgendaSuggestionsChange` chegam até a Summary a partir de `CollaboratorCheckinPage` (já existem; só precisa propagar se faltar).

### 4. Pendências (sem mudança de UI)
A etapa **Pendências** (`CollaboratorDecisionsStep`) continua com o `InlineAgendaSuggestionInput` inline atual — o usuário não pediu o card cheio lá, e a priorização fica concentrada na Reflexão + Resumo, igual ao padrão do Pré-MBR.

## Detalhes técnicos

- O tipo `RitualAgendaSuggestion` já aceita `category: RitualBlock | null`, então o modo categoryless não exige migração de dados nem mudança de schema.
- O `InlineAgendaSuggestionInput` já tem o flag `categoryless` — só vamos repassar.
- Manter os campos `prioritized` / `priorityRank` (1|2|3) já existentes; nada novo no payload.
- Sem mudanças em Edge Functions, RLS, query keys ou Supabase.
- Sem alterar os ritos Pré-MBR e Pré-QBR (regressão zero garantida pelo default `categoryless = false`).

## Validação

- Visual no Reflection: card com header `Sugestões de pauta para o Check-in do Time`, hint vazio idêntico ao print, input collapsible sem chips de categoria, lista única com checkbox + badge `#1/2/3` + remover.
- Visual no Summary: mesmo card no fim, com prioridades persistidas vindas da Reflexão.
- Pré-MBR/Pré-QBR continuam idênticos (categorias visíveis, agrupamento por bloco).
- Limite de 3 priorizações funcionando, banner amarelo aparecendo quando há sugestões sem priorização.
