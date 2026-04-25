
## Contexto

Rota: `/teams/:id?tab=contribution` (SSOT em `src/modules/teams/components/contribution/TeamContributionTab.tsx`)

Hoje a aba Contribuição tem 5 sub-tabs: `overview`, `team-okrs`, `shared-okrs`, `org-contribution`, `projects`.

O usuário pediu **dentro do contexto da aba Contribuição**:
1. **Iniciativas vinculadas às KRs do ciclo ativo** (do time + sub-times via toggle existente)
2. **KPIs em 2 grupos**: (a) sob responsabilidade do time; (b) sob responsabilidade de membros do time

## Pré-checklist (TCR + Docs canônicos consultados)

- ✅ TCR e `IDENTITY_CONVENTION.md`: usaremos `profiles.team_id` para listar membros (já é o padrão usado em `useTeam`).
- ✅ `DATA_MODEL_REGISTRY` / `SCHEMA_QUICK_REFERENCE.md`:
  - `kpi_metrics.responsible_team_id` → KPI sob responsabilidade do time (v2.90.0).
  - `kpi_metrics.owner_user_id` → owner pessoal (membro do time).
- ✅ `QUERY_KEYS_STANDARD.md`: novas keys serão criadas em `src/lib/queryKeys/teams.ts`.
- ✅ `team-contribution-tab-standard.md` (memória): aba já é canônica; vamos estender, não criar nova rota.
- ✅ Reutilizaremos: `InitiativeCard`, `KpiCard`, `useKpiData` (filtros nativos `teamId`/`ownerId`), `useKrInitiatives`.
- ✅ Toggle `include_subteams` já existe e expande `resolvedTeamIds` — vamos reaproveitar.
- ✅ Filtro `cycle_id` (URL state) já existe — vamos reaproveitar (cai para o ciclo ativo automaticamente).
- ✅ Soft-delete (`.is('deleted_at', null)`), sem `select('*')`, BU isolation via `useOptionalBuClient`.

## Decisão de regra de negócio

**KPIs do time (responsabilidade direta):**
- `kpi_metrics.responsible_team_id IN (resolvedTeamIds)` **OU** `team_id IN (resolvedTeamIds)` quando `responsible_team_id` for nulo (fallback para o legado).
- Usa `useKpiData({ teamId: resolvedTeamIds[0] })` adaptado — mas precisamos suportar múltiplos teamIds quando `include_subteams=true`. Faremos um hook agregador novo, mantendo a forma de retorno de `useKpiData` (`KpiWithValues[]`) para continuar usando `KpiCard` sem mexer.

**KPIs de membros do time:**
- `kpi_metrics.owner_user_id IN (memberIds)` **E** o KPI **não está** já listado no grupo "do time" (deduplica por `id`).
- `memberIds` = `profiles.team_id IN (resolvedTeamIds)` (excluindo terminados, mesmo padrão do `useTeam`).

**Iniciativas do ciclo ativo:**
- Resolver `krIds` do ciclo (filtro `cycle_id`; se vazio → ciclo ativo via `useActiveCycle`) cujos `team_objective_id` pertencem a objetivos com `team_id IN (resolvedTeamIds)`.
- Buscar `okr_initiatives` com `kr_id IN (krIds)` e `deleted_at IS NULL`.
- Reutilizar `InitiativeCard` para renderizar (cada card já mostra owner, status, prioridade, datas).
- Agrupar visualmente por KR (Card por KR contendo seus `InitiativeCard`s) — coerente com o padrão hoje usado em `ObjectiveListItem` / `ContributingOkrCard`.

## Mudanças de código

### 1. Novo hook: `src/modules/teams/hooks/useTeamKpisGrouped.ts`

Hook agregador que, dado `resolvedTeamIds`:
- Lista KPIs onde `responsible_team_id IN teamIds` OR (`team_id IN teamIds` AND `responsible_team_id IS NULL`) → grupo `team`.
- Resolve `memberIds` via `profiles.team_id IN teamIds` (filtra terminados).
- Lista KPIs onde `owner_user_id IN memberIds` e ainda não estão no grupo `team` → grupo `members`.
- Reaproveita o pipeline de `useKpiData` para hidratar `KpiWithValues` (latest value, RAG, trend) — extraímos a lógica em uma função pura `hydrateKpisWithValues(kpis, values)` reutilizável (refactor mínimo).
- Query keys novas em `teamsKeys`:
  - `teamsKeys.contributionKpis(teamId, buId, includeSubteams)`

