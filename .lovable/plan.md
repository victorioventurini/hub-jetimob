# Diagnóstico

Auditei a fundo o fluxo de arquivamento (que é um soft-delete via `UPDATE deleted_at`) e encontrei **um bug estrutural real** + **um ponto de incerteza que ainda preciso confirmar com o usuário**.

## O bug estrutural (RLS desalinhada do V2)

Política `projects_update` (governa o arquivamento):

```sql
USING/CHECK: is_current_bu(bu_id) AND (
  owner_id = my_profile_id()
  OR is_bu_admin(auth.uid(), bu_id)
  OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
)
```

Ela **não consulta `has_permission()`**, ou seja, ignora completamente os templates V2. Resultado:

- Quem tem template `projects_admin` (com `projects.project.delete:bu` / `update:bu`) **mas não é dono nem líder direto do dono** é silenciosamente barrado pelo banco. A UI (gate V2) libera o botão, e o backend recusa → toast genérico "Sem permissão".
- O mesmo vale para `projects_delete` (já existente) e indiretamente para milestones (`project_milestones_*` provavelmente sofrem do mesmo problema — vou auditar e incluir no fix).

Esse fix é **necessário**, independente do que acontece no caso específico do Uriel.

## O caso específico do Uriel (projeto `98074a55-…`)

- Uriel **é o dono** do projeto (`owner_id = f8afaa82-…416d-…` = profile do Uriel).
- Cliente do app é BU-scoped (header `x-current-bu-id` presente), então `is_current_bu(bu_id)` deveria passar.
- Pela RLS atual, o `UPDATE` deveria ter sucesso.

Se **mesmo assim** o arquivamento falha, há 2 causas possíveis que **só posso confirmar com a evidência empírica que pedi**:

1. O `actorProfileId` resolvido pelo `useIdentity` (durante impersonação) **não bate** com `f8afaa82-…` → gate V2 bloqueia antes de chamar o banco. Toast: "Sem permissão para arquivar este projeto." (lançado no client em `useProjectMutations.ts:211`).
2. O `bu_id` enviado pelo client não bate com o do registro → erro: "BU do projeto … difere do bu_id informado …".

Mas é provável que o usuário esteja relatando o problema **da perspectiva do uso normal** (sem impersonação), e o dono real do projeto seja outra pessoa que não o Uriel-no-comando-agora — nesse caso caímos no bug estrutural acima.

# Plano de execução (em DEFAULT mode)

## Etapa 1 — Diagnóstico empírico (sem mudar código ainda)

- Pedir ao usuário (1) qual mensagem aparece no toast e (2) os logs `[useSoftDeleteProject] result` e `[ProjectDetailPage] permission gate` no console ao tentar arquivar. Isso confirma se é gate de UI, RLS, ou bu_id divergente.
- Em paralelo, posso reproduzir via `browser--navigate_to_sandbox` se o usuário autorizar (sandbox usa a sessão dele).

## Etapa 2 — Migração: alinhar RLS de `projects` ao V2

Substituir as políticas `projects_update` e `projects_delete` para também aceitar `has_permission(my_profile_id(), bu_id, '...:bu')`:

```sql
-- projects_update
USING/CHECK: is_current_bu(bu_id) AND (
  owner_id = my_profile_id()
  OR is_bu_admin(auth.uid(), bu_id)
  OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
  OR has_permission(my_profile_id(), bu_id, 'projects.project.update:bu')
)

-- projects_delete (apenas se ainda houver hard-deletes; soft-delete vai por UPDATE)
USING: is_current_bu(bu_id) AND (
  owner_id = my_profile_id()
  OR is_bu_admin(auth.uid(), bu_id)
  OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
  OR has_permission(my_profile_id(), bu_id, 'projects.project.delete:bu')
)
```

`projects_insert` já casa com `projects.project.create:bu` na lógica do gate V2; vou checar se faz sentido alinhar também (provavelmente sim, para paridade).

## Etapa 3 — Estender o mesmo alinhamento para `project_milestones`

Auditar políticas `project_milestones_*` e aplicar o mesmo padrão (`projects.milestone.update:bu`, `projects.milestone.delete:bu` etc.), porque o problema estrutural é idêntico.

## Etapa 4 — Verificação pós-migration

- `supabase--read_query` para listar políticas atualizadas e confirmar a expressão.
- Reproduzir o arquivamento na sandbox como Uriel para confirmar sucesso (ou pedir validação ao usuário no preview).
- Atualizar `mem://features/projects/holistic-module-architecture-v2` registrando que a RLS do módulo Projects passa a respeitar V2 (`has_permission`) além de owner/leader/admin.

# Riscos / observações

- A política V2 é **aditiva** (OR): nenhum usuário perde acesso; apenas usuários com template ganham acesso que já está prometido pela UI.
- Não toco em soft-delete em cascata de milestones — fora do escopo desse pedido.
- Não estamos enfraquecendo isolamento de BU: `is_current_bu(bu_id)` continua obrigatório.

Confirma para eu prosseguir? (Em paralelo, mande os 2 dados do console que pedi — eles definem se a Etapa 1 termina rápido ou se preciso investigar algo extra antes da Etapa 2.)
