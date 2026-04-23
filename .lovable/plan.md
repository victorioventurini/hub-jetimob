

## Adicionar campo "Data de início" obrigatório em milestones

### Pré-checklist (executado)
- ✅ TCR §3.3.1 (Módulo Projetos v1.4) — schema atual de `project_milestones` confirmado sem `start_date`
- ✅ `SCHEMA_QUICK_REFERENCE.md` linhas 462-463 — campos atuais listados
- ✅ `DATA_MODEL_REGISTRY.md` — tabela rastreada com RLS BU-scoped
- ✅ `mem://standards/database/check-constraint-prohibition` — usar trigger, não CHECK
- ✅ `mem://features/projects/holistic-module-architecture-v2` — RBAC V2 e RLS preservados
- ✅ Identidade: `owner_id` é `profiles.id` (legado, JOIN via `profiles.id`) — mantido
- ✅ Sem duplicação: reaproveita `Popover + Calendar` (Shadcn) já usado para `due_date`

### Mudanças

**1. Migração SQL** (`supabase/migrations/<new>.sql`)
- `ALTER TABLE public.project_milestones ADD COLUMN start_date date;`
- Backfill: `UPDATE public.project_milestones SET start_date = COALESCE(due_date, created_at::date) WHERE start_date IS NULL;`
- `ALTER TABLE public.project_milestones ALTER COLUMN start_date SET NOT NULL;`
- Função + trigger `trg_project_milestones_validate_dates` (BEFORE INSERT/UPDATE) — bloqueia `start_date > due_date` quando `due_date IS NOT NULL`. Sem CHECK constraint.
- Não altera RLS, índices ou `bu_id` trigger.

**2. Types** (`src/modules/projects/types.ts`)
- `ProjectMilestone.start_date: string` (obrigatório)
- `CreateMilestoneInput.start_date: string` (obrigatório)
- `UpdateMilestoneInput.start_date?: string`
- `ProjectForWizard.milestones[].start_date: string`

**3. Form de criação** (`MilestoneCreateForm.tsx`) — estender, não duplicar
- Novo state `startDate: Date | undefined`
- Segundo `Popover + Calendar` com label "Início *", borda destructive quando vazio (mesmo padrão visual do `dueDate`)
- Validação client-side: bloqueia submit se `!startDate || !dueDate || startDate > dueDate`
- `onSubmit` passa `start_date` no payload; reset junto com os outros campos

**4. Edição inline** (`MilestoneList.tsx`)
- Adicionar `Popover + Calendar` para `start_date` ao lado do existente
- Estender prop `onUpdate` para aceitar `start_date?: string | null`
- Borda destructive quando `start_date > due_date` (validação visual)

**5. Hooks/queries** — incluir `start_date` em todos selects/inserts/updates
- `useMilestones.ts` (`MILESTONE_FIELDS`)
- `useProject.ts` (PROJECT_SELECT)
- `useProjectsForKr.ts` (select de `project_milestones`)
- `useProjectsForWizard.ts`
- `useMilestoneMutations.ts` (`useCreateMilestone` e `useUpdateMilestone`)
- `CollaboratorProjectsStep.tsx` (2 selects)

**6. Page** (`ProjectDetailPage.tsx`)
- `handleAddMilestone`: aceitar `start_date: string` no payload
- `handleMilestoneUpdate`: aceitar `start_date?: string | null` opcional

**7. Gantt** (`MilestoneGanttChart.tsx`)
- Substituir heurística atual (`created_at` → `projectStartDate` → `due_date`) por `m.start_date` real
- Manter fallback apenas defensivo (caso de borda)

**8. Testes**
- Atualizar fixtures em `CollaboratorProjectsStep.test.tsx` e `ProjectDetailPage.test.tsx` para incluir `start_date`
- Atualizar `useGanttData.test.ts` se necessário
- Atualizar `MilestoneList.test.tsx` para nova prop

**9. Documentação canônica** (manter em dia)
- `docs/canonical/SCHEMA_QUICK_REFERENCE.md` — adicionar `start_date` à linha 463 e atualizar nota da linha 481
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` — registrar mudança no changelog (nova entry de versão) e atualizar §3.3.1

### Arquivos afetados
- `supabase/migrations/<new>.sql` (criar)
- `src/modules/projects/types.ts`
- `src/modules/projects/components/MilestoneCreateForm.tsx`
- `src/modules/projects/components/MilestoneList.tsx`
- `src/modules/projects/components/MilestoneGanttChart.tsx`
- `src/modules/projects/hooks/{useMilestones,useMilestoneMutations,useProject,useProjectsForKr,useProjectsForWizard}.ts`
- `src/modules/projects/pages/ProjectDetailPage.tsx`
- `src/modules/okrs/components/wizards/collaborator/CollaboratorProjectsStep.tsx`
- Testes: `CollaboratorProjectsStep.test.tsx`, `ProjectDetailPage.test.tsx`, `MilestoneList.test.tsx`, `useGanttData.test.ts`
- Docs: `SCHEMA_QUICK_REFERENCE.md`, `TECHNICAL_CONTEXT_REGISTRY.md`

### Princípios respeitados
- BU Isolation preservada (trigger `enforce_bu_scope` intacto)
- Sem CHECK constraints (trigger de validação)
- Sem `select('*')` (campos explícitos)
- Soft-delete e RLS atuais preservados
- Query keys via `projectsKeys` (sem mudança)
- Reaproveitamento de `Popover + Calendar` Shadcn (sem duplicação)
- Identidade: `owner_id` permanece `profiles.id`

