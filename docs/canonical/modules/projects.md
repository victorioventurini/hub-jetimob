# Módulo Projetos — Canonical

**Versão:** 1.4 · **Slug:** `projects` · **Status:** ✅ Ativo
**Master em mem://:** `mem://features/projects/holistic-module-architecture-v2`
**Atualizado:** 2026-05-16

---

## 1. Escopo

Gestão de projetos com milestones, vinculação a KRs (granular por marco), health tracking, comentários ricos e Gantt.

**Páginas:**
- `/projects` — lista (filtros via URL state, toggle lista/gantt, filtros salvos)
- `/projects/:id` — detalhe (milestones, gantt inline, KR links, comentários)

**Integrações aditivas:** `ProjectsSummary` (wizards TeamCheckin/LeaderPrep/MBR), `ProjectsForKrSection` (visão KR), `ProjectsForKrLinkingSection` (expansão KR no OKR dashboard), `MyProjectsCard` (Home).

---

## 2. Schema (fonte da verdade: `src/integrations/supabase/types.ts`)

**Tabelas:** `projects`, `project_teams`, `project_krs`, `project_milestones`, `project_milestone_dependencies`, `milestone_krs`, `project_comments`, `project_comment_attachments`.

**Enums:** `project_status` (planned, in_progress, paused, done, cancelled), `project_impact` (high, medium, low).

**Função SQL:** `calculate_project_health(project_id uuid)` → `on_track | at_risk | late`.

**Storage:** bucket privado `project-attachments` (signed URLs).

**Soft delete:** `projects`, `project_milestones`, `project_comments` — usar `.is("deleted_at", null)`. ⚠️ `project_milestones` filtra SÓ `deleted_at` (não tem `cancelled_at`).

**RLS:**
- `projects`: BU-scoped + owner/admin
- `project_teams`, `project_krs`, `project_milestone_dependencies`: herdam via JOIN com projeto
- `project_milestones`, `milestone_krs`: BU-scoped diretos
- `project_comments`: BU-scoped + author/admin
- `project_comment_attachments`: BU-scoped + author

---

## 3. Identidade

- `projects.owner_id` = `profiles.id` (não `auth.uid()`).
- Mutations devem usar `realProfileId` de `useIdentity` para suportar impersonation sem RLS 42501.

---

## 4. Campos obrigatórios

**Projeto:** `name`, `owner_id`, `start_date`, `due_date` — validados via Zod em `ProjectDialog`.
**Milestone:** apenas `name` + `project_id` + `bu_id`. `due_date`, `owner_id`, `notes` são opcionais.

---

## 5. Hooks (19)

Localizados em `src/modules/projects/hooks/` (consolidados em barrel).

| Hook | Propósito |
|------|-----------|
| `useProjects` | Listagem com filtros (status, owner, team, KR link, search) |
| `useProject` | Detalhe com relações (owner, teams, KRs, milestones) |
| `useProjectMutations` | CRUD projetos (create, update, soft-delete) |
| `useMilestones` | Listagem de milestones por projeto |
| `useMilestoneMutations` | CRUD milestones (create, update, soft-delete) |
| `useMilestoneKrLinks` | Mutations vincular/desvincular KR↔milestone |
| `useMilestoneKrs` | KRs vinculadas a um milestone (read) |
| `useMilestonesForKr` | Milestones vinculados a uma KR específica |
| `useProjectKrLinks` | Mutations vincular/desvincular KR↔projeto |
| `useKrsForLinking` | KRs disponíveis para vincular (combobox) |
| `useProjectsForLinking` | Projetos disponíveis para vincular a KRs |
| `useProjectsForKr` | Projetos vinculados a uma KR (read) |
| `useProjectsForWizard` | Projetos para contexto de wizard |
| `useProjectPermissionsV2` | Flags de permissão + helpers row-aware |
| `useGanttData` | Transforma projetos em `GanttItem[]` |
| `useProjectComments` | Comentários e anexos por projeto |
| `useProjectCommentMutations` | CRUD comentários (create, edit, delete, pin) |

---

## 6. Componentes (16)

