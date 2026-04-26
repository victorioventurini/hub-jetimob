## Pré-checklist canônico ✅

- **TCR / DATA_MODEL_REGISTRY** revisado — `projects.owner_id` → `profiles.id`
- **IDENTITY_CONVENTION** — mutações com `realProfileId`
- **PERMISSIONS_AND_RBAC_MODEL** — permission key `projects.project.update:bu` (já usada no RPC atual)
- **mem://features/projects/holistic-module-architecture-v2** — spec do módulo
- **Soft-delete policy** — arquivados via `deleted_at IS NOT NULL`
- **Query keys standard** — `projectsKeys.list(buId, filters)` ✓
- **BU isolation** — `currentBuId` síncrono ✓

---

## Diagnóstico

A view `?view=gantt` aparenta "filtros quebrados" por **3 bugs distintos**, todos confirmados via leitura de código:

### Bug #1 — Milestones ignoram o filtro de status do projeto
**Local:** `src/modules/projects/hooks/useGanttData.ts` (linhas 38-59)

`useGanttData` itera `project.milestones` sem aplicar nenhum filtro. Quando o usuário seleciona `status=in_progress`, os projetos são filtrados corretamente no SQL (`useProjects.ts` linha 35), mas todos os milestones (incluindo `done` e `todo`) continuam aparecendo embaixo de cada projeto, dando impressão de que o filtro "não funcionou".

### Bug #2 — Aba "Arquivados" no Gantt não mostra milestones/teams/KRs
**Local:** RPC `public.list_archived_projects` (verificado via DB)

```sql
RETURNS SETOF projects  -- só colunas da tabela, sem joins
```

Em `useProjects.ts` linha 70, `p.project_milestones` é `undefined` para arquivados. Consequências:
- `computeHealth([])` → sempre `on_track`
- `computeCompletion([])` → sempre `0%`
- Gantt não desenha barras de milestones de projetos arquivados
- Filtro `team_id` **nunca matcha** projetos arquivados (sem `project_teams` no payload)
- Filtro `linked_to_kr` também quebra para arquivados

### Bug #3 — Mensagem enganosa quando filtros esvaziam o resultado
**Local:** `src/modules/projects/components/GanttTimeline.tsx` (linhas 134-146)

Quando o filtro de team/owner/KR remove todos os projetos, o Gantt mostra "Nenhum item com datas definidas para exibir" — diagnóstico errado (a causa real é o filtro, não datas faltantes). O usuário interpreta como bug de filtro.

---

## Mudanças propostas

### 1. `useGanttData.ts` — Milestones respeitam status do projeto pai

Adicionar parâmetro opcional `statusFilter` e filtrar milestones para casar com o status do projeto. Como o filtro de status já é aplicado em `useProjects` (server-side para ativos, client-side para arquivados), o ajuste no Gantt é **filtrar milestones para mostrar apenas os que casam com o status efetivo do projeto** (alinhamento visual).

Comportamento:
- `status=all` → mostra todos os milestones (atual)
- `status=in_progress` → mostra apenas milestones `in_progress` sob cada projeto
- `status=done` → mostra apenas milestones `done`
- etc.

Mudança cirúrgica: aceitar `statusFilter?: ProjectStatus | 'all'` e filtrar `project.milestones` antes do loop de inserção. `MilestoneGanttChart` (página de detalhe) **não muda** — continua mostrando todos os milestones do projeto.

### 2. Migration — `list_archived_projects` retorna `jsonb` com joins

Substituir `RETURNS SETOF projects` por `RETURNS jsonb` com a mesma forma do branch ativo (project + owner + project_teams + project_krs + project_milestones aninhados via `jsonb_build_object` / `jsonb_agg`).

**Autorização inalterada** — mesmo bloco RBAC v1.6 do RPC atual:
- `is_super_admin` OR `is_bu_admin` OR `has_permission(...,'projects.project.update:bu')` → todos arquivados da BU
- senão: owner OR `is_leader_of_project_owner`

**Mantém SECURITY DEFINER + search_path = public**, REVOKE PUBLIC + GRANT EXECUTE TO authenticated, COMMENT versionado (v1.1).

### 3. `useProjects.ts` — Consumir nova forma JSONB do RPC arquivados

`fetchArchived` passa a tratar `data` como array de objetos JSON com `project_milestones`, `project_teams`, `project_krs` aninhados (mesma forma do `PROJECT_LIST_FIELDS`). O `.map(...)` downstream (linhas 69-110) **não precisa mudar** — a forma fica idêntica ao branch ativo. Remove a marcação manual `_is_archived` (passa a vir computada via `deleted_at != null` que já é o fallback na linha 85).

### 4. `GanttTimeline.tsx` — Mensagem condicional

Diferenciar dois estados vazios:
- `items.length === 0 && excludedCount === 0` → "Nenhum projeto corresponde aos filtros aplicados."
- `items.length === 0 && excludedCount > 0` → mensagem atual ("Nenhum item com datas definidas...")
- `items.length > 0 && validItems.length === 0` → mensagem atual

### 5. `ProjectsPage.tsx` — Passar `statusFilter` para `useGanttData`

```ts
const { items: ganttItems, excludedCount: ganttExcluded } = useGanttData(
  projects,
  { statusFilter: filters.status }
);
```

---

## Arquivos afetados

| Arquivo | Tipo | Mudança |
|---|---|---|
| `supabase/migrations/<ts>_list_archived_projects_jsonb.sql` | Novo | RPC retorna jsonb com joins (auth inalterada) |
| `src/modules/projects/hooks/useGanttData.ts` | Edit | Aceita `{ statusFilter }`, filtra milestones |
| `src/modules/projects/hooks/useProjects.ts` | Edit | Consome novo formato jsonb do RPC arquivados |
| `src/modules/projects/pages/ProjectsPage.tsx` | Edit | Passa `statusFilter` ao hook |
| `src/modules/projects/components/GanttTimeline.tsx` | Edit | Mensagem condicional para resultado vazio por filtro |
| `src/modules/projects/hooks/__tests__/useGanttData.test.ts` | Edit | Testes para `statusFilter` |

---

## Não-mudanças (escopo controlado)

- ❌ `MilestoneGanttChart` (página de detalhe) — sem alteração; sempre mostra todos os milestones do projeto
- ❌ Whitelist/RBAC do `update_project_v2` — já corrigida na migration anterior
- ❌ Query keys / contratos React Query — `projectsKeys.list` já inclui `filters` no hash
- ❌ Filtros de lista (`ProjectsTable`) — funcionam corretamente
- ❌ `ProjectFiltersBar` — UI dos filtros já está correta

---

## Risco

**Baixo.** A migration substitui apenas a forma de retorno do RPC (sem mudar autorização). O frontend é puramente aditivo (filtro novo opcional + mensagem nova). Cache invalida automaticamente porque a query key já depende de `filters` completos.

## Validação pós-deploy

1. `/projects?view=gantt&status=in_progress` → milestones mostradas devem ser apenas `in_progress`
2. `/projects?view=gantt&archived=archived` → projetos arquivados devem mostrar barras de milestones e respeitar `team_id`
3. `/projects?view=gantt&teamId=<id-sem-projetos>` → mensagem "Nenhum projeto corresponde aos filtros aplicados"
4. `/projects?view=gantt` (sem filtro) → comportamento idêntico ao atual
5. RLS smoke test: usuário sem permissão `:bu` vê apenas seus arquivados / liderados
