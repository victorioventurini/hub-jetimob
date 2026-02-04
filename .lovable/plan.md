
# Plano: Reorganização do Header de Páginas de KPIs

## Objetivo
Reorganizar o layout do header das páginas `/kpis` e `/kpis/evolution` seguindo o padrão:
- **Linha 1**: Busca textual + Filtros (todos em uma só linha)
- **Linha 2**: Contador de resultados (esquerda) + Opções de visualização/ordenação (direita)

---

## Fase 1: Correções Imediatas nas Páginas de KPIs

### 1.1 KpiDashboardPage (`/kpis`)

**Correções:**
1. Remover `KpisBreadcrumb` separado (viola anti-pattern #11)
2. Adicionar `breadcrumbs` via prop do `PageHeader`
3. Reestruturar para:
   - **Linha 1**: `UrlSearchInput` + `KpiDashboardFilters` (todos os selects lado a lado)
   - **Linha 2**: Contador de resultados + `SavedLinksPopover` + `KpiViewToggle`
4. Mover botão "Evolução" para junto do `PageHeader.actions`

**Estrutura proposta:**
```
PageHeader (com breadcrumbs integrados)
  └─ actions: [SavedLinks] + [Evolução] + [Novo Indicador]

KpiStatusSummary (cards de resumo)

[Row 1 - Filtros]
  └─ UrlSearchInput + KpiDashboardFilters (Tipo, Status, Área, Escopo, Time)

[Row 2 - Opções de Exibição]
  └─ Contador de resultados (esquerda) + KpiViewToggle (direita)

Conteúdo (Cards/Tabela)
```

### 1.2 KpiEvolutionPage (`/kpis/evolution`)

**Correções:**
1. Reestruturar para seguir o mesmo padrão:
   - **Linha 1**: Busca + todos os filtros
   - **Linha 2**: Contador + Toggle de visualização (Cards/Tabela/Gráficos)

---

## Fase 2: Evolução do Componente ListPageFilters

### 2.1 Novo componente: `ViewOptionsBar`

Criar componente centralizado para a linha de opções de visualização:

```tsx
// src/components/ui/view-options-bar.tsx
interface ViewOptionsBarProps {
  resultCount?: number;
  resultCountLabel?: string;
  resultCountLabelSingular?: string;
  children?: ReactNode; // ViewToggle, SortControl, etc
  className?: string;
}

export function ViewOptionsBar({
  resultCount,
  resultCountLabel = "itens encontrados",
  resultCountLabelSingular = "item encontrado",
  children,
  className,
}: ViewOptionsBarProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      {/* Contador à esquerda */}
      {typeof resultCount === "number" && (
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {resultCount.toLocaleString("pt-BR")}
          </span>{" "}
          {resultCount === 1 ? resultCountLabelSingular : resultCountLabel}
        </span>
      )}
      
      {/* Controles à direita */}
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
```

### 2.2 Refatorar `ListPageFilters`

- Remover `resultCount` e props relacionadas do `ListPageFilters`
- Remover `actions` (que estava sendo usado para ViewToggle)
- Focar apenas em: busca + filtros inline

**Nova assinatura:**
```tsx
interface ListPageFiltersProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchDebounceMs?: number;
  searchClassName?: string;
  children?: ReactNode; // Filtros (selects, etc)
  className?: string;
  hideSearch?: boolean;
}
```

---

## Fase 3: Atualização da Documentação

### 3.1 UI_COMPONENTS_REGISTRY.md

Adicionar nova seção: **"5.4 Layout de Páginas de Listagem"**

```markdown
### 5.4 Layout de Páginas de Listagem

Páginas com listagem de dados devem seguir esta estrutura hierárquica:

1. **PageHeader**: Título, descrição, breadcrumbs, ações principais
2. **Summary Cards** (opcional): Resumo estatístico
3. **FilterRow** (`ListPageFilters`): Busca + Filtros em uma linha
4. **ViewOptionsBar**: Contador + Toggle de visualização + Ordenação
5. **Content**: Cards, Tabela ou outro formato

```tsx
// ✅ CORRETO: Layout padronizado
<PageHeader
  title="Indicadores"
  breadcrumbs={[{ label: "Indicadores" }]}
  actions={<Button>Novo</Button>}
/>

<SummaryCards {...} />

<ListPageFilters
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Buscar..."
>
  <TypeSelect value={type} onChange={setType} />
  <StatusSelect value={status} onChange={setStatus} />
</ListPageFilters>

<ViewOptionsBar
  resultCount={items.length}
  resultCountLabel="indicadores"
>
  <KpiViewToggle viewMode={view} onViewModeChange={setView} />
</ViewOptionsBar>

<Content />
```

**Anti-patterns:**
| # | Anti-pattern | Alternativa |
|---|--------------|-------------|
| 12 | ViewToggle dentro de ListPageFilters.actions | Usar ViewOptionsBar separado |
| 13 | Contador misturado com filtros | Mover para ViewOptionsBar |
```

---

## Fase 4: Aplicar Padrão em Outras Páginas (Pós-Validação)

Após validação das páginas de KPIs, aplicar o mesmo padrão em:
- `/assets/inventory`
- `/assets/keys`  
- `/assets/gifts`
- Outras páginas de listagem

---

## Resumo de Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/ui/view-options-bar.tsx` | **CRIAR** - Novo componente |
| `src/components/ui/list-page-filters.tsx` | **REFATORAR** - Simplificar props |
| `src/modules/kpis/pages/KpiDashboardPage.tsx` | **REFATORAR** - Aplicar novo layout |
| `src/modules/kpis/pages/KpiEvolutionPage.tsx` | **REFATORAR** - Aplicar novo layout |
| `docs/canonical/UI_COMPONENTS_REGISTRY.md` | **ATUALIZAR** - Documentar padrão |

---

## Benefícios

1. **Consistência visual**: Todas as páginas de listagem seguem o mesmo padrão
2. **Separação de responsabilidades**: Filtros ≠ Opções de exibição
3. **Flexibilidade**: Cada linha pode ser customizada independentemente
4. **Documentação clara**: Anti-patterns explícitos previnem erros futuros

