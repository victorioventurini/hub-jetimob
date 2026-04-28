## Objetivo

Sinalizar visualmente, no `/kpis`, quais indicadores têm **escopo Global** (`scope === 'org'`), para que o usuário diferencie rapidamente KPIs globais da BU dos KPIs de Área e de Time.

## Contexto

- O modelo já tem `KpiScope = 'team' | 'area' | 'org'`. "Global" = `org`.
- Hoje, no card e na tabela, só aparece a **Área** (via `AreaBadge`); o escopo Global não fica claro — um KPI "Global" se confunde com um KPI de Área.
- Já existe `getScopeLabels(buName)` que retorna `"<BU> (Global)"` para escopo `org`. Vamos reutilizar.

## Escopo da mudança (UI-only, sem regra de negócio)

### 1. Novo componente `KpiScopeBadge`
Arquivo novo: `src/modules/kpis/components/KpiScopeBadge.tsx`

- Props: `scope: KpiScope`, opcional `buName?: string`, opcional `className`.
- Renderiza **somente** quando `scope === 'org'` (por enquanto não polui Área/Time, que já têm seus próprios indicadores visuais).
- Visual: `Badge` outline com ícone `Globe` (lucide) + texto **"Global"**, com `Tooltip` mostrando `"Indicador global da BU <buName>"`.
- Tom: usar tokens semânticos do design system (ex.: `bg-info/5 text-info border-info/20`), seguindo o padrão de `KrPrimaryKpiBadge`.

### 2. Exibir o badge no `KpiCard`
Arquivo: `src/modules/kpis/components/KpiCard.tsx`

- Na linha do header onde já aparecem `AreaBadge` + ícone de fonte (linhas ~116-137), adicionar `<KpiScopeBadge scope={kpi.scope} buName={currentBu?.name} />` ao lado do `AreaBadge`.
- Importar `useBu` para obter o nome da BU (apenas para o tooltip).

### 3. Exibir o badge na `KpiDashboardTable`
Arquivo: `src/modules/kpis/components/KpiDashboardTable.tsx`

- Na coluna **Área** (linhas ~153-160): se `kpi.scope === 'org'`, renderizar `<KpiScopeBadge scope="org" buName={...} />` em vez do `—`. Se houver `area` E for `org`, mostrar os dois lado a lado.

### 4. Sem mudanças
- Sem alteração de filtros, hooks, RPC, RLS, types ou banco.
- Filtro de escopo no `KpiDashboardFilters` já existe e continua igual.

## Critério de aceite

- KPIs com `scope === 'org'` mostram um badge **"Global"** no card (header) e na tabela (coluna Área).
- KPIs `team` e `area` permanecem visualmente como hoje.
- Tooltip do badge mostra o nome da BU atual.
- Sem regressão em filtros, RAG, ou outras colunas.

## Arquivos afetados

- **novo**: `src/modules/kpis/components/KpiScopeBadge.tsx`
- **edit**: `src/modules/kpis/components/KpiCard.tsx` (adiciona badge no header)
- **edit**: `src/modules/kpis/components/KpiDashboardTable.tsx` (adiciona badge na coluna Área)
