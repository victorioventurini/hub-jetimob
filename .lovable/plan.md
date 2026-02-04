
# Plano: Visualização de Evolução de KPIs e Métricas

## Contexto

Hoje o Hub exibe evolução de KRs em dois formatos:
1. **Modal (`KrHistoryDialog`)** - Acessível via clique em qualquer KR, mostrando gráfico de evolução e tabela de histórico com tabs
2. **Página dedicada (`/okrs/checkins`)** - Feed consolidado de check-ins com modos de visualização (cards, tabela, evolução)

Para KPIs/Métricas, já existe:
- O `KpiDetailDialog` que mostra um gráfico básico de evolução e tabela de histórico
- O hook `useKpiHistory` e `useKpiChartData` que processam os dados

O objetivo é **padronizar e evoluir** a experiência de visualização de KPIs para o mesmo nível das KRs, reaproveitando componentes existentes.

---

## Arquitetura de Componentes

```text
┌─────────────────────────────────────────────────────────────────┐
│                    COMPONENTES DE KR (existentes)                │
├─────────────────────────────────────────────────────────────────┤
│  KrHistoryDialog       → Modal completo com tabs (gráfico/tabela)│
│  KrEvolutionChart      → Gráfico de área reutilizável            │
│  KrCheckinsTable       → Tabela de check-ins com variação        │
│  CycleCheckinsPage     → Página com feed, filtros e modos        │
│  CycleCheckinsEvolution→ Grid de mini-gráficos de KRs            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               COMPONENTES DE KPI (a criar/evoluir)               │
├─────────────────────────────────────────────────────────────────┤
│  KpiHistoryDialog ★    → Modal com tabs (gráfico/tabela)         │
│  KpiEvolutionChart ★   → Gráfico de área reutilizável            │
│  KpiValuesTable ★      → Tabela de valores com variação          │
│  KpiEvolutionPage ★    → Página dedicada com filtros e modos     │
│  KpiEvolutionFeed ★    → Feed de valores com cards/grid          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementação Detalhada

### Fase 1: Componentes Base Reutilizáveis

#### 1.1 `KpiEvolutionChart` (novo)
**Arquivo:** `src/modules/kpis/components/KpiEvolutionChart.tsx`

Componente de gráfico de evolução de KPI, similar ao `KrEvolutionChart`:

- **Props:**
  - `values: KpiHistoryValue[]` - Array de valores ordenados por data
  - `targetValue: number | null` - Meta/Benchmark para linha de referência
  - `unit: string` - Unidade para formatação
  - `direction: 'up' | 'down'` - Direção esperada
  - `compact?: boolean` - Modo compacto para mini-gráficos
  - `className?: string`

- **Features:**
  - AreaChart com gradiente (Recharts)
  - Linha de referência para meta/benchmark
  - Tooltip com valor, data e origem
  - Estados vazios para 0 ou 1 valor

#### 1.2 `KpiValuesTable` (novo)
**Arquivo:** `src/modules/kpis/components/KpiValuesTable.tsx`

Tabela de valores históricos de KPI, similar ao `KrCheckinsTable`:

- **Colunas:**
  - Data/Hora
  - Usuário (quem registrou)
  - Valor Anterior
  - Valor Atual
  - Variação (com ícone de tendência)
  - Origem (badge com ícone)
  - Notas (tooltip se presente)

- **Features:**
  - Scroll horizontal para mobile
  - Skeleton loading
  - Empty state

---

### Fase 2: Modal de Histórico de KPI

#### 2.1 `KpiHistoryDialog` (novo)
**Arquivo:** `src/modules/kpis/components/KpiHistoryDialog.tsx`

Modal completo de visualização de evolução, baseado no `KrHistoryDialog`:

**Header:**
- Nome do indicador
- Badges: Tipo (KPI/Métrica), Status RAG, Área
- Valor atual com tendência e variação %
- Meta/Benchmark com badge

**Barra de Progresso:**
- Progresso em relação à meta (se houver)
- Labels: Base → Meta

**Metadados:**
- Responsável (avatar + nome)
- Área
- Direção (↑ Maior é melhor / ↓ Menor é melhor)
- Frequência

**Tabs:**
- "Evolução" - `KpiEvolutionChart`
- "Histórico Completo" - `KpiValuesTable` com badge de contagem

**Link contextual:**
- "Ver página dedicada" → `/kpis/evolution?kpi_id=xxx`

---

### Fase 3: Página Dedicada de Evolução

#### 3.1 Rota `/kpis/evolution`
**Arquivo:** `src/modules/kpis/pages/KpiEvolutionPage.tsx`

Página consolidada similar a `CycleCheckinsPage`:

**Header:**
- Breadcrumb: KPIs > Evolução
- PageHeader: "Evolução de Indicadores"

**Filtros (via URL state):**
- Tipo: Todos / KPI / Métrica
- Área
- Escopo: Time / Área / Org
- Time
- RAG Status
- Busca por nome

**Summary Cards:**
- Total de indicadores
- Em dia (on_track)
- Em risco (at_risk)
- Fora da meta (off_track)

**Modos de Visualização:**
- Cards - Grid de cards com mini-gráfico
- Tabela - Lista tabulada com valores recentes
- Gráficos - Grid expandido de gráficos

**Conteúdo:**
- Se único KPI filtrado → Gráfico expandido
- Se múltiplos → Grid de mini-cards clicáveis

---

### Fase 4: Hook de Dados

#### 4.1 `useKpiWithHistory` (novo)
**Arquivo:** `src/modules/kpis/hooks/useKpiWithHistory.ts`

Hook para buscar KPI com histórico completo para gráficos:

```typescript
interface KpiWithHistoryData {
  values: KpiHistoryValue[];
  name: string;
  unit: string;
  direction: 'up' | 'down';
  target_value: number | null;
  target_source: string | null;
  currentValue: number | null;
  previousValue: number | null;
  trend: 'up' | 'down' | 'stable';
  variation: number | null;
  totalValues: number;
  area?: { id: string; name: string; color: string | null };
  owner?: { id: string; display_name: string; photo_url: string | null };
}
```

#### 4.2 `useKpiEvolutionList` (novo)
**Arquivo:** `src/modules/kpis/hooks/useKpiEvolutionList.ts`

Hook para página de evolução com agregações:

```typescript
interface UseKpiEvolutionListOptions {
  indicatorType?: 'kpi' | 'metric';
  areaId?: string;
  scope?: 'team' | 'area' | 'org';
  teamId?: string;
  ragStatus?: 'on_track' | 'at_risk' | 'off_track';
  search?: string;
  page?: number;
  pageSize?: number;
}
```

---

### Fase 5: Integração no KpiDetailDialog

**Arquivo:** `src/modules/kpis/components/KpiDetailDialog.tsx`

Substituir o gráfico e tabela atuais pelos novos componentes:

1. Adicionar tabs "Evolução" / "Histórico Completo"
2. Usar `KpiEvolutionChart` para a tab de gráfico
3. Usar `KpiValuesTable` para a tab de tabela
4. Manter as demais seções (metadados, KRs vinculadas, histórico de meta)

---

### Fase 6: Rotas e Navegação

#### 6.1 Adicionar rota
**Arquivo:** `src/routes/core.routes.tsx`

```typescript
<Route path="/kpis/evolution" element={<KpiEvolutionPage />} />
```

#### 6.2 Link no KpiDetailDialog
Adicionar botão "Ver no contexto" que navega para `/kpis/evolution?q={nome_do_kpi}`

#### 6.3 Breadcrumb
**Arquivo:** `src/modules/kpis/components/ui/KpiBreadcrumb.tsx` (se não existir)

---

## Query Keys

Adicionar ao `src/lib/queryKeys/okrs.ts`:

```typescript
// KPI Evolution
kpiWithHistory: (kpiId: string | null) => ['kpi-with-history', kpiId] as const,
kpiEvolutionList: (buId: string | null, filters?: Record<string, unknown>) => 
  ['kpi-evolution-list', buId, filters] as const,
