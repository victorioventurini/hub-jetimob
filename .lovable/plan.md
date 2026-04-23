
## Corrigir falso positivo de permissão no arquivamento de Projetos — RLS está certa, UI está errada

### Pré-checklist obrigatório executado
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` — Módulo Projetos v1.4, permission keys e hook `useProjectPermissionsV2`
- `docs/canonical/IDENTITY_CONVENTION.md` — mutations e ownership devem usar `profile_id`/`useIdentity`
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` — scopes `bu` vs `self_or_owner`
- `docs/canonical/DATA_MODEL_REGISTRY.md` + `SCHEMA_QUICK_REFERENCE.md` — tabela `projects`, ownership em `owner_id`, memberships
- `docs/canonical/DEVELOPMENT_STANDARDS.md` — `self_or_owner` significa “apenas recursos próprios/owner”
- `docs/canonical/BU_SCOPED_SUPABASE_RULES.md` + `QUERY_KEYS_STANDARD.md`
- Memórias relevantes: `mem://features/projects/holistic-module-architecture-v2`, `mem://standards/soft-delete-policy-v1`, `mem://standards/query-key-prefix-standard`

### Causa raiz confirmada
O erro persistente **não é mais de header BU stale**. O banco já está com:
- `current_bu_id()` robusta
- `projects_update` com `WITH CHECK = profile_has_bu_access(...)`

Mesmo assim o `UPDATE` falha porque o usuário atual **não é owner/admin/líder do owner**.

Evidências confirmadas:
- Projeto `98074a55-c388-4282-a093-f0eaa3bf1b22`:
  - `bu_id = a0000000-0000-0000-0000-000000000001`
  - `owner_id = f8afaa82-416d-4a29-86a2-65ebc4ec4b76` (Uriel)
- Usuário autenticado atual:
  - profile `140b6fdc-31f7-4615-83ed-fcdab4849c6c`
  - role global `external`
  - membership na BU como `external`
- Policy atual de `projects_update`:
```sql
USING (
  is_current_bu(bu_id)
  AND (
    owner_id = my_profile_id()
    OR is_bu_admin(auth.uid(), bu_id)
    OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
  )
)
```

Logo, o RLS está fazendo o correto: **bloqueando arquivamento de projeto de outra pessoa**.

### Bug real no frontend
A UI está expondo ação de “arquivar” de forma indevida.

Hoje:
- `useProjectPermissionsV2` retorna:
  - `canEditProject`
  - `canEditOwnProject`
  - `canDeleteProject`
- `ProjectDetailPage` usa:
```ts
{canDeleteProject && <Button ... />}
```
e
```ts
{canEditProject && <Button ... />}
```

Isso ignora a semântica do scope `self_or_owner`.

Pelo padrão canônico:
- `projects.project.delete:self_or_owner` = só pode arquivar **projeto próprio**
- `projects.project.update:self_or_owner` = só pode editar **projeto próprio**

Ou seja: a permissão “self_or_owner” precisa ser combinada com **`project.owner_id === writerProfileId`** antes de liberar CTA.

### Correção proposta

#### 1. Tornar a autorização do detalhe “row-aware”
No `ProjectDetailPage.tsx`:
- usar `writerProfileId = realProfileId ?? profileId`
- derivar flags por registro:
```ts
const isOwner = !!writerProfileId && project.owner_id === writerProfileId;

const canEditThisProject =
  canEditProject || (canEditOwnProject && isOwner);

const canDeleteThisProject =
  canDeleteProject && isOwner;
```

Aplicar essas flags em:
- botão Editar
- botão Arquivar
- seções editáveis do projeto (`ProjectKrLinkSection`, etc.) quando dependerem de ownership

Observação:
- `hasFullAccess`/admin já está embutido em `canEditProject`
- para delete, se houver admin com wildcard, `canDeleteProject` continuará `true`

#### 2. Endurecer `useProjectPermissionsV2` para não induzir erro de uso
Ajustar o hook para deixar explícita a diferença entre:
- permissão estrutural (`canDeleteProjectOwn`, `canEditProjectOwn`)
- permissão ampla de BU (`canEditProjectAny`)
- helper por entidade

Abordagem preferida:
```ts
canEditProjectAny
canEditOwnProject
canDeleteOwnProject
canEditProjectRecord(ownerId, actorProfileId)
canDeleteProjectRecord(ownerId, actorProfileId)
```

Assim o hook vira SSOT semântica e reduz regressão em outras telas.

#### 3. Corrigir feedback do mutation
Em `useSoftDeleteProject`, mapear erro RLS/42501 para mensagem amigável:
- atual: `new row violates row-level security policy...`
- novo: `Você não tem permissão para arquivar este projeto.`

Isso não substitui a correção da UI; é defesa em profundidade caso:
- haja cache de permissões
- ação seja disparada por chamada direta
- outra tela ainda exponha CTA indevido

#### 4. Auditar outras superfícies do módulo Projects
Verificar se a mesma falha existe em:
- cards/tabelas/listagens de projetos
- ações inline de edição
- qualquer CTA que use `self_or_owner` sem comparar `owner_id`

Ponto crítico:
- `ProjectDetailPage` já confirmado
- revisar `ProjectsTable`, `ProjectCard`, `ProjectsPage` e ações relacionadas

#### 5. Cobertura de testes
Atualizar/adicionar testes para garantir:

**`useProjectPermissionsV2.test.ts`**
- owner + `update:self_or_owner` => pode editar próprio
- não-owner + `update:self_or_owner` => não pode editar este projeto
- owner + `delete:self_or_owner` => pode arquivar próprio
- não-owner + `delete:self_or_owner` => não pode arquivar este projeto
- admin/wildcard => pode editar/arquivar qualquer projeto

**`ProjectDetailPage.test.tsx`**
- oculta botão de arquivar quando usuário não é owner
- exibe botão de arquivar quando usuário é owner
- exibe botão de arquivar para admin
- clique indevido não ocorre em cenário não-owner

### Por que não mexer mais no banco
Não há evidência nova de bug no RLS de `projects`.
O banco está barrando corretamente um usuário sem ownership/admin/leadership.

Mudar policy agora:
- abriria risco de segurança
- mascararia bug de autorização visual
- violaria a semântica canônica de `self_or_owner`

### Arquivos a ajustar
- `src/modules/projects/hooks/useProjectPermissionsV2.ts`
- `src/modules/projects/pages/ProjectDetailPage.tsx`
- possivelmente:
  - `src/modules/projects/components/ProjectCard.tsx`
  - `src/modules/projects/components/ProjectsTable.tsx`
  - `src/modules/projects/pages/ProjectsPage.tsx`
- testes:
  - `src/modules/projects/hooks/useProjectPermissionsV2.test.ts`
  - `src/modules/projects/pages/__tests__/ProjectDetailPage.test.tsx`

### Resultado esperado após o hotfix
1. Usuário que não é owner/admin/líder **não verá** botão de arquivar.
2. Owner/admin continuará conseguindo arquivar normalmente.
3. Se alguma chamada indevida escapar, o toast será claro e amigável, sem mensagem crua de RLS.
4. O módulo Projects ficará alinhado com o padrão canônico de scope `self_or_owner`.

### Nota técnica importante
As mudanças anteriores em `current_bu_id()` e query keys continuam válidas como hardening geral, mas **não resolvem este incidente específico**. O incidente atual é de **mismatch entre permissão semântica e renderização da UI**, não de BU context.
