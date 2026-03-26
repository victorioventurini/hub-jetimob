

# Plano: Paridade de Permissões do Módulo Projetos

## Diagnóstico

O módulo Projetos tem **4 lacunas críticas** em relação aos módulos maduros (Assets, OKRs, Tickets):

| Item | Assets/OKRs | Projetos |
|------|-------------|----------|
| `MODULE_VIEW_PERMISSIONS` map | ✅ Mapeado | ❌ Ausente — sidebar/rota não verifica permissão |
| Hook `useXxxPermissionsV2` | ✅ `useAssetPermissionsV2` | ❌ Não existe |
| Templates no DB | ✅ 17 templates com keys | ❌ 8 keys no catálogo, 0 templates |
| Guards no UI | ✅ Botões/ações condicionais | ❌ Tudo visível para todos |

As 8 permission keys já existem no catálogo (`projects.project.read:bu`, `.create:bu`, `.update:bu`, `.delete:self_or_owner`, `projects.milestone.read/create/update:bu`), mas **nenhum template as distribui** e **nenhum código as consulta**.

---

## Plano de Implementação (6 passos)

### 1. Registrar `projects` no `MODULE_VIEW_PERMISSIONS`
**Arquivo:** `src/hooks/useModuleAccess.ts`

Adicionar entrada `projects` com as keys de visualização:
```typescript
projects: [
  "projects.project.read:bu",
  "projects.milestone.read:bu",
],
```

Isso habilita o guard de sidebar e o `ModuleRoute` para o módulo.

### 2. Criar `useProjectPermissionsV2` hook
**Arquivo:** `src/modules/projects/hooks/useProjectPermissionsV2.ts`

Seguindo o padrão exato do `useAssetPermissionsV2`:
- `hasFullAccess` (admin/wildcard/impersonação)
- `canViewProjects` — `projects.project.read:bu`
- `canCreateProject` — `projects.project.create:bu`
- `canEditProject` — `projects.project.update:bu`
- `canDeleteProject` — `projects.project.delete:self_or_owner`
- `canViewMilestones` — `projects.milestone.read:bu`
- `canCreateMilestone` — `projects.milestone.create:bu`
- `canEditMilestone` — `projects.milestone.update:bu`
- `isLoading`

Exportar no barrel `src/modules/projects/hooks/index.ts`.

### 3. Criar templates no DB (migration SQL)

**3a.** Adicionar keys de projects ao template `collaborator_base_v2` (view-only):
- `projects.project.read:bu`, `projects.milestone.read:bu`

**3b.** Adicionar todas as 8 keys ao template `bu_admin_v2`.

**3c.** Criar 2 novos templates:

| Template | Slug | Keys |
|----------|------|------|
| Projetos: Gestor | `projects_manager` | read + create + update + milestone.* (6 keys) |
| Projetos: Admin | `projects_admin` | Todas as 8 keys (inclui delete) |

### 4. Integrar guards no UI

**Componentes afetados:**
- `ProjectsPage` — condicionar botão "Novo Projeto" a `canCreateProject`
- `ProjectDetailPage` — condicionar edição/exclusão a `canEditProject`/`canDeleteProject`
- `MilestoneList` — condicionar criação/status change a `canCreateMilestone`/`canEditMilestone`
- `ProjectCard` — esconder ações de edição se não tem permissão

### 5. Testes do hook
**Arquivo:** `src/modules/projects/hooks/__tests__/useProjectPermissionsV2.test.ts`

Seguindo o padrão do `useAssetPermissionsV2.test.ts`:
- Admin → full access
- Wildcard → full access
- Sem permissões → tudo negado
- View-only → só leitura
- Impersonação → respeita permissões do impersonado
- Loading state

### 6. Atualizar documentação
- `QA_PERMISSIONS_TEMPLATES.md` — adicionar cenários Projects Manager/Admin
- `RBAC_TEMPLATES_V3.md` — adicionar templates na camada de responsabilidades
- `TECHNICAL_CONTEXT_REGISTRY.md` — atualizar contagens

---

## Detalhes Técnicos

- **Padrão de impersonação**: idêntico ao Assets — durante impersonação, `hasFullAccess` usa apenas `isWildcard` (não `isAdmin`/`userRole`)
- **Identity**: `owner_id = profiles.id` (já correto)
- **RLS**: as policies já existem no DB, apenas os templates/frontend estão ausentes
- **Sem breaking changes**: colaboradores base ganham view automático via `collaborator_base_v2`