### 2. Novo hook: `src/modules/teams/hooks/useTeamKrInitiatives.ts`

- Resolve `krIds` para os `resolvedTeamIds` filtrados pelo `cycleId` (default = ciclo ativo).
- Carrega `okr_initiatives` com mesma estratégia de `useKrInitiatives` (owners batch).
- Retorna `Array<{ kr: { id, title, objective_title, team_name }, initiatives: Initiative[] }>` agrupado por KR.
- Query key: `teamsKeys.contributionInitiatives(teamId, buId, includeSubteams, cycleId)`.

### 3. Novo componente: `TeamContributionInitiatives.tsx`

- Container da nova sub-tab.
- Estados: loading (Skeleton), vazio (`EmptyState` com `Lightbulb`), populado (lista de Cards-por-KR).
- Cada card-KR: header com título + link `getShareableUrl('okr_team_key_result', kr.id)`, contador de iniciativas, e `InitiativeCard` (somente leitura — sem botões de edição, pois esta aba é "view"; criação/edição continua acontecendo em `/okrs?view=team`).

### 4. Novo componente: `TeamContributionKpis.tsx`

- Container da nova sub-tab.
- Renderiza 2 seções (`KpiAreaSection`-like header + grid de `KpiCard`):
  1. **KPIs do time** (responsabilidade direta) — ícone `Building2`, contador.
  2. **KPIs de membros do time** — ícone `Users`, contador, com sub-label "Sob responsabilidade pessoal de membros".
- Vazio: `EmptyState` específico por seção.
- Click no card abre `KpiSidePanel` (já é o padrão).

### 5. Atualizar `TeamContributionTab.tsx`

- Adicionar 2 entradas em `SUBTABS`:
  - `{ value: 'initiatives', label: 'Iniciativas' }`
  - `{ value: 'kpis', label: 'KPIs' }`
- Adicionar 2 `<TabsContent>` correspondentes que renderizam os novos componentes.
- Passar `resolvedTeamIds`, `cycleId`, `teamId` aos novos componentes.

### 6. Atualizar `src/lib/queryKeys/teams.ts`

Adicionar:
```ts
contributionKpis: (teamId, buId, includeSubteams) =>
  ['teams', 'contribution-kpis', teamId, buId, includeSubteams] as const,
contributionInitiatives: (teamId, buId, includeSubteams, cycleId) =>
  ['teams', 'contribution-initiatives', teamId, buId, includeSubteams, cycleId ?? null] as const,
```

### 7. Atualizar memória `team-contribution-tab-standard.md`

Documentar as 2 novas sub-tabs (`initiatives`, `kpis`), suas regras de filtragem (ciclo, sub-times, dois grupos de KPIs) e os hooks/keys associados.

## Não-fazer (anti-padrões)

- ❌ Não criar nova rota standalone — tudo dentro de `/teams/:id?tab=contribution`.
- ❌ Não duplicar `KpiCard`, `InitiativeCard`, `KpiSidePanel`.
- ❌ Não usar `select('*')` (Regra TCR #4).
- ❌ Não esquecer `bu_id`, soft-delete, `terminated`.
- ❌ Não permitir CRUD nessas sub-tabs (são views consolidadas; CRUD continua nas páginas SSOT de OKRs/KPIs) — alinhado ao pattern `org-contribution` que já é read-only.

## Validação pós-implementação

- `npx tsc --noEmit` (0 erros).
- Verificar manualmente que toggle "incluir sub-times" muda contagens de iniciativas e KPIs.
- Verificar que KPI listado no grupo "do time" não aparece no grupo "membros" (dedupe).
- Verificar que sem ciclo ativo nem cycleId, a aba Iniciativas mostra empty state amigável.
