## Diagnóstico (pré-checklist canônico cumprido)

**Sintoma reportado:** ao criar Iniciativa em uma KR de objetivo compartilhado (`/okrs?view=team&team_id=…`), o seletor "Responsável" lista **todos** os usuários da BU em vez de apenas membros do time contribuidor.

**Causa-raiz (não é bug específico de OKR compartilhado):** o `InitiativeDialog` (`src/modules/okrs/components/initiatives/InitiativeDialog.tsx`) chama `useBuUsersDirectory({ pageSize: 200 })` **sem `teamId`**, devolvendo o diretório inteiro da BU. O mesmo problema afeta:
- Campo **Responsável** (combobox custom com `Popover + Command`)
- Campo **Contribuidores** (multi-select custom)

E afeta **toda KR de Time** — não só a contribuidora —, porque `InitiativesList` recebe `krTeamId` (`src/modules/okrs/components/initiatives/InitiativesList.tsx:25,33`) mas **não repassa** ao `InitiativeDialog` (linhas 171–177).

**Padrões canônicos violados:**
- `mem://standards/users/team-filter-includes-subteams` — selects de usuário devem expandir `teamId` para subtimes via `parent_team_id`.
- `mem://features/okrs/contributor-kr-uses-modal` — campo Responsável deve ser escopado por `teamId` (já cumprido em `TeamKrFormDialog` via `BuUserSelect`).
- Reuso de componentes — o projeto já tem `BuUserSelect` e `BuUserMultiSelect` (`src/components/selects/`) que aceitam `teamId` + `includeSubteams` e usam `useBuUsersDirectory` corretamente. O `InitiativeDialog` reimplementou o seletor manualmente, ficando fora do padrão.

## Decisão

**Não criar nada novo.** Refatorar `InitiativeDialog` para:
1. Reutilizar `BuUserSelect` (Responsável) e `BuUserMultiSelect` (Contribuidores) — eliminar a duplicação de combobox manual.
2. Receber `krTeamId` por prop e repassar a esses selects com `includeSubteams`.
3. Atualizar `InitiativesList` para propagar o `krTeamId` que já recebe.

Resultado: o dialog passa a respeitar o time dono da KR — em **OKR próprio** restringe ao time, em **OKR compartilhado** restringe ao time contribuidor (`currentTeamId`, já passado em `ContributingOkrCard.tsx:251`). Vínculo do RLS continua intacto: `okr_initiatives` pertence à KR (`okr_team_key_results`), que pertence ao time correto.

## Mudanças

### 1. `src/modules/okrs/components/initiatives/InitiativeDialog.tsx`
- Adicionar prop opcional `krTeamId?: string`.
- Substituir o `Popover + Command` do **Responsável** por `<BuUserSelect value={formData.owner_user_id} onChange={...} teamId={krTeamId} includeSubteams placeholder="Selecione o responsável" />`.
- Substituir o `Popover + Command` dos **Contribuidores** por `<BuUserMultiSelect value={formData.contributors} onChange={...} teamId={krTeamId} includeSubteams excludeIds={[formData.owner_user_id]} />`.
- Remover imports/estados não mais usados (`useBuUsersDirectory`, `Popover`, `Command`, `ownerOpen`, `contributorsOpen`, `getProfileById`, `toggleContributor`, `removeContributor`).
- Manter a lógica de default owner: usar `useProfileId()` (de `@/hooks/useIdentity`) para inicializar `owner_user_id` com o profile id do usuário atual — equivale ao que já era feito via `profiles.find(p => p.user_id === user.id)`, sem precisar carregar o diretório inteiro.
- Confirmar que `BuUserSelect` aceita `excludeIds`/equivalente; se não, usar prop suportada (ver `src/components/selects/BuUserMultiSelect.tsx`).

### 2. `src/modules/okrs/components/initiatives/InitiativesList.tsx`
- Passar `krTeamId={krTeamId}` ao `<InitiativeDialog>` (linha 171).

### 3. `ContributingOkrCard.tsx` e `ObjectiveListItem.tsx`
- Nenhuma alteração — já passam `krTeamId={currentTeamId}` / `krTeamId={kr.team_id}` ao `InitiativesList`.

### 4. Memória
- Atualizar `mem://features/okrs/contributor-kr-uses-modal` adicionando seção "Iniciativa escopada por teamId" documentando que `InitiativeDialog` agora respeita `krTeamId` (alinhado a `team-filter-includes-subteams`).
- Atualizar `mem://features/okrs/kr-linked-entities-visualization` (se contiver detalhe sobre dialog) — verificar e ajustar se necessário.

## Validação manual pós-deploy

1. KR de Time próprio (`/okrs?view=team&team_id=<X>`) → "Adicionar Iniciativa" → Responsável e Contribuidores listam apenas membros do time `<X>` + subtimes.
2. KR contribuidora em OKR compartilhado → mesmo dialog → lista apenas membros do **time contribuidor** (`currentTeamId`), não do time dono nem da BU inteira.
3. Editar iniciativa existente cujo owner é externo ao time atual → o nome continua sendo exibido (BuUserSelect deve mostrar o owner mesmo fora do escopo, comportamento padrão do componente — confirmar; caso contrário, passar `extraIncludeIds={[initiative.owner_user_id, ...contributors]}`).

## Fora de escopo
- Nenhuma mudança em RLS, schema, RPCs ou novos hooks.
- Nenhuma mudança em `ProjectsForKrSection` (já usa padrões corretos).
