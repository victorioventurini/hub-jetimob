

## Plano: Campo `notes` em Milestones

### Pré-checklist ✅

| Documento | Verificado | Achados |
|-----------|-----------|---------|
| TCR v3.18.0 | ✅ | `project_milestones` sem campo `notes`; campo não existe no schema |
| DATA_MODEL_REGISTRY | ✅ | Confirmado: sem `notes` na tabela |
| DEVELOPMENT_STANDARDS | ✅ | Sem `select('*')`, query keys centralizadas |
| Identity Convention | ✅ | N/A para este campo |
| useDialogFormReset | ✅ | Milestones usam inline form, não dialog — padrão não se aplica |

### O que será feito

#### 1. Migration — adicionar coluna

```sql
ALTER TABLE public.project_milestones ADD COLUMN notes text;
```

#### 2. Tipo TypeScript — `ProjectMilestone`

Adicionar `notes: string | null` à interface em `types.ts`.

#### 3. Selects — incluir `notes` nos hooks

| Hook | Campo adicionado |
|------|-----------------|
| `useProject.ts` | `notes` no select de `project_milestones(...)` |
| `useMilestones.ts` | `notes` no `MILESTONE_FIELDS` |
| `useProjects.ts` | Não — listagem usa campos mínimos, `notes` não é necessário |
| `useProjectsForKr.ts` / `useProjectsForWizard.ts` | Não — selects mínimos |

#### 4. Mutations — `notes` no create e update

- `CreateMilestoneInput` e `UpdateMilestoneInput`: adicionar `notes?: string | null`
- `useCreateMilestone`: incluir `notes` no insert
- `useUpdateMilestone`: já usa spread `...updates`, funciona automaticamente

#### 5. `MilestoneCreateForm.tsx` — campo de notas na criação

- Adicionar `<Textarea>` opcional abaixo dos seletores de prazo/responsável
- Placeholder: "Observações, bloqueios, contexto..."
- Incluir `notes` no `onSubmit`

#### 6. `MilestoneList.tsx` — exibição e edição inline

- Ícone `FileText` (14px) ao lado do nome quando `notes` preenchido
- Tooltip com preview das notas no hover
- Na área expandida: `<Textarea>` para edição inline (quando `canEdit`)
- `onUpdate` callback estendido para aceitar `notes`

#### 7. `GanttItem` e Gantt tooltips

- Adicionar `notes?: string | null` ao tipo `GanttItem`
- `useGanttData.ts`: mapear `notes` dos milestones
- `MilestoneGanttChart.tsx`: exibir notas no tooltip quando preenchidas
- `ProjectGanttChart.tsx`: exibir notas no tooltip de milestones

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Novo |
| `src/modules/projects/types.ts` | Editar (+`notes` em 3 interfaces) |
| `src/modules/projects/hooks/useProject.ts` | Editar (select) |
| `src/modules/projects/hooks/useMilestones.ts` | Editar (select) |
| `src/modules/projects/hooks/useMilestoneMutations.ts` | Editar (insert) |
| `src/modules/projects/hooks/useGanttData.ts` | Editar (mapear notes) |
| `src/modules/projects/components/MilestoneCreateForm.tsx` | Editar (+textarea) |
| `src/modules/projects/components/MilestoneList.tsx` | Editar (icon + inline edit) |
| `src/modules/projects/components/MilestoneGanttChart.tsx` | Editar (tooltip) |
| `src/modules/projects/components/ProjectGanttChart.tsx` | Editar (tooltip) |

### Conformidade

| Regra | Status |
|-------|--------|
| Sem `select('*')` | ✅ |
| BU-scoped client | ✅ |
| Query keys centralizadas | ✅ |
| Identity convention | ✅ N/A |
| useDialogFormReset | ✅ N/A (inline forms) |

