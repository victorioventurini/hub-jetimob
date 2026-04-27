# Correção: Bloco "Área" não aparece em /teams/:id?tab=contribution&subtab=kpis

## Pré-checklist (cumprido nesta análise)
- ✅ TCR (`docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` §2.3 + §2862) — modelo `kpi_metrics` v2.82/v2.90.
- ✅ DATA_MODEL_REGISTRY — `kpi_metrics` BU-scoped.
- ✅ DEVELOPMENT_STANDARDS — sem `select('*')`, sem alterar query keys.
- ✅ Memória canônica `mem://features/teams/team-contribution-tab-standard.md` — sub-tab KPIs.
- ✅ Schema SSOT de KPI: `src/modules/kpis/types.ts` + `editKpiSchema.ts`.

## Diagnóstico (com base no schema canônico — não no que pensei na 1ª iteração)

Semântica oficial dos campos de `kpi_metrics` (TCR + `types.ts` + `editKpiSchema.ts`):

| Campo | Significado | Obrigatoriedade |
|---|---|---|
| `area_id` (v2.82) | **Área dona estratégica** do KPI | Obrigatório quando `scope='area'` ativo |
| `responsible_area_id` (v2.90) | **Responsabilidade operacional** (override) | Obrigatório só para `scope='org'` ativo; opcional nos demais |
| `responsible_team_id` (v2.90) | Time operacional responsável | Opcional |

Ou seja: para `scope='area'`, `area_id` é a **fonte primária** do vínculo de área, e `responsible_area_id` é um override operacional opcional.

### Dados verificados no banco (time Comercial `d3247da9-...`, área Revenue `8e8bdffb-...`)

3 KPIs ativos `scope='area'` da Revenue, **corretamente cadastrados**:

| Nome | scope | area_id | responsible_area_id |
|---|---|---|---|
| MRR Total | area | Revenue | NULL |
| Crescimento de MRR (%) | area | Revenue | NULL |
| Ticket medio | area | Revenue | NULL |

### Bug em `useTeamKpisGrouped.ts`

A consulta e o predicado de classificação ignoram `area_id` (a fonte primária), checando apenas `responsible_area_id` (o override opcional). Resultado: nenhum dos 3 KPIs entra no resultado.

**Query (linhas 231-233):**
```ts
...(teamAreaIds.length > 0
  ? [q.in('responsible_area_id', teamAreaIds)]   // falta o irmão por area_id
  : []),
```

**Predicado `isLinkedToTeam` (linhas 287-291):**
```ts
areaIdSet.has(raw.responsible_area_id) ||   // falta fallback area_id
```

A inversão de prioridade já estava certa no agrupamento interno (linha 311: `responsible_area_id ?? area_id` para a chave do bucket), mas inconsistente com o filtro de inclusão.

## Correção

### `src/modules/teams/hooks/useTeamKpisGrouped.ts`

**A. `linkBy`** — adicionar critério irmão por `area_id`:

```ts
const linkBy = (q: any) => [
  q.in('responsible_team_id', resolvedTeamIds),
  q.is('responsible_team_id', null).in('team_id', resolvedTeamIds),
  ...(teamAreaIds.length > 0
    ? [
        q.in('responsible_area_id', teamAreaIds),
        // fonte primária quando não há override operacional
        q.is('responsible_area_id', null).in('area_id', teamAreaIds),
      ]
    : []),
  ...(memberIds.length > 0 ? [q.in('owner_user_id', memberIds)] : []),
];
```

A condicional `is('responsible_area_id', null)` evita duplicar KPIs já cobertos pela query irmã (e o dedup global por id continua sendo a barreira final).

**B. `isLinkedToTeam`** — fallback `area_id` quando `responsible_area_id` é NULL:

```ts
const isLinkedToTeam = (raw: any) =>
  teamIdSet.has(raw.responsible_team_id) ||
  (!raw.responsible_team_id && teamIdSet.has(raw.team_id)) ||
  areaIdSet.has(raw.responsible_area_id) ||
  (!raw.responsible_area_id && areaIdSet.has(raw.area_id)) ||  // novo
  memberIdSet.has(raw.owner_user_id);
```

A chave do bucket (linha 311 — `responsible_area_id ?? area_id`) já está alinhada e não precisa mudar — o sub-agrupamento por área permanece correto.

### Sem outras alterações
- `TeamContributionKpis.tsx`: nenhuma mudança.
- Query key: inalterada.
- Sem migrations.
- Documentação canônica: o standard `team-contribution-tab-standard.md` já descreve o agrupamento por escopo correto; nada a atualizar.

## Conformidade com regras inquebráveis
- Regra 3 (BU-scoped): `useOptionalBuClient` + `bu_id` filter mantidos.
- Regra 4 (sem `select('*')`): `KPI_FIELDS` explícito mantido.
- Regra 5 (query keys via `teamsKeys`): inalterado.
- Soft-delete: `deleted_at IS NULL` mantido.

## Validação esperada
Após a correção, no time **Comercial**:
- Bloco **Área (Revenue)** exibe 3 indicadores: MRR Total, Crescimento de MRR (%), Ticket medio.
- Bloco **Responsável** não duplica esses KPIs (cascata garante prioridade do bloco Área, e dedup por id elimina sobreposição da query "owner em members").

## Arquivos afetados
- `src/modules/teams/hooks/useTeamKpisGrouped.ts` (2 edições pontuais: `linkBy` + `isLinkedToTeam`)

## Não-fazer
- Não migrar dados (`area_id` é o campo canônico v2.82 — NÃO é legado a ser eliminado).
- Não alterar shape do retorno do hook nem o componente de UI.
- Não usar `select('*')`.
- Não criar nova rota nem nova SSOT.
