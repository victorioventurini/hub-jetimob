

# Plano — Módulo Projetos

## Análise: proposta do Claude vs padrões canônicos do Hub

Revisei o TCR, DEVELOPMENT_STANDARDS, DATA_MODEL_REGISTRY, IDENTITY_CONVENTION, PERMISSIONS_AND_RBAC_MODEL, WIZARD_DEVELOPMENT_GUIDE, BU_SCOPED_SUPABASE_RULES e o codebase. A proposta do Claude é **muito boa e alinhada** com a arquitetura do Hub. Seguem os ajustes necessários:

### Correções obrigatórias vs spec do Claude

| Item no spec do Claude | Problema | Correção |
|---|---|---|
| CHECK constraints em `status` e `impact` | Hub usa **validation triggers** em vez de CHECK (imutabilidade do CHECK causa problemas em restore) | Substituir por validation triggers ou usar enum types |
| `calculate_project_health()` usa `LANGUAGE plpgsql STABLE` | OK, mas precisa de `SECURITY DEFINER` + `SET search_path = public` para ser usada em RLS/views | Adicionar security definer pattern |
| RLS `projects_insert` usa `WITH CHECK` | Falta `to authenticated` em todas as policies | Adicionar `TO authenticated` |
| RLS `projects_update` sem `WITH CHECK` | UPDATE policies precisam de `WITH CHECK` além de `USING` | Adicionar cláusula |
| RLS de INSERT/UPDATE/DELETE faltam para `project_teams`, `project_krs`, `project_milestones`, `project_milestone_dependencies` | Claude só definiu SELECT | Criar policies completas para CUD |
| Hooks usam `useBuScopedSupabase()` direto | Hub migrou para `useOptionalBuClient()` em muitos hooks para evitar crash em estados transitórios | Usar `useOptionalBuClient()` com gating pattern |
| Sidebar hardcoded `buMenuItems` | Já existe no `DynamicSidebar.tsx` e `MobileSidebar.tsx` com slug/icon | Adicionar entrada `{ name: "Projetos", href: "/projects", icon: FolderKanban, slug: "projects" }` |
| Gantt com `@dhtmlx/trial-gantt` | Lib trial não é adequada para produção. Hub não usa CDN externo | Implementar Gantt customizado com divs/CSS (padrão do Hub: zero dependências externas desnecessárias) |
| `select('*')` implícito em alguns exemplos | Regra inquebrável: campos sempre explícitos | Garantir `.select('id, name, ...')` em todas as queries |

### O que está correto e será mantido como está

- Modelo de dados (5 tabelas) — estrutura correta, identity convention respeitada (`owner_id` = `profiles.id`)
- Triggers `enforce_bu_scope` e `update_updated_at_column` — padrão canônico
- Soft-delete com `deleted_at` — alinhado com D.7
- Query keys em arquivo separado `src/lib/queryKeys/projects.ts` — padrão correto
- Barrel exports em `hooks/index.ts` — regra K
- `useDialogFormReset` nos dialogs — padrão obrigatório
- Integração aditiva nos wizards (sem tocar na lógica existente) — correto
- Permission keys no formato `module.entity.action:scope` — alinhado

---

## Fases de implementação

### Fase 1 — Database (1 migration)

Uma única migration SQL com:

1. **5 tabelas**: `projects`, `project_teams`, `project_krs`, `project_milestones`, `project_milestone_dependencies`
   - Usar enums para status em vez de CHECK constraints quando possível (ou validation triggers)
   - `owner_id` referencia `profiles(id)` — identity convention
   - `bu_id NOT NULL REFERENCES bu_units(id)` — BU scope

2. **Triggers**:
   - `enforce_bu_scope` em `projects` e `project_milestones`
   - `update_updated_at_column` em `projects` e `project_milestones`

3. **RLS completa** (todas as 5 tabelas):
   - SELECT: `user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id) AND deleted_at IS NULL`
   - INSERT: `is_current_bu(bu_id) AND owner_id = my_profile_id()` (para projects)
   - UPDATE: owner ou bu_admin
   - DELETE (soft): owner ou bu_admin
   - Junction tables (`project_teams`, `project_krs`, `project_milestone_dependencies`): herdam acesso via JOIN com projeto pai

4. **Índices**: conforme spec do Claude

5. **Função `calculate_project_health`**: com `SECURITY DEFINER SET search_path = public`

6. **Registro do módulo**: INSERT em `modules` (slug `projects`, type `operational`)

7. **Permission keys**: INSERT em `permission_catalog`

### Fase 2 — Foundation frontend

1. `src/modules/projects/types.ts` — tipos conforme spec
2. `src/lib/queryKeys/projects.ts` — keys centralizadas
3. `src/modules/projects/utils/projectHealth.ts` — `computeHealth()`, `computeCompletion()`
4. `src/modules/projects/hooks/` — todos os hooks com `useOptionalBuClient()` + gating
5. `src/modules/projects/hooks/index.ts` — barrel export

### Fase 3 — Componentes e páginas

1. Componentes de UI: `ProjectHealthBadge`, `ProjectProgressBar`, `ProjectCard`, `ProjectFilters`, `ProjectDialog`, `MilestoneList`, `MilestoneDialog`, `ProjectSidePanel`, `ProjectKrLinkSection`, `ProjectTeamsSection`
2. Gantt customizado com CSS Grid/divs (sem dependência externa)
3. `ProjectsPage` (`/projects`) com toggle lista/Gantt + filtros na URL (regra E)
4. `ProjectDetailPage` (`/projects/:id`) com validação post-fetch de `bu_id`
5. `projects.routes.tsx` seguindo pattern de `okrs.routes.tsx`
6. Sidebar: adicionar em `DynamicSidebar.tsx` e `MobileSidebar.tsx`

### Fase 4 — Integrações (aditivas)

1. `ProjectsForKrSection` na visão de KR (abaixo de `InitiativesSummary`)
2. `ProjectsSummary` nos wizards (todos os listados no spec)
3. Bloco "Meus projetos" na `HomePage`

---

## Detalhes técnicos relevantes

- **Client Supabase**: hooks usam `useOptionalBuClient()` (não `useBuScopedSupabase()` direto) para resiliência em estados transitórios
- **Frontend BU filter**: toda query inclui `.eq('bu_id', currentBuId)` obrigatório, mesmo com RLS
- **URL state**: filtros de status, owner, team e busca ficam em `searchParams` (regra E)
- **Soft-delete**: `.is('deleted_at', null)` em todas as queries
- **Identity**: `owner_id` = `profiles.id`; frontend usa `useIdentity().profileId` / `realProfileId` para mutations
- **Mutation guard**: payload usa `writerProfileId = realProfileId ?? profileId` com validação UUID
- **Gantt**: implementação customizada sem lib externa — CSS Grid com barras por projeto/milestone, setas de dependência via SVG overlay, linha "hoje" pontilhada
- **Wizards**: integração é puramente aditiva — `ProjectsSummary` renderizado abaixo dos blocos existentes, sem tocar em lógica de steps, drafts ou sessões

