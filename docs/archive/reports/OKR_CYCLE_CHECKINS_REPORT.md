# Relatório de Check-ins do Ciclo (OKRs)

> **Última atualização:** 2026-01-15

## Visão Geral

A página de **Check-ins do Ciclo** oferece uma visão consolidada de todos os check-ins realizados durante um ciclo de OKRs, permitindo acompanhamento gerencial e diagnóstico de problemas.

## Acesso

- **URL**: `/okrs/checkins`
- **Navegação**: 
  - Dashboard de OKRs → Card de Alertas → "Ver todos os check-ins"
  - Menu OKRs → Check-ins do Ciclo

## Estrutura

### Seletor de Ciclo

No topo da página, um seletor permite escolher qual ciclo visualizar. O **ciclo trimestral vigente** é selecionado por padrão (ex: 2026-Q1).

**Priorização de ciclos ativos:**
1. Quarter (prioridade máxima)
2. Semester
3. Year

### Cards de Resumo

Três cards principais mostram métricas agregadas:

1. **KRs em Dia**: Percentual de Key Results com check-in nos últimos 7 dias
2. **Total de Check-ins**: Quantidade total de check-ins no ciclo
3. **KRs em Atraso**: Quantidade de KRs sem check-in recente

### Tabs

#### Tab: Feed

Visão cronológica de todos os check-ins com **toggle de visualização Cards/Tabela/Evolução**.

**Toggle de Visualização (v2.41.0):**
- **Cards** (default): Visualização em cards individuais
- **Tabela**: Visualização tabular com todas as informações
- **Evolução**: Visualização de gráficos de evolução das KRs ⭐ NOVO

**URL State:** `?view=cards`, `?view=table` ou `?view=evolution` (persiste no refresh)

**Visualização Evolução:**
- Se **uma única KR** está filtrada (via busca): Exibe gráfico expandido com progresso e histórico
- Se **múltiplas KRs**: Exibe grid de mini-cards clicáveis com gráficos compactos
- Clique em mini-card abre `KrHistoryDialog` com gráfico completo
- Reutiliza `KrEvolutionChart` centralizado

**Dados exibidos:**
- Data e hora do check-in
- Título do Key Result (clicável para ver histórico)
- Objetivo e time associados
- Usuário que realizou o check-in
- Valor registrado e variação (anterior → atual)
- Nível de confiança (Alta/Média/Baixa)
- Comentários e bloqueadores (quando presentes)

**Componentes:**
- `CycleCheckinsViewToggle` - Toggle Cards/Tabela/Evolução
- `CycleCheckinsFeed` - Renderização condicional cards/tabela/evolução
- `CycleCheckinsTable` - Visualização tabular
- `CycleCheckinsEvolution` - Visualização de gráficos ⭐ NOVO

#### Tab: Pendências

Lista de Key Results que não receberam check-in nos últimos 7 dias:
- Título do KR
- Time responsável
- Owner
- Tempo desde o último check-in ("há X dias")
- Status atual (No caminho/Em risco/Atrasado)

#### Tab: Resumo

Visão agregada por time, mostrando cards com:
- Percentual de KRs em dia
- Quantidade de KRs atrasados
- Confiança predominante

Clicar em um time aplica o filtro e redireciona para o Feed.

## Filtros

- **Busca**: Pesquisa por texto no título de KRs e Objetivos
- **Time**: Filtra por time específico (respeita hierarquia)
- **Confiança**: Filtra por nível de confiança (Alta/Média/Baixa)
- **Status**: Filtra por status RAG (No caminho/Em risco/Atrasado)

Todos os filtros são sincronizados com a URL, permitindo compartilhar links com filtros aplicados.

## URL State Completo

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `cycle_id` | uuid | ciclo ativo | ID do ciclo selecionado |
| `tab` | enum | `feed` | Tab ativa: `feed`, `pending`, `summary` |
| `view` | enum | `cards` | Modo de visualização: `cards`, `table`, `evolution` |
| `team_id` | uuid | - | Filtro por time |
| `confidence` | enum | `all` | Filtro por confiança |
| `status` | enum | `all` | Filtro por status RAG |
| `q` | string | - | Busca textual |
| `page` | number | `1` | Página atual |
| `page_size` | number | `20` | Itens por página |

## Permissões

A página respeita o modelo de permissões existente:

- **Líderes**: Visualizam dados do próprio time e times descendentes
- **Administradores**: Visualizam todos os dados da Business Unit
- **Usuários comuns**: Acesso restrito ao escopo de seus times

## Integração com KrHistoryDialog

O modal existente `KrHistoryDialog` é reutilizado como drill-down para detalhes de cada Key Result, evitando duplicação de código e mantendo consistência visual.

## Componentes

| Componente | Caminho | Descrição |
|------------|---------|-----------|
| `CycleCheckinsPage` | `src/modules/okrs/pages/` | Página principal |
| `CycleCheckinsFeed` | `src/modules/okrs/components/cycle-checkins/` | Feed com toggle cards/tabela/evolução |
| `CycleCheckinsTable` | `src/modules/okrs/components/cycle-checkins/` | Visualização tabular |
| `CycleCheckinsEvolution` | `src/modules/okrs/components/cycle-checkins/` | Visualização de gráficos ⭐ NOVO |
| `CycleCheckinsViewToggle` | `src/modules/okrs/components/cycle-checkins/` | Toggle de visualização (3 opções) |
| `CycleCheckinsOverdue` | `src/modules/okrs/components/cycle-checkins/` | Tab Pendências |
| `CycleCheckinsSummary` | `src/modules/okrs/components/cycle-checkins/` | Tab Resumo |
| `CycleCheckinsFilters` | `src/modules/okrs/components/cycle-checkins/` | Barra de filtros |

## Hooks

| Hook | Caminho | Descrição |
|------|---------|-----------|
| `useCycleCheckins` | `src/modules/okrs/hooks/` | Dados de check-ins via RPC |
| `useKrWithHistory` | `src/modules/okrs/hooks/useKrHistory.ts` | Busca KR + histórico para gráficos ⭐ NOVO |
| `useKrHistory` | `src/modules/okrs/hooks/useKrHistory.ts` | Apenas histórico de check-ins |

## Changelog

### 2026-01-15 (v2.41.0)
- Adicionada visualização "Evolução" com gráficos
- Novo componente `CycleCheckinsEvolution`
- Novo hook `useKrWithHistory` (busca KR + histórico)
- Toggle agora com 3 opções: Cards, Tabela, Evolução
- URL state `?view=evolution` para nova visualização
- Gráfico expandido para filtro de uma única KR
- Grid de mini-cards para múltiplas KRs

### 2026-01-15
- Adicionado toggle Cards/Tabela na tab Feed
- Novo componente `CycleCheckinsViewToggle`
- Novo componente `CycleCheckinsTable`
- URL state `?view=` para persistir visualização

### 2026-01-13
- Removido botão "Iniciar Check-in do Time" (wizard modal legacy)
- Corrigido mapeamento da RPC `get_cycle_checkins` (`feed→checkins`, `total_count→total`)
- Ciclo default agora prioriza quarter sobre year
- Adotado padrão full-page para todos wizards de OKRs
