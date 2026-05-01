## Problema

No step **Iniciativas** do `/rituals/collaborator-checkin`, o usuário `4e5985d2…` vê o empty state, mesmo possuindo **9 iniciativas no ciclo ativo (Q2 2026)**.

### Causa raiz

`CollaboratorInitiativesStep` busca iniciativas via `kr_id IN krIds`, com `krIds` derivados do array `krs` (vindo de `useUserKrsForWizard`). Hoje:

- `useUserKrsForWizard` traz KRs onde o usuário é **owner / co-resp / owner-de-iniciativa** (TCR §4.8 — Collaborator Check-in).
- O step então depende transitivamente dessa lista. Se algum KR não entrar nela (por filtro de status, ciclo, RLS), todas as iniciativas daquele KR somem.
- O step **nunca considera `contributors[]`** de `okr_initiatives`, então iniciativas em que o colaborador é apenas contribuidor jamais aparecem.

A correção é centrar a query na **iniciativa do colaborador** (owner OR contributor) no ciclo ativo, e derivar agrupamento por KR a partir desse conjunto.

### Pré-checklist consultado

- TCR §4.8 (Collaborator Check-in — Filtro de KRs) e §**okr_initiatives** (cols `owner_user_id`, `contributors uuid[]`).
- `IDENTITY_CONVENTION.md`: `okr_initiatives.owner_user_id → profiles.id` (usar `effectiveUserId` profile-id, não `auth.uid`).
- `DEVELOPMENT_STANDARDS.md`: query keys via helpers, soft-delete obrigatório, sem `select('*')`, BU-scoped client.
- Memórias core: BU isolation, soft deletes, query optimization, query keys, no-render-side-effects (mantido).
- Memórias relevantes: `wizards-master-standard`, `kr-linked-entities-visualization`, `collaborator-checkin-pending-items-step`, `off-cycle-accessibility-standard`.

### Divergência canônica criada

Hoje o filtro de KRs **não** considera `contributors[]`. Após esta mudança, iniciativas mostradas no step incluem aquelas em que o colaborador é só `contributors[]` — KR pode não estar em `useUserKrsForWizard`. Esta expansão será **canonizada** (TCR §4.8 + nova memória).

## Mudanças

### 1. `CollaboratorInitiativesStep.tsx` — fonte de dados centrada no colaborador

Substituir a query atual (`kr_id IN krIds`) por:

- `from('okr_initiatives')` selecionando colunas explícitas (sem `*`) **+ join inner** em `okr_team_key_results!inner(id, title, team_objective:okr_team_objectives!inner(id, title, cycle_id, cancelled_at, deleted_at))`.
- Filtros:
  - `or('owner_user_id.eq.<id>,contributors.cs.{<id>}')` — owner OU contributor.
  - `eq('okr_team_key_results.team_objective.cycle_id', cycleId)`.
  - `is('okr_team_key_results.team_objective.cancelled_at', null)` + `deleted_at` null.
  - `is('deleted_at', null)` + `is('cancelled_at', null)` na própria iniciativa.
- `enabled: !!effectiveUserId && !!cycleId`.
- `select` retorna o `kr.title` embutido para permitir agrupamento mesmo quando o KR não está no array `krs`.

### 2. Props e wiring

- Adicionar prop `cycleId: string | null` em `CollaboratorInitiativesStepProps`.
- Em `CollaboratorCheckinPage.tsx`, passar `cycleId={quarterlyCycle?.id ?? null}`.
- Manter `krs` como prop apenas para enriquecimento de exibição (badges, projetos vinculados via `project_krs`); a lista de iniciativas passa a ser independente.

### 3. Agrupamento e empty state

- `initiativesByKr` é montado a partir das iniciativas retornadas (Map<krId, Initiative[]>).
- Loop de renderização passa a iterar sobre as chaves do `Map` (KRs efetivamente com iniciativas), ordenando por título do KR.
- Empty state canônico (já implementado) permanece — exibido somente quando a query retorna 0.
- Footer canônico (`Voltar / Pular / Continuar`) sem alterações.

### 4. Query keys (helper centralizado)

- Adicionar em `src/lib/queryKeys/okrs.ts`:
  ```ts
  initiativesForCollaborator: (buId, cycleId, profileId) =>
    [...prefix, 'initiatives', 'collaborator', buId, cycleId, profileId] as const
  ```
- O step passa a usar este helper. A chave atual `initiativesByKrs` continua válida em outros consumidores.

### 5. Projetos vinculados

- `project_krs` continua, mas `krIds` passa a ser `Array.from(initiativesByKr.keys())` (KRs realmente presentes nas iniciativas do colaborador), evitando fetch de projetos para KRs que não vão ser exibidos.

### 6. Edição inline

- Em `InitiativesSummary` o `canEdit` segue `init.owner_user_id === effectiveUserId`. Contributors visualizam mas não editam — coerente com RLS.

### 7. Atualização canônica (obrigatório por divergência)

- Atualizar `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` §4.8 — Collaborator Check-in, adicionando subseção **"Filtro de Iniciativas do Step"**:
  - Owner OR contributor no ciclo ativo, independentemente do filtro de KRs.
  - Edição restrita ao owner.
- Criar memória `mem://features/rituals/collaborator-initiatives-step-scope` com a regra acima e referência ao TCR.
- Atualizar `mem://index.md` (seção "Memories — Rituais específicos").

## Não fazer

- Não duplicar componentes: reutilizar `InitiativesSummary`, `InitiativeQuickUpdateDialog`, `WizardStepScaffold/Header/Footer`, `EmptyState`.
- Não alterar `useUserKrsForWizard` (escopo de KR continua o mesmo — TCR §4.8 mantido).
- Não tocar em RLS de `okr_initiatives` (`okrs.initiative.read:team_tree` ou `okrs.view:bu` já cobre o usuário logado lendo iniciativas onde é owner/contributor).
- Não mexer em business logic dos demais steps.
- Não introduzir `select('*')` nem queries fora do `useBuScopedSupabase`.

## Validação

1. `?user=4e5985d2…&step=initiatives`: deve listar as 9 iniciativas do Q2 2026 agrupadas por KR (incluindo KRs em que ele só é owner-de-iniciativa).
2. Usuário sem owner/contributor no ciclo ativo: empty state canônico + footer Voltar/Pular/Continuar.
3. Marcar/desmarcar "em risco" continua funcionando.
4. `InitiativeQuickUpdateDialog` abre apenas para iniciativas onde `owner_user_id === effectiveUserId`.
5. Colaborador que é apenas `contributors[]` em uma iniciativa: vê o card, **não** edita.

## Arquivos afetados

- `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx` (fetch + agrupamento + nova prop `cycleId`).
- `src/modules/okrs/pages/CollaboratorCheckinPage.tsx` (passar `cycleId`).
- `src/lib/queryKeys/okrs.ts` (helper `initiativesForCollaborator`).
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (§4.8 — nova subseção).
- `mem://features/rituals/collaborator-initiatives-step-scope` (nova) + `mem://index.md`.
