## Card de sugestão de pauta no Reflection (Check-in Individual) → Pré Check-in do Time

Hoje, o Reflection step do `collaborator-checkin` já tem props (`agendaSuggestions`, `onAgendaSuggestionsChange`, `agendaTriggerLabel`) integradas com `InlineAgendaSuggestionInput`, mas o `CollaboratorCheckinPage` **não passa nenhuma delas** — o card simplesmente não renderiza. O componente compartilhado também exige uma das 3 categorias canônicas (`performance | projetos | pessoas`), enquanto o pedido é **sem categoria**. E o fluxo precisa chegar no `leader-prep` (Pré-Check-in do Time) para o líder decidir o que entra no `team-checkin` (Check-in do Time).

A entrega, em 4 camadas, **estende** o que já existe — sem duplicar componentes.

### 1. Estender `InlineAgendaSuggestionInput` (modo categoryless)

- Adicionar prop opcional `categoryless?: boolean` (default `false`).
- Quando `true`:
  - Esconde o seletor de categoria (chips Performance/Projetos/Pessoas).
  - Esconde o badge de categoria no `renderItem`.
  - Grava `category: null` (ver mudança de tipo abaixo).
- Sem regressão para MBR-pré, QBR-pré e demais consumidores: comportamento atual permanece padrão.

### 2. Tipo `RitualAgendaSuggestion`

- Tornar `category` **opcional/nullável**: `category?: RitualBlock | null`.
- Manter `prioritized`/`priorityRank` intactos (líder ainda prioriza).
- Atualizar leitores que assumem `category` definido para tratar `null` ("Sem categoria"/badge neutro): `AgendaSuggestionsPrioritizer`, `MbrPreSummary`, `QbrPreSummary`. Sem regressão visual nos consumidores antigos (sempre passam categoria).

### 3. Wiring no Reflection do `collaborator-checkin`

- Em `CollaboratorCheckinPage.tsx`:
  - Adicionar campo `teamCheckinAgendaSuggestions: RitualAgendaSuggestion[]` em `CollaboratorDraftData` (default `[]`).
  - No `case 'reflection'`, passar `agendaSuggestions`, `onAgendaSuggestionsChange` e `agendaTriggerLabel="Sugerir pauta para o Check-in do Time"`.
- Em `CollaboratorReflectionStep.tsx`:
  - Repassar `categoryless` ao `InlineAgendaSuggestionInput`.
- Em `CollaboratorSummary.tsx`:
  - Renderizar nova micro-seção "Sugestões para o Check-in do Time" (depois de Reflexão).
  - Incluir as sugestões no Markdown do "Copiar resumo".

### 4. Consumo no `leader-prep` (Pré-Check-in do Time)

- Novo hook `useTeamCollaboratorAgendaSuggestions(teamId, weekRef)` em `src/modules/okrs/hooks/`:
  - Lê `okr_wizard_sessions` com `wizard_type='collaborator-checkin'`, `status='completed'`, semana corrente.
  - Filtra por `currentBuId` síncrono (BU isolation).
  - Filtra colaboradores do `teamId` (expandindo subteams via `parent_team_id` — `mem://standards/users/team-filter-includes-subteams`).
  - `select` explícito: `id, started_by, completed_at, data` (nunca `select('*')`).
  - Extrai `data.teamCheckinAgendaSuggestions` e agrega.
  - Resolve nome do autor por ID via lookup separado (não denormalizar — `mem://standards/wizard-snapshot-denormalized-fields-deprecation`).
  - Retorna `{ id, text, suggestedBy, suggestedByName, createdAt }[]`.
  - Query key via `src/lib/queryKeys/okrs.ts` (novo prefixo `agendaSuggestionsByTeamWeek`).
- Em `LeaderPrepPage` (step `prep` ou bloco em `LeaderOverviewStep`):
  - Renderizar bloco "Sugestões dos colaboradores" com **autor + texto**, sem categoria.
  - Permitir o líder marcar quais entram na pauta do Check-in do Time (reaproveitar lógica de priorização do `AgendaSuggestionsPrioritizer` em modo `categoryless`).
  - Persistir seleção em `LeaderPrepDraftData.selectedTeamCheckinAgendaSuggestionIds: string[]`.
- Em `team-checkin` (`TeamOpeningStep`):
  - Ler do snapshot do `leader-prep` mais recente as sugestões selecionadas e mostrá-las como pauta inicial (leitura derivada — sem mutação).

### Princípios e conformidade

- **Reuso primeiro**: `InlineAgendaSuggestionInput`, `AgendaSuggestionsPrioritizer`, `useGenericWizardDraft`, `WizardStepFooter`. Zero componente novo.
- **BU Isolation**: hook do líder filtra por `currentBuId` síncrono.
- **Soft delete**: `okr_wizard_sessions` não tem `deleted_at` — filtrar por `status='completed'` + janela temporal.
- **Sem `select('*')`** e **`React.memo`** nos cards de sugestão.
- **Snapshot**: campo novo só dentro do JSONB do draft — sem migração de schema.
- **TCR/Wizards Framework**: alterações em renderers específicos e shared utils, não em `framework/components/`.

### Critérios de aceitação

- No `?step=reflection`, aparece o card collapsible "Sugerir pauta para o Check-in do Time" sem chips de categoria.
- Sugestões persistem no draft e aparecem no `summary` antes de Concluir.
- Após Concluir, o líder no `leader-prep` da mesma semana vê as sugestões agregadas dos colaboradores do time (com autor).
- O líder seleciona quais entram no Check-in do Time; seleção fica no draft do `leader-prep`.
- No `team-checkin` da mesma semana, as sugestões selecionadas aparecem como pauta inicial.
- Nenhum consumidor existente (MBR-pré, QBR-pré) regrediu visualmente — categoria continua presente lá.

### Fora de escopo

- Nenhuma migração/RLS/schema novo.
- Nenhum componente visual novo (apenas extensão dos existentes).
- Sem mexer em `kpi_values`, `okr_checkins`, decisões, milestones.
- Sem tocar shell, footer, draft hydration ou outros steps.

### Arquivos afetados

- `src/modules/okrs/components/wizards/shared/InlineAgendaSuggestionInput.tsx`
- `src/modules/okrs/components/wizards/shared/AgendaSuggestionsPrioritizer.tsx`
- `src/modules/okrs/types/wizard/shared.ts`
- `src/modules/okrs/components/wizards/collaborator/CollaboratorReflectionStep.tsx`
- `src/modules/okrs/components/wizards/collaborator/CollaboratorSummary.tsx`
- `src/modules/okrs/pages/CollaboratorCheckinPage.tsx`
- `src/modules/okrs/hooks/useTeamCollaboratorAgendaSuggestions.ts` (novo)
- `src/lib/queryKeys/okrs.ts`
- `src/modules/okrs/components/wizards/leader-prep/LeaderOverviewStep.tsx`
- `src/modules/okrs/pages/LeaderPrepPage.tsx`
- `src/modules/okrs/components/wizards/team-checkin/TeamOpeningStep.tsx`
