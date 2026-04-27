# Reagrupamento da sub-tab KPIs por Escopo

URL: `/teams/:id?tab=contribution&subtab=kpis`

## Objetivo
Substituir os 2 grupos atuais ("Sob responsabilidade do time" / "Sob responsabilidade de membros") por **4 grupos por escopo canônico**, alinhados ao enum `KpiScope` (`org`/`area`/`team`) + o conceito de owner pessoal:

1. **{NomeDaBU}** (escopo `org`, ex: "Jetimob") — KPIs globais da BU
2. **Área** (escopo `area`) — agrupados por `responsible_area_id` (fallback `area_id`), com sub-cabeçalho por área
3. **Time** (escopo `team`) — KPIs cuja responsabilidade é do(s) time(s) selecionado(s)
4. **Responsável** — KPIs cujo owner é membro do time, mas que não se enquadram nos blocos acima

## TCR e canônicos consultados
- `mem://features/teams/team-contribution-tab-standard.md` — define a estrutura canônica das sub-tabs e proíbe duplicar `KpiCard`
- `src/modules/kpis/types.ts` — `KpiScope = 'team' | 'area' | 'org'` e `getScopeLabels(buName)` (label dinâmico com nome da BU — já existe SSOT)
- `src/modules/teams/hooks/useTeamKpisGrouped.ts` — hook agregador atual (vai ser reescrito mantendo o mesmo nome e contrato externo)
- `src/components/ui/area-badge.tsx` (via `KpiCard`) e `OkrScopeBadge` — padrão visual já existente

## Critérios de inclusão por bloco (ordem de prioridade — sem duplicação)

Resolução em cascata: cada KPI entra em **exatamente um** bloco, na ordem abaixo.

1. **{BU} (org)** — `kpi_metrics.scope = 'org'` E vinculado ao time via:
   - `responsible_team_id IN teamIds` OU
   - `team_id IN teamIds` (legado) OU
   - `responsible_area_id` = área do time OU
   - `owner_user_id IN memberIds`
   - (KPIs `scope=org` que não tocam o time não aparecem — mantém escopo da aba)

2. **Área** — `kpi_metrics.scope = 'area'` (mesmos critérios de vínculo acima). Sub-agrupado por `responsible_area_id ?? area_id`, com `AreaBadge` no cabeçalho de cada sub-grupo.

3. **Time** — `kpi_metrics.scope = 'team'` E (`responsible_team_id IN teamIds` OU `team_id IN teamIds` quando `responsible_team_id IS NULL`).

4. **Responsável** — qualquer KPI restante cujo `owner_user_id IN memberIds` e que não tenha entrado nos blocos 1–3. Sub-agrupado por owner (`display_name` + avatar).

`memberIds` = `profiles.team_id IN resolvedTeamIds` (sem terminados), como hoje.

## Mudanças

### `src/modules/teams/hooks/useTeamKpisGrouped.ts`
Reescrever `queryFn` para:
- Buscar em paralelo (3 queries `kpi_metrics` filtrando por `scope` + critérios + 1 query `profiles` para members + 1 query `kpi_values` em batch — mesmo padrão atual).
- Retornar nova shape:
  ```ts
  export interface TeamKpisGroupedByScope {
    org:    { buLabel: string; kpis: KpiWithValues[] };
    area:   { areaId: string | null; areaName: string; areaColor: string | null; kpis: KpiWithValues[] }[];
    team:   KpiWithValues[];
    owners: { ownerId: string; ownerName: string; photoUrl: string | null; kpis: KpiWithValues[] }[];
    memberCount: number;
    totalCount: number;
  }
  ```
- Manter query key `teamsKeys.contributionKpis(teamId, buId, includeSubteams)` (sem ampliar — mesma chave, só shape interna muda; cache será invalidado naturalmente no deploy).
- Continua respeitando: BU isolation (`useOptionalBuClient`), soft-delete, sem `select('*')`, `KPI_FIELDS` já inclui `scope`/`responsible_area_id`/`responsible_team_id`/`area`.

### `src/modules/teams/components/contribution/TeamContributionKpis.tsx`
Reescrever para renderizar 4 seções na ordem **BU → Área → Time → Responsável**, cada uma com:
- Ícone + título + `Badge` de contagem (padrão visual atual mantido).
- Skeleton/empty-state por bloco (esconder bloco vazio em vez de mostrar card "Nenhum...", para reduzir ruído quando não há nada).
- Empty-state global apenas se `totalCount === 0`.

Detalhes visuais:
- **BU**: ícone `Building2`, título dinâmico via `getScopeLabels(currentBu?.name).org` (ex: "Jetimob (Global)").
- **Área**: ícone `Layers`; sub-grupos com `AreaBadge` (reuso) — mesma divisória visual de `KpiAreaSection`.
- **Time**: ícone `Users`, título "Time" + nome do time. Quando `includeSubteams=true`, complementar com `({N} times)`.
- **Responsável**: ícone `User`; sub-grupos com avatar + nome do owner.

Reuso obrigatório: `KpiCard` em todos os blocos, sem CRUD (regra do padrão da aba).

## Não-fazer
- Não criar nova rota nem nova SSOT de KPIs — só reagrupar a view consolidada.
- Não duplicar `KpiCard`, `AreaBadge`, `getScopeLabels` — reusar.
- Não usar `select('*')`.
- Não alterar a query key (evita refetch desnecessário em outras telas).
- Não mostrar KPIs `scope=org` não relacionados ao time (mantém o escopo "contribuição do time").

## Atualização de memória
Atualizar `mem://features/teams/team-contribution-tab-standard.md` no item 5 (sub-tab `kpis`) para refletir o novo agrupamento por escopo canônico (BU → Área → Time → Responsável) com regra de cascata sem duplicação.

## Arquivos afetados
- `src/modules/teams/hooks/useTeamKpisGrouped.ts` (rewrite do queryFn + novo tipo de retorno)
- `src/modules/teams/components/contribution/TeamContributionKpis.tsx` (rewrite das seções)
- `.lovable/memory/features/teams/team-contribution-tab-standard.md` (atualização do item 5)
