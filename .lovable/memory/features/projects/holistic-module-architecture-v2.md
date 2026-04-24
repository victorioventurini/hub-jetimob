---
name: holistic-module-architecture-v2
description: Arquitetura holística do módulo Projetos (v1.9) — milestones, autorização canônica, RPCs SECURITY DEFINER para archive/update e acesso a arquivados
type: feature
---

O módulo de Projetos (v1.8) gerencia iniciativas estratégicas com marcos (milestones), cronograma e indicadores de saúde (late/overdue, at_risk/<7 dias, on_track), diferenciando-se das 'okr_initiatives'. **Milestones têm responsável obrigatório** (`project_milestones.owner_id NOT NULL`); UI bloqueia criação/edição sem responsável (`BuUserSelect allowNone={false}`); hooks fazem guard defensivo.

**UI de Milestones (v1.7 — 2026-04-24):**
- Criação **exclusivamente via `MilestoneDialog`** (modal canônico baseado em `ProjectDialog`: Dialog + react-hook-form + zod + `useDialogFormReset`), acionado pelo botão "Novo milestone" no canto superior direito do `CardHeader` da seção "Milestones" em `ProjectDetailPage`. O componente `MilestoneCreateForm` (form inline) foi removido.
- Vínculo KR ↔ projeto **somente em nível de projeto** na UI: `MilestoneKrLinkSection` foi removido. A tabela `milestone_krs` e o hook `useMilestoneKrLinks` permanecem intactos para preservar dados históricos e a inverse view (`ProjectsForKrSection`), mas não há mais entrada de UI para criar/editar esses vínculos.
- Observações (`notes`) do milestone usam **salvar manual** via `MilestoneNotesEditor` (estado local + botões Salvar/Cancelar com `isDirty` calculado vs valor persistido). O auto-save por `onChange` foi removido.

**Autorização canônica de projetos (v1.6 — 2026-04-24):** A regra única e válida em todas as camadas (RLS + RPC + UI) para editar/arquivar projeto é:

```
ALLOW IF (
  is_super_admin(auth.uid())
  OR is_bu_admin(auth.uid(), bu_id)
  OR owner_id = my_profile_id()
  OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
  OR has_permission(my_profile_id(), bu_id, 'projects.project.{create,update,delete}:bu')
)
```

Aplicada em `projects_insert/update/delete` (RLS) com `is_current_bu(bu_id)`, e herdada por `project_teams_insert/delete` e `project_krs_insert/delete` via JOIN com `projects`. **Removido** o `WITH CHECK = profile_has_bu_access(...)` que existia em `projects_update` e bloqueava super_admin sem membership na BU. No frontend o gate row-aware é composto por `useProjectPermissionsV2` (cobre full access, owner via `:self_or_owner`, e wildcard `:bu`) somado a `useIsLeaderOfProjectOwner` (RPC para a função canônica do banco) — ambos consumidos no `ProjectDetailPage` para liberar Editar/Arquivar exatamente conforme a RLS.

`project_milestones` segue o mesmo modelo (substituindo a key por `projects.milestone.{create,update,delete}:bu`), com a checagem feita via JOIN ao projeto pai.

**Mutations canônicas via RPC SECURITY DEFINER (v1.8 — 2026-04-24):** As operações de **arquivamento e update** de projetos passaram a usar funções `SECURITY DEFINER`, eliminando a fragilidade do antigo PROBE SELECT que falhava em drift de BU contextual / impersonação:

