## Objetivo
Adicionar filtro **Saúde** na listagem de projetos (`/projects`) com opções **No prazo / Em risco / Atrasados**, integrado ao padrão de URL state e reaproveitando componentes existentes (`ProjectHealthBadge`, `UrlSelect`, `ProjectFiltersBar`, `computeHealth`).

## Escopo
Apenas frontend/presentation. Sem mudanças de DB, RLS ou hooks de mutação. Sem novos componentes — apenas extensão dos existentes.

## Mudanças

### 1. `src/modules/projects/types.ts`
- Adicionar campo opcional ao `ProjectFilters`:
  ```ts
  health?: ProjectHealth | 'all';
  ```

### 2. `src/modules/projects/components/ProjectFiltersBar.tsx`
- Adicionar um `UrlSelect` para saúde, posicionado logo após o Status:
  - Opções: `on_track` → "No prazo", `at_risk` → "Em risco", `late` → "Atrasados"
  - `includeAllOption` com label "Saúde: Todas"
  - Largura consistente (`w-full sm:w-[160px]`)

### 3. `src/modules/projects/pages/ProjectsPage.tsx`
- Novo `useUrlState<ProjectHealth | 'all'>({ key: 'health', defaultValue: 'all' })`
- Incluir `health: healthState.value` no objeto `filters`
- No `handleFiltersChange`: serializar `health` em searchParams (omitir quando `'all'`)

### 4. `src/modules/projects/hooks/useProjects.ts`
- Aplicar filtro client-side **depois** do cálculo de `health` (que já existe via `computeHealth`):
  ```ts
  if (filters.health && filters.health !== 'all') {
    results = results.filter(p => p.health === filters.health);
  }
  ```
  Posicionado junto aos outros filtros client-side (search, team, kr).

## Reaproveitamento
- `ProjectHealth` enum já existe em `types.ts`
- `computeHealth` já é aplicado a cada projeto em `useProjects`
- `UrlSelect` + `useUrlState` é o padrão canônico já usado pelos demais filtros
- Nenhum componente novo é criado

## Fora de escopo
- Tornar `ProjectStatusSummary` clicável para filtrar por saúde (pode ser feito num próximo passo se desejado)
- Mudar a lógica de cálculo de saúde (continua `< 0` = late, `< 7d` = at_risk, resto = on_track)
- Filtro de saúde na visão Gantt (o filtro afetará a lista de projetos passada, então o Gantt já reflete automaticamente)
