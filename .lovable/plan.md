## Plano v1.9 — Acesso a Projetos Arquivados

### Pré-checklist (concluído)
- TCR + IDENTITY_CONVENTION + PERMISSIONS_AND_RBAC_MODEL + DATA_MODEL_REGISTRY consultados.
- Memória `mem://features/projects/holistic-module-architecture-v2` (v1.8 atual) revisada.
- RLS atual de `projects` confirmada: `projects_select` filtra `deleted_at IS NULL` no DB → `SELECT` direto nunca retorna arquivado, mesmo para `super_admin`. Necessário Security Definer.

### Decisões confirmadas
1. Reusar matriz canônica de archive/update (super_admin OR bu_admin OR owner OR líder do owner OR `projects.project.update:bu`). Sem criar `projects.project.restore:*`.
2. Detalhe arquivado é 100% read-only (sem editar projeto, sem CRUD de milestones, comentários só leitura).
3. Filtro default `archived_state = 'active'` — `/projects` continua mostrando só ativos como hoje.

---

### 1. Backend — Migration (Security Definer RPCs)

Nova migration `supabase/migrations/[ts]_project_archived_access.sql`:

- `list_archived_projects()` → retorna projetos arquivados da BU corrente (`current_bu_id()`), filtrados pela matriz canônica (admin vê todos da BU; usuário com `update:bu` idem; owner/líder vê os seus). Retorna `SETOF projects`.
- `get_archived_project_v2(p_project_id uuid)` → retorna jsonb único do projeto arquivado + relações mínimas necessárias para a página de detalhe. Valida BU + autorização canônica.
- `restore_project_v2(p_project_id uuid) RETURNS jsonb` → autorização canônica, `UPDATE projects SET deleted_at = NULL, updated_at = now() WHERE id = p_project_id`. Códigos: `RESTORED`, `NOT_FOUND`, `FORBIDDEN`, `NOT_ARCHIVED`.

Permissões: `GRANT EXECUTE ... TO authenticated`. Autorização real é feita dentro das funções.

### 2. Frontend — Tipos & Filtros

- `src/modules/projects/types.ts`: adicionar `archived_state?: 'active' | 'archived' | 'all'` em `ProjectFilters` (default `'active'` quando ausente).
- `src/modules/projects/components/ProjectFiltersBar.tsx`: novo `UrlSelect` "Visualização" com opções Ativos / Arquivados / Todos (`triggerClassName="w-full sm:w-[160px]"`).
- `src/modules/projects/pages/ProjectsPage.tsx`: incluir `archived_state` no `useUrlState` (default `'active'`).

### 3. Frontend — Hooks

- `src/modules/projects/hooks/useProjects.ts`:
  - Se `filters.archived_state === 'active'` → fluxo atual (sem mudança).
  - Se `'archived'` → chamar `supabase.rpc('list_archived_projects')` e mapear no mesmo formato `ProjectWithRelations` (relações vêm vazias/leves; OK para listagem). Query key inclui `archived_state`.
  - Se `'all'` → unir `'active' + 'archived'` em duas queries paralelas e concatenar.
- `src/modules/projects/hooks/useProject.ts`:
  - Mantém SELECT atual primeiro.
  - Se `data === null` → fallback para `supabase.rpc('get_archived_project_v2', { p_project_id })`. Marcar resultado com flag `is_archived: true` (campo derivado).
- `src/modules/projects/hooks/useProjectMutations.ts`:
  - Novo hook `useRestoreProject()` chamando `restore_project_v2`. Toasts mapeados por código (`RESTORED`, `FORBIDDEN`, `NOT_FOUND`, `NOT_ARCHIVED`). Invalidar `projectsKeys.allPrefix()` no sucesso.
- `src/lib/queryKeys/projects.ts`: garantir que `list(buId, filters)` já serializa `archived_state` (é genérico → ok via `JSON.stringify(filters)`).

### 4. Frontend — UI Detalhe

- `src/modules/projects/pages/ProjectDetailPage.tsx`:
  - Quando `project.is_archived` (ou `project.deleted_at != null`):
    - Banner `<Alert variant="warning">` no topo: "Este projeto está arquivado. As edições estão desabilitadas.".
    - Botão "Restaurar projeto" (gated pela mesma matriz já usada para arquivar via `useProjectPermissionsV2.canDeleteProjectRecord`).
    - Esconder/desabilitar: botão Editar, botão Arquivar, botão Novo milestone, ações de milestone (editar/excluir/notas), input de comentários.
  - Tabela de milestones e comentários renderizam em modo leitura.

### 5. Documentação

- `.lovable/memory/features/projects/holistic-module-architecture-v2.md` → bump v1.9 com seção "Acesso a Projetos Arquivados" (filtro, RPCs, autorização canônica, read-only).

### 6. Testes

- `src/modules/projects/hooks/__tests__/useProjectMutations.test.ts` (ou novo): cobrir `useRestoreProject` com códigos `RESTORED`, `FORBIDDEN`, `NOT_FOUND`, `NOT_ARCHIVED`.
- `src/modules/projects/pages/__tests__/ProjectsPage.test.tsx`: cobrir filtro `archived_state` (mock de `useProjects`).

---

### Arquivos afetados

Novos:
- `supabase/migrations/[timestamp]_project_archived_access.sql`

Editados:
- `src/modules/projects/types.ts`
- `src/modules/projects/components/ProjectFiltersBar.tsx`
- `src/modules/projects/pages/ProjectsPage.tsx`
- `src/modules/projects/pages/ProjectDetailPage.tsx`
- `src/modules/projects/hooks/useProjects.ts`
- `src/modules/projects/hooks/useProject.ts`
- `src/modules/projects/hooks/useProjectMutations.ts`
- `.lovable/memory/features/projects/holistic-module-architecture-v2.md`
- Testes correspondentes

### Fora de escopo
- Soft-delete cascade de milestones (já existe).
- Ações em massa (restaurar múltiplos).
- Permissão dedicada `restore:*` (decidido reusar matriz canônica).
