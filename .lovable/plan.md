## Plano: Refatoração de Milestones

### 1. Remover vínculo Milestone → KR da UI
- **`src/modules/projects/components/MilestoneList.tsx`**: remover renderização e import do `<MilestoneKrLinkSection>` por milestone.
- **Deletar** `src/modules/projects/components/MilestoneKrLinkSection.tsx` (sem outros consumidores; a visão inversa `ProjectsForKrSection` permanece read-only).
- Hooks `useMilestoneKrLinks` e tabela `milestone_krs` permanecem intactos (preserva dados históricos e inverse view, sem migração).

### 2. Novo `MilestoneDialog` (criação via modal)
- **Criar** `src/modules/projects/components/MilestoneDialog.tsx` seguindo padrão canônico de `ProjectDialog.tsx`: `Dialog` + `react-hook-form` + `zod` + `useDialogFormReset`.
- Campos obrigatórios: `name`, `start_date`, `due_date`, `owner_id` (via `BuUserSelect` `allowNone={false}`). Opcional: `notes`.
- Validação Zod: `start_date <= due_date` e todos obrigatórios preenchidos.
- Props: `open`, `onOpenChange`, `onSubmit`, `isSubmitting`, `title` (extensível para edição futura).

### 3. Relocar trigger de criação para o header do card
- **`src/modules/projects/pages/ProjectDetailPage.tsx`**: no `CardHeader` da seção "Milestones", adicionar botão "Novo milestone" no canto superior direito (`Button size="sm"` + `Plus` icon).
- Substituir `<MilestoneCreateForm>` inline pela abertura do `<MilestoneDialog>` (estado local `milestoneDialogOpen`).
- Reutilizar `useCreateMilestone` existente; passar `bu_id` e `project_id` no submit.
- **Deletar** `src/modules/projects/components/MilestoneCreateForm.tsx`.

### 4. Notes com salvar manual (remover auto-save)
- Em `MilestoneList.tsx`, extrair subcomponente `MilestoneNotesEditor` (no mesmo arquivo, coesão local):
  - Estado local `notesDraft` sincronizado com `milestone.notes`.
  - `isDirty = notesDraft !== (milestone.notes ?? '')`.
  - Botões "Salvar" (disabled se `!isDirty`) e "Cancelar" (descarta draft).
  - Remover `onChange` debounced/auto-save.
- Submit chama `onUpdate(id, { notes: notesDraft.trim() || null })` via `useUpdateMilestone`.

### 5. Documentação
- **Atualizar** `.lovable/memory/features/projects/holistic-module-architecture-v2.md` (bump v1.7):
  - Criação de milestone exclusivamente via `MilestoneDialog` no header do card.
  - Vínculo KR ↔ projeto somente em nível de projeto na UI; `milestone_krs` preservada para histórico e inverse view.
  - Notes com salvar manual.

### Conformidade canônica
- ✅ `DEVELOPMENT_STANDARDS.md`: dialog pattern, RHF+Zod, `useDialogFormReset`.
- ✅ `UI_COMPONENTS_REGISTRY.md`: ação no `CardHeader` (canto superior direito).
- ✅ Identity: `owner_id` = `profiles.id` via `BuUserSelect`.
- ✅ BU isolation garantida no `useCreateMilestone`.
- ✅ Sem duplicação: estende `ProjectDialog` como referência.

### Arquivos
- **Criar**: `src/modules/projects/components/MilestoneDialog.tsx`
- **Modificar**: `src/modules/projects/components/MilestoneList.tsx`, `src/modules/projects/pages/ProjectDetailPage.tsx`, `.lovable/memory/features/projects/holistic-module-architecture-v2.md`
- **Deletar**: `src/modules/projects/components/MilestoneCreateForm.tsx`, `src/modules/projects/components/MilestoneKrLinkSection.tsx`