## Objetivo

Alinhar as permissões de KPIs e Métricas à matriz solicitada — escopo (org/area/team/subteam) × nível organizacional — **com herança hierárquica de liderança** (líder de área gerencia times da área; líder de time pai gerencia subtimes), reutilizando o padrão já consolidado em OKRs.

## Matriz consolidada (SSOT funcional)

| Escopo do KPI | Criar | Editar | Excluir |
|---|---|---|---|
| **Global (org)** | admin | admin + responsável + atualizado-por | admin |
| **Área** | admin + líder da área | admin + líder da área + responsável + atualizado-por | admin + líder da área |
| **Time** | admin + líder área + líder time | admin + líderes (área/time) + responsável + atualizado-por | admin + líderes (área/time) |
| **Subtime** | admin + líderes (área/time pai/subtime) | admin + líderes (área/time pai/subtime) + responsável + atualizado-por | admin + líderes (área/time pai/subtime) |
| **Métrica** (sempre `scope=team`) | admin + líderes hierárquicos + **membro do time** | admin + líderes + responsável + atualizado-por | admin + líderes + responsável + atualizado-por |

**Decisões aprovadas:**
1. Métricas → sempre `scope=team` (UI esconde org/area quando `indicator_type=metric`).
2. Cadastro de Métrica por colaborador → restrito a times dos quais é **membro**.
3. "Contribuidor" = "Atualizado por" (single-user `kpi_data_contributors` com `role='data_entry'`).
4. Liderança hierárquica → **com herança** (reutiliza `get_descendant_team_ids`).

## Arquitetura

### Camada 1 — Banco (helpers + RLS)

Seguindo a Regra de Ouro do RBAC ("Liderança não é template"), a hierarquia é resolvida via helpers SQL, **não** via novas permission keys.

**Novos helpers SECURITY DEFINER:**

- `user_can_manage_kpi(p_profile_id uuid, p_kpi_id uuid) RETURNS boolean`
  - `org` → admin/super_admin/bu_admin.
  - `area` → admins OU `areas.leader_user_id`/`co_leader_user_id` da área do KPI.
  - `team` → admins OU líder da área do time OU líder do time OU líder de qualquer ancestral via `parent_team_id`.

- `user_can_create_kpi(p_profile_id, p_bu_id, p_scope, p_area_id, p_team_id, p_indicator_type) RETURNS boolean`
  - Mesma lógica + branch para `metric`: aceita também membro de `team_members` do `team_id`.

**Trigger de validação** `enforce_metric_scope_team` (BEFORE INSERT/UPDATE em `kpi_metrics`): se `indicator_type='metric'` e `scope <> 'team'` → raise (sem CHECK constraint, conforme regra do projeto).

**Novas policies de `kpi_metrics`:**
- `kpi_metrics_insert_v3`: `user_can_create_kpi(my_profile_id(), bu_id, scope, area_id, team_id, indicator_type)`.
- `kpi_metrics_update_v4`: `user_can_manage_kpi(my_profile_id(), id)` OR `owner_user_id = my_profile_id()` OR contribuidor `data_entry` ativo.
- `kpi_metrics_delete_v3`: 
  - Se `indicator_type='metric'`: `user_can_manage_kpi(...)` OR owner OR contribuidor `data_entry`.
  - Caso contrário: apenas `user_can_manage_kpi(...)`.

### Camada 2 — Hooks (SSOT frontend)

- **Novo `useHierarchicalLeadership`** (`src/hooks/`): retorna `{ ledAreaIds, manageableTeamIdsHierarchical, canManageTeamHierarchical(teamId), canManageAreaScope(areaId), isLoading }`. Reutiliza `get_okr_manageable_team_ids` (que já expande descendentes) e adiciona consulta a `areas.leader_user_id`/`co_leader_user_id`.
- **Refatorar `useCanEditKpi`**: passa a usar `useHierarchicalLeadership` e expõe `{ canEdit, canDelete, canUpdateValues, isLoading }` aplicando a matriz por escopo.
- **Novo `useCanCreateKpi(scope, areaId?, teamId?, indicatorType)`**: retorna `{ canCreate, blockedReason }`. Para `metric`, valida membro do time via `team_members`.
- **Ajustar `useCanChangeKpiScope`**: líder de área pode mover entre `area`↔`team` dentro da sua área; líder de time pai pode mover entre seus subtimes.

