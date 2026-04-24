
## Diagnóstico (TCR + canônicos consultados)

**Documentação consultada:**
- `mem://features/projects/holistic-module-architecture-v2` (v1.6/1.7) — autorização canônica de projetos
- `docs/canonical/RBAC_TEMPLATES_V3.md` — modelo de templates e bypass de admin
- `docs/engineering/IDENTITY_CONVENTION.md` — `realProfileId` para mutations
- `mem://standards/soft-delete-policy-v1` — soft-delete com RLS
- `mem://auth/identity-rbac-master` — 5-níveis e impersonação

**Evidências coletadas no banco (read-only):**
1. `projects_update` e `projects_delete` **já têm bypass** por `is_super_admin(auth.uid())` e `is_bu_admin(auth.uid(), bu_id)` — RLS está correta.
2. victorio@jetimob.com é `super_admin` global em `user_roles` e tem membership na BU `a000…0001` (BU do projeto `98074a55…`).
3. `is_super_admin('dcb85e6f…')` = **true**, `is_bu_admin('dcb85e6f…', 'a000…0001')` = **true** para o projeto-alvo.
4. `postgres_logs` (últimas 6h) **não tem nenhum ERROR de RLS** — o banco **não** está rejeitando a operação.

**Causa raiz do toast "Você não tem permissão para arquivar esse projeto":**

Está em `src/modules/projects/hooks/useProjectMutations.ts`:
- `useSoftDeleteProject` faz um **PROBE SELECT** antes do UPDATE (linha 170). A policy `projects_select` exige `is_current_bu(bu_id)` — e essa função **só** dá bypass para `is_platform_admin`, não respeita `is_super_admin` quando o header `x-current-bu-id` não bate com `project.bu_id` (caso comum em troca de BU/impersonação/bundle stale).
- Quando o probe retorna `null`, o hook lança `"Projeto não encontrado nesta BU"` ou — no `useUpdateProject` — converte `count=0` em **erro forjado 42501 "Sem permissão"** (linhas 113-116). O `onError` então casa com a regex `/sem permiss/i` e mostra o toast errado.
- Mesmo o UPDATE final (linha 193) usa `.eq('bu_id', bu_id).is('deleted_at', null)`: se houver qualquer drift de BU contextual ou concorrência, retorna 0 rows silenciosamente.

**Conclusão:** o problema é de arquitetura do hook, não de RLS. A solução canônica é **mover as mutações para RPCs `SECURITY DEFINER`** que validam permissão server-side e retornam código categorizado, eliminando a dependência do probe SELECT e do `count=0`.

---

## Plano de Ação

### 1. Migration: criar RPCs `SECURITY DEFINER`

Criar `supabase/migrations/<ts>_project_archive_update_rpcs.sql` com:

#### `archive_project_v2(p_project_id uuid) RETURNS jsonb`
- `SECURITY DEFINER`, `SET search_path = public`
- Resolve `actor_profile := my_profile_id()` e `auth_uid := auth.uid()`.
- Lê o projeto via `SELECT id, bu_id, owner_id, deleted_at FROM projects WHERE id = p_project_id` (sem RLS porque é DEFINER).
- Se não existir → `RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND')`.
- Se `deleted_at IS NOT NULL` → idempotente: `RETURN jsonb_build_object('ok', true, 'code', 'ALREADY_ARCHIVED')`.
- Autoriza se **qualquer** for verdadeiro (mesma regra canônica v1.6):
  - `is_super_admin(auth_uid)`
  - `is_bu_admin(auth_uid, bu_id)`
  - `owner_id = actor_profile`
  - `is_leader_of_project_owner(actor_profile, owner_id, bu_id)`
  - `has_permission(actor_profile, bu_id, 'projects.project.delete:bu')`