kpiEvolutionAggregates: (buId: string | null) => 
  ['kpi-evolution-aggregates', buId] as const,
```

---

## Estrutura de Arquivos

```text
src/modules/kpis/
├── components/
│   ├── KpiEvolutionChart.tsx      ★ novo
│   ├── KpiValuesTable.tsx         ★ novo
│   ├── KpiHistoryDialog.tsx       ★ novo
│   ├── KpiEvolutionFeed.tsx       ★ novo (grid de cards)
│   └── index.ts                   ← adicionar exports
├── hooks/
│   ├── useKpiWithHistory.ts       ★ novo
│   ├── useKpiEvolutionList.ts     ★ novo
│   └── index.ts                   ← adicionar exports
└── pages/
    ├── KpiDashboardPage.tsx       (existente)
    └── KpiEvolutionPage.tsx       ★ novo
```

---

## Comportamentos Esperados

### Modal (KpiHistoryDialog)
1. Ao clicar em qualquer KPI/Métrica, abrir modal com evolução
2. Tabs para alternar entre gráfico e tabela
3. Metadados completos no header
4. Link para página dedicada

### Página (/kpis/evolution)
1. Filtros sincronizados com URL (deep linking)
2. Modos de visualização: cards, tabela, gráficos
3. Se único indicador filtrado → gráfico expandido
4. Cards clicáveis abrem modal de detalhes

### Integração
1. `KpiDetailDialog` atualizado para usar novos componentes
2. `KpiCard` pode abrir `KpiHistoryDialog` diretamente
3. Navegação bidirecional entre modal e página

---

## Reutilização de Padrões

| Padrão KR | Equivalente KPI |
|-----------|-----------------|
| `KrEvolutionChart` | `KpiEvolutionChart` |
| `KrCheckinsTable` | `KpiValuesTable` |
| `KrHistoryDialog` | `KpiHistoryDialog` |
| `CycleCheckinsEvolution` | `KpiEvolutionFeed` |
| `CycleCheckinsPage` | `KpiEvolutionPage` |
| `useKrWithHistory` | `useKpiWithHistory` |
| `useCycleCheckins` | `useKpiEvolutionList` |

---

## Prioridade de Implementação

1. **P0 - Base**: `KpiEvolutionChart`, `KpiValuesTable`
2. **P0 - Modal**: `KpiHistoryDialog` + integração no `KpiCard`
3. **P1 - Página**: `KpiEvolutionPage` com rota
4. **P1 - Hook**: `useKpiWithHistory`, `useKpiEvolutionList`
5. **P2 - Polish**: Integrar no `KpiDetailDialog` existente

---

## Considerações Técnicas

- Todos os novos componentes devem usar padrões canônicos do Hub
- URL state via `useUrlState` e `useUrlStates`
- Query keys centralizadas em `src/lib/queryKeys`
- Cores semânticas (não hardcoded)
- Navegação via `<Link>` (não `onClick + navigate`)
- Suporte a dark mode via tokens CSS