`ProjectCard`, `ProjectDialog`, `ProjectFiltersBar`, `ProjectGanttChart`, `ProjectViewToggle`, `ProjectHealthBadge`, `ProjectStatusBadge`, `ProjectProgressBar`, `ProjectKrLinkSection`, `MilestoneCreateForm`, `MilestonesTable` (status inline, owner, datas, notas em linha-extra, menu Editar/Remover row-aware), `MilestoneGanttChart`, `MilestoneKrLinkSection`, `ProjectCommentsSection` (menções, reply, pin, anexos), `ProjectsForKrSection`, `ProjectsSummary`.

---

## 7. Permissões (RBAC)

**Templates:**

| Template | Slug | Keys | Descrição |
|---|---|---|---|
| Projetos: Gestor | `projects_manager` | 7 | Criar/editar projetos e milestones. Sem exclusão. |
| Projetos: Admin | `projects_admin` | 8 | Tudo + exclusão de projetos |

**Permission Keys:**
- `projects.project.read:bu`, `projects.project.create:bu`, `projects.project.update:bu`, `projects.project.delete:self_or_owner`
- `projects.milestone.read:bu`, `projects.milestone.create:bu`, `projects.milestone.update:bu`, `projects.milestone.delete:bu`

**Hook:** `useProjectPermissionsV2` — flags: `canViewProjects`, `canCreateProject`, `canEditProject`, `canDeleteProject`, `canViewMilestones`, `canCreateMilestone`, `canEditMilestone`, `canDeleteMilestone`, `hasFullAccess`, `isLoading` + helpers row-aware: `canEditProjectRecord`, `canDeleteProjectRecord`, `canEditMilestoneRecord`, `canDeleteMilestoneRecord`.

**Module Access:** registrado em `MODULE_VIEW_PERMISSIONS` com `projects.project.read:bu` e `projects.milestone.read:bu` (sidebar + `ModuleRoute` guard).

### 7.1 Soft-Delete de Milestones — Autoridade (v2026-04-27)

Defesa em 4 camadas (UI → Hook → RLS → Trigger DB):

| Ação | Quem pode |
|------|-----------|
| Editar marco (todos exceto `deleted_at`) | Project owner, milestone owner, líder do project owner, bu admin, `projects.milestone.update:bu` |
| Remover marco (soft-delete) | Project owner, líder do project owner, bu admin, `projects.milestone.delete:bu` |

⚠️ **Milestone owner NÃO pode remover o próprio marco** — apenas editar.

Barreira definitiva: trigger `enforce_milestone_soft_delete_authority` (BEFORE UPDATE OF `deleted_at`) → `ERRCODE 42501` com `INSUFFICIENT_PRIVILEGE: only the project owner can remove milestones`.

SSOT: `mem://features/projects/milestone-permissions-row-aware`.

---

## 8. URL State (`/projects`)

| Parâmetro | Valores | Descrição |
|---|---|---|
| `status` | `all`, `planned`, `in_progress`, `paused`, `done`, `cancelled` | Filtro por status |
| `owner` | UUID | Filtro por responsável |
| `teamId` | UUID | Filtro por time |
| `krLink` | `linked`, `not_linked` | Filtro por vinculação a KR |
| `q` | texto | Busca local (nome projeto + milestone) |
| `view` | `list`, `gantt` | Toggle visualização |

---

## 9. Regras de negócio críticas

1. **start_date e due_date obrigatórios** no projeto (validação Zod).
2. **Milestone owner ≠ Project owner** para fins de delete: apenas o project owner (ou bu admin/líder) pode soft-deletar marcos.
3. **`milestone_krs`** permite vinculação cross-area (granular por marco, não só projeto).
4. **Health** é derivado por SQL (`calculate_project_health`), nunca calculado no client.
5. **Comentários:** body em richtext, suportam reply, pin e anexos (storage privado).

---

## 10. Referências cruzadas

- Master/SSOT do módulo: `mem://features/projects/holistic-module-architecture-v2`
- Soft-delete authority: `mem://features/projects/milestone-permissions-row-aware`
- RBAC global: `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` + `RBAC_TEMPLATES_V3.md`
- Identidade: `docs/canonical/IDENTITY_CONVENTION.md`
- Schema completo: `src/integrations/supabase/types.ts`