- **`archive_project_v2(p_project_id uuid) RETURNS jsonb`** — usado por `useSoftDeleteProject`. Valida a regra canônica acima server-side (SEM depender da policy SELECT) e retorna `jsonb` categorizado: `{ ok, code }` com `ARCHIVED | ALREADY_ARCHIVED | NOT_FOUND | FORBIDDEN | UNAUTHENTICATED`. Idempotente: se o projeto já estava arquivado, retorna `ALREADY_ARCHIVED` com `ok: true`. Faz `UPDATE projects SET deleted_at = now()` apenas após autorização.
- **`update_project_v2(p_project_id uuid, p_payload jsonb) RETURNS jsonb`** — usado por `useUpdateProject`. Aplica COALESCE por campo via whitelist (`name, description, owner_id, status, start_date, due_date, external_url`). Retorna `{ ok, code }` com `UPDATED | NOT_FOUND | FORBIDDEN | ALREADY_ARCHIVED | UNAUTHENTICATED | INVALID_PAYLOAD`.
- Sync de `team_ids` (em `useUpdateProject`) continua sendo feito via `delete + insert` direto na tabela `project_teams` após a RPC retornar `ok: true` — RLS de `project_teams` já herda permissão por JOIN com `projects` e respeita o bypass de admin.
- Frontend mapeia `code` para toast amigável; **não há mais regex sobre `error.message`** ("Sem permissão" forjado a partir de `count=0`). Erro de rede (PostgREST) cai no `onError` padrão.

**CRÍTICO — Soft-delete + RLS SELECT (histórico — superado em v1.8):** Antes da RPC, o probe pré-update lia o projeto via `SELECT` e dependia da policy `projects_select` (que exige `is_current_bu(bu_id)`). Em cenários de drift de BU contextual / impersonação / bundle stale, o probe retornava `null` e o hook gerava o falso positivo "Sem permissão" mesmo para super_admin. A RPC `archive_project_v2` resolve isso definitivamente porque roda como `SECURITY DEFINER` (bypass total de RLS) e aplica a regra canônica explicitamente.

A integração com OKRs é N:N (somente projeto->KR na UI; milestone->KR preservado no DB para histórico) via tabelas de junção com campo 'impact'. Inclui sistema de comentários com anexos e menções (@), visualização de Gantt customizada (Emerald/Amber/Red), listagem com 'ProjectStatusSummary' e filtros salvos. Nos rituais (MBR, QBR, Check-ins), o 'ProjectsSummary' (mode="detail") exibe marcos, responsáveis e times envolvidos. Notificações automatizadas (project/milestone status, menções) garantem o fluxo de comunicação entre stakeholders.

**Acesso a Projetos Arquivados (v1.9 — 2026-04-24):** A RLS de `projects` filtra `deleted_at IS NULL`, impedindo SELECT direto de arquivados. O acesso é feito via três RPCs `SECURITY DEFINER` que aplicam a mesma regra canônica v1.6 (super_admin OR bu_admin OR owner OR leader_of_owner OR has_permission(`projects.project.update:bu`)):
- `list_archived_projects()` — lista projetos arquivados da BU corrente visíveis ao ator (SETOF projects, sem joins).
- `get_archived_project_v2(p_project_id)` — retorna jsonb com projeto + relações (owner, teams, krs, milestones).
- `restore_project_v2(p_project_id)` — restaura (`deleted_at = NULL`). Códigos: RESTORED, NOT_FOUND, FORBIDDEN, NOT_ARCHIVED, UNAUTHENTICATED.

**UX:** `ProjectFiltersBar` ganhou select "Visualização" (`archived_state`: `active` default | `archived` | `all`) persistido em URL via `useUrlState({ key: 'archived' })`. `useProjects` despacha entre SELECT direto (active) e RPC (archived); modo `all` faz `Promise.all` e concatena. `useProject` tenta SELECT primeiro e cai em `get_archived_project_v2` quando `null`, marcando `is_archived: true`. `ProjectDetailPage` quando `isArchived`: exibe banner warning, mostra botão "Restaurar projeto" (gated pela mesma matriz canônica via `useRestoreProject`), e força read-only escondendo Editar/Arquivar/Novo milestone, ações de milestone (`canAddMilestone`/`canEditMilestone` recebem `&& !isArchived`) e composer de comentários (`ProjectCommentsSection readOnly={isArchived}`).