### Camada 3 — UI

- **`CreateKpiDialog.tsx`**:
  - Para `indicator_type=metric`: forçar `scope='team'`, ocultar org/area, exigir `team_id`.
  - Filtrar times selecionáveis por `useCanCreateKpi`.
  - Desabilitar "Criar" com tooltip explicativo quando `!canCreate`.
- **`EditKpiDialog.tsx` / `EditKpiOwnershipSection.tsx`**: botões "Salvar" e "Excluir" condicionais a `canEdit` / `canDelete`.
- **`KpiDetailContent.tsx`**: ocultar ações por permissão.
- **Listagens `/kpis`**: esconder botão "+ Criar" quando o usuário não tiver nenhuma combinação de escopo permitida.

### Camada 4 — Permission catalog

**Manter as keys atuais** (`kpis.metric.create:bu`, `kpis.settings.manage:bu`, `kpis.metric.delete:bu`). Não criar `:area`/`:team` — a hierarquia é resolvida pelos helpers, conforme padrão de OKRs.

## Plano de execução

1. **Migration 1 — Helpers SQL**: criar `user_can_manage_kpi`, `user_can_create_kpi` e trigger `enforce_metric_scope_team`.
2. **Migration 2 — Policies**: substituir `kpi_metrics_insert_v2`, `kpi_metrics_update_v3`, `kpi_metrics_delete_v2` pelas novas versões.
3. **Hooks**: criar `useHierarchicalLeadership` e `useCanCreateKpi`; refatorar `useCanEditKpi` e `useCanChangeKpiScope`.
4. **UI**: ajustar `CreateKpiDialog`, `EditKpiDialog`, `EditKpiOwnershipSection`, `KpiDetailContent` e botões "+ Criar" nas listagens.
5. **Auditoria**: SELECT identificando Métricas com `scope <> 'team'` (se houver, alertar antes de habilitar trigger).
6. **Documentação**:
   - `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` (seção KPIs com a matriz).
   - `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` (helpers novos).
   - Memória `mem://features/kpis/kpis-permissions-matrix` (nova) + atualizar índice e `mem://features/kpis/kpis-master-standard`.
7. **Smoke test manual**: validar como super_admin, admin, líder de área, líder de time pai, líder de subtime, responsável, atualizado-por, membro de time, e usuário comum.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Quebrar criação para usuários com `kpis.metric.create:bu` | Helpers consideram `has_permission` como fallback; templates `kpi_admin` continuam válidos. |
| Métricas existentes com `scope ≠ team` falharem no UPDATE | Auditoria prévia; converter para `kpi` ou ajustar `scope` antes de habilitar trigger. |
| Performance da resolução hierárquica | Helpers `STABLE`, recursão limitada à árvore da BU; cache de 5min nos hooks. |
| Líder de área sem times atribuídos não criar nada | Esperado pela matriz; UI mostra tooltip explicativo. |

## Arquivos previstos

**SQL (migrations)**
- `supabase/migrations/<ts>_kpi_permission_helpers.sql`
- `supabase/migrations/<ts>_kpi_metrics_rls_v4.sql`

**Frontend**
- `src/hooks/useHierarchicalLeadership.ts` (novo, reutilizável)
- `src/modules/kpis/hooks/useCanCreateKpi.ts` (novo)
- `src/modules/kpis/hooks/useCanEditKpi.ts` (refatorar; adicionar `canDelete`)
- `src/modules/kpis/hooks/useCanChangeKpiScope.ts` (ajustar)
- `src/modules/kpis/components/CreateKpiDialog.tsx`
- `src/modules/kpis/components/EditKpiDialog.tsx`
- `src/modules/kpis/components/edit-kpi/EditKpiOwnershipSection.tsx`
- `src/modules/kpis/components/KpiDetailContent.tsx`
- Listagens `/kpis` (botões "+ Criar")

**Documentação**
- `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
- `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`
- `.lovable/memory/features/kpis/kpis-permissions-matrix.md` (novo)
- `.lovable/memory/index.md`
- `.lovable/memory/features/kpis/kpis-master-standard.md`