- Caso contrário → `RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN')`.
- Se autorizado → `UPDATE projects SET deleted_at = now() WHERE id = p_project_id` e retorna `{ ok: true, code: 'ARCHIVED', project_id, bu_id }`.
- `GRANT EXECUTE ON FUNCTION archive_project_v2(uuid) TO authenticated`.

#### `update_project_v2(p_project_id uuid, p_payload jsonb) RETURNS jsonb`
- Mesma estrutura de autorização (usando `'projects.project.update:bu'` na key permission).
- `p_payload` aceita whitelist de campos: `name, description, owner_id, status, start_date, due_date, external_url`.
- Aplica `UPDATE` com `COALESCE` por campo presente no JSONB.
- Retorna `{ ok: true, code: 'UPDATED', project_id }` ou erro categorizado.
- `team_ids` continua sendo sincronizado pelo hook (não entra na RPC para manter a função enxuta — a RLS de `project_teams` herda via JOIN com `projects` e isso já funciona via bypass de admin).

### 2. Refator `src/modules/projects/hooks/useProjectMutations.ts`

#### `useSoftDeleteProject`
- Substituir todo o corpo da `mutationFn` por chamada `supabase.rpc('archive_project_v2', { p_project_id: id })`.
- Mapear retorno por `code`:
  - `ARCHIVED`/`ALREADY_ARCHIVED` → success.
  - `NOT_FOUND` → `toast.error('Projeto não encontrado.')`.
  - `FORBIDDEN` → `toast.error('Você não tem permissão para arquivar este projeto.')`.
- Remover probe pré-update e remover dependência de `bu_id` no input (mas manter o campo opcional para compat — descartado no payload da RPC).

#### `useUpdateProject`
- Substituir o UPDATE direto por `supabase.rpc('update_project_v2', { p_project_id, p_payload })`.
- Remover bloco "count=0 → forge 42501" (a RPC retorna código real).
- Manter sync de `team_ids` (delete + reinsert) **após** RPC retornar `ok: true`. Esse passo herda permissão via JOIN com `projects` — RLS já trata.

### 3. Atualizar `src/modules/projects/types.ts`
- `SoftDeleteProjectInput.bu_id` permanece (compat retroativa) mas vira opcional comentado como deprecated.

### 4. Testes
- Atualizar `src/modules/projects/hooks/__tests__/useProjectPermissionsV2.test.ts` adicionando case explícito de `super_admin` (`isAdmin: true`) → `canDeleteProjectRecord(any, any) === true`.
- Atualizar `src/modules/projects/pages/__tests__/ProjectDetailPage.test.tsx` com mock de `supabase.rpc('archive_project_v2', …)` retornando `{ ok: true, code: 'ARCHIVED' }` para o cenário super_admin.

### 5. Documentação
- Atualizar `.lovable/memory/features/projects/holistic-module-architecture-v2.md` para v1.8: soft-delete e update agora canalizados via RPC `archive_project_v2`/`update_project_v2`. Manter a regra de autorização canônica idêntica (não muda a semântica — só centraliza a verificação no banco).

---

## Arquivos afetados

- **NEW** `supabase/migrations/<ts>_project_archive_update_rpcs.sql`
- **EDIT** `src/modules/projects/hooks/useProjectMutations.ts`
- **EDIT** `src/modules/projects/types.ts` (campo `bu_id` opcional em `SoftDeleteProjectInput`)
- **EDIT** `src/modules/projects/hooks/__tests__/useProjectPermissionsV2.test.ts`
- **EDIT** `src/modules/projects/pages/__tests__/ProjectDetailPage.test.tsx`
- **EDIT** `.lovable/memory/features/projects/holistic-module-architecture-v2.md` (v1.8)

## Fora de escopo
- Não toca em `projects_select` policy (não precisa — a RPC contorna a fragilidade do probe).
- Não toca em `useCreateProject` (criação não tem o problema de probe).
- Não toca no fluxo de milestones (já refatorado em v1.7).

**Posso executar?**
