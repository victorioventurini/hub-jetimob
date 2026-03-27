

## Plano: Vinculação de Milestones a KRs

### Pré-checklist ✅ Concluído

| Documento | Verificado | Achados relevantes |
|-----------|-----------|-------------------|
| TCR v3.18.0 §3.3.1 | ✅ | 5 tabelas do módulo Projects; `milestone_krs` NÃO existe; enum `project_impact` reutilizável |
| DATA_MODEL_REGISTRY | ✅ | Confirmado: nenhuma tabela `milestone_krs` no schema |
| IDENTITY_CONVENTION v2.2.0 | ✅ | `owner_id = profiles.id`; usar `my_profile_id()` em RLS (nunca `auth.uid()` direto) |
| RBAC_TEMPLATES_V3 | ✅ | `projects_manager` (7 keys) e `projects_admin` (8 keys); `collaborator_base` tem `project.read` + `milestone.read` |
| BU_SCOPED_SUPABASE_RULES | ✅ | `useOptionalBuClient` + `.eq('bu_id')` obrigatório |
| PERMISSIONS_AND_RBAC_MODEL | ✅ | `useProjectPermissionsV2` com `canEditMilestone` como gate |
| QUERY_KEYS_STANDARD | ✅ | Keys centralizadas em `projectsKeys` |
| RLS existente (`project_krs`) | ✅ | Padrão: SELECT via `is_current_bu()` do projeto pai; INSERT/DELETE via owner OR `is_bu_admin` OR `is_leader_of_project_owner` |

### O que será feito

#### 1. Migration: tabela `milestone_krs`

Nova junction table espelhando exatamente o padrão de `project_krs`:

```text
milestone_krs
├── milestone_id  uuid FK → project_milestones(id) ON DELETE CASCADE
├── key_result_id uuid FK → okr_team_key_results(id) ON DELETE CASCADE
├── impact        project_impact NOT NULL DEFAULT 'medium'
├── created_at    timestamptz NOT NULL DEFAULT now()
└── PK (milestone_id, key_result_id)
```

**RLS** (espelhando `project_krs` policies exatamente):
- **SELECT**: JOIN com `project_milestones` → `projects` para verificar `is_current_bu(bu_id)` e `deleted_at IS NULL`
- **INSERT/DELETE**: Mesmo JOIN + `owner_id = my_profile_id() OR is_bu_admin() OR is_leader_of_project_owner()`

Sem `bu_id` própria — herda via JOIN (mesmo padrão de `project_krs`).

#### 2. Hooks de mutação: `useMilestoneKrLinks.ts`

Espelha `useProjectKrLinks.ts`:
- `useAddMilestoneKrLink()` — insert em `milestone_krs`
- `useRemoveMilestoneKrLink()` — delete de `milestone_krs`
- Invalidação: `milestones(projectId)`, `detail(projectId)`, `byKr(krId)`, novo `milestoneKrs(milestoneId)`

#### 3. Hook de leitura: `useMilestoneKrs.ts`

- Query: `milestone_krs` JOIN `okr_team_key_results` → retorna `{ key_result_id, kr_title, impact }[]`
- Query key: `milestoneKrs(milestoneId)` (nova entry em `projectsKeys`)

#### 4. Query key

Adicionar em `projectsKeys`:
```typescript
milestoneKrs: (milestoneId: string) => ['projects', 'milestone-krs', milestoneId] as const
```

#### 5. Componente `MilestoneKrLinkSection.tsx`

Reutiliza o padrão visual do `ProjectKrLinkSection`:
- Props: `milestoneId`, `projectId`, `canEdit`
- Lista KRs vinculadas com badge de impacto
- Popover com busca (reutiliza `useKrsForLinking`)
- Seletor de impacto + vincular/desvincular

#### 6. Integração na `MilestoneList.tsx`

- Cada milestone ganha botão chevron para expandir
- Ao expandir, renderiza `MilestoneKrLinkSection` inline
- Nova prop `canEditKrLinks?: boolean` controlada por `canEditMilestone`
- Nova prop `projectId: string` para passagem ao componente de links

### Conformidade

| Regra | Status |
|-------|--------|
| BU-scoped client (`useOptionalBuClient`) | ✅ |
| Frontend `.eq('bu_id')` via JOIN | ✅ |
| Query keys centralizadas | ✅ |
| RBAC via `canEditMilestone` | ✅ |
| Identity: `my_profile_id()` em RLS | ✅ |
| Sem `select('*')` | ✅ |
| Enum reutilizado (`project_impact`) | ✅ |
| RLS espelhada de `project_krs` | ✅ |
| Hooks de mutação existentes como referência | ✅ |

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Novo |
| `src/lib/queryKeys/projects.ts` | Editar (+1 key) |
| `src/modules/projects/hooks/useMilestoneKrLinks.ts` | Novo |
| `src/modules/projects/hooks/useMilestoneKrs.ts` | Novo |
| `src/modules/projects/components/MilestoneKrLinkSection.tsx` | Novo |
| `src/modules/projects/components/MilestoneList.tsx` | Editar (expandir + KR links) |

