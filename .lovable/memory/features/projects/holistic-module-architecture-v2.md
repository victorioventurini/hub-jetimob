O módulo de Projetos (v1.7) gerencia iniciativas estratégicas com marcos (milestones), cronograma e indicadores de saúde (late/overdue, at_risk/<7 dias, on_track), diferenciando-se das 'okr_initiatives'. **Milestones têm responsável obrigatório** (`project_milestones.owner_id NOT NULL`); UI bloqueia criação/edição sem responsável (`BuUserSelect allowNone={false}`); hooks fazem guard defensivo.

**UI de Milestones (v1.7 — 2026-04-24):**
- Criação **exclusivamente via `MilestoneDialog`** (modal canônico baseado em `ProjectDialog`: Dialog + react-hook-form + zod + `useDialogFormReset`), acionado pelo botão "Novo milestone" no canto superior direito do `CardHeader` da seção "Milestones" em `ProjectDetailPage`. O componente `MilestoneCreateForm` (form inline) foi removido.
- Vínculo KR ↔ projeto **somente em nível de projeto** na UI: `MilestoneKrLinkSection` foi removido. A tabela `milestone_krs` e o hook `useMilestoneKrLinks` permanecem intactos para preservar dados históricos e a inverse view (`ProjectsForKrSection`), mas não há mais entrada de UI para criar/editar esses vínculos.
- Observações (`notes`) do milestone usam **salvar manual** via `MilestoneNotesEditor` (estado local + botões Salvar/Cancelar com `isDirty` calculado vs valor persistido). O auto-save por `onChange` foi removido.

**Autorização canônica de projetos (v1.6 — 2026-04-24):** A regra única e válida em todas as camadas (RLS + UI) para editar/arquivar projeto é:

```
ALLOW IF is_current_bu(bu_id) AND (
  is_super_admin(auth.uid())
  OR is_bu_admin(auth.uid(), bu_id)
  OR owner_id = my_profile_id()
  OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
  OR has_permission(my_profile_id(), bu_id, 'projects.project.{create,update,delete}:bu')
)
```

Aplicada em `projects_insert/update/delete`, e herdada por `project_teams_insert/delete` e `project_krs_insert/delete` via JOIN com `projects`. **Removido** o `WITH CHECK = profile_has_bu_access(...)` que existia em `projects_update` e bloqueava super_admin sem membership na BU. No frontend o gate row-aware é composto por `useProjectPermissionsV2` (cobre full access, owner via `:self_or_owner`, e wildcard `:bu`) somado a `useIsLeaderOfProjectOwner` (RPC para a função canônica do banco) — ambos consumidos no `ProjectDetailPage` para liberar Editar/Arquivar exatamente conforme a RLS.

`project_milestones` segue o mesmo modelo (substituindo a key por `projects.milestone.{create,update,delete}:bu`), com a checagem feita via JOIN ao projeto pai.

**CRÍTICO — Soft-delete + RLS SELECT (corrigido 2026-04-24):** A policy `projects_select` exige `deleted_at IS NULL`; portanto, NÃO usar `count: 'exact'` nem `.select()` no soft-delete (`useSoftDeleteProject`), pois a row some da SELECT após o UPDATE e PostgREST retorna `count=0` mesmo em sucesso, gerando falso "Sem permissão". Padrão correto: PROBE pré-UPDATE (`select id, deleted_at, bu_id` para validar existência/idempotência/BU mismatch) seguido de UPDATE simples sem count nem select.

A integração com OKRs é N:N (somente projeto->KR na UI; milestone->KR preservado no DB para histórico) via tabelas de junção com campo 'impact'. Inclui sistema de comentários com anexos e menções (@), visualização de Gantt customizada (Emerald/Amber/Red), listagem com 'ProjectStatusSummary' e filtros salvos. Nos rituais (MBR, QBR, Check-ins), o 'ProjectsSummary' (mode="detail") exibe marcos, responsáveis e times envolvidos. Notificações automatizadas (project/milestone status, menções) garantem o fluxo de comunicação entre stakeholders.
