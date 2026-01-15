# QA: Página de Check-ins do Ciclo (OKRs)

> Versão: 1.3  
> Última atualização: 2026-01-15
> **Nota:** CheckinWizard modal foi removido em favor de full-page wizards

## Visão Geral

Página consolidada (`/okrs/checkins`) que exibe todos os check-ins de um ciclo de OKRs, com foco gerencial e diagnóstico.

## Rota

```
/okrs/checkins?cycle_id=<UUID>
```

## Parâmetros de URL (URL State)

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `cycle_id` | uuid | ciclo ativo | ID do ciclo selecionado |
| `tab` | enum | `feed` | Tab ativa: `feed`, `pending`, `summary` |
| `view` | enum | `cards` | Modo visualização: `cards`, `table`, `evolution` |
| `team_id` | uuid | - | Filtro por time |
| `owner_id` | uuid | - | Filtro por owner |
| `confidence` | enum | `all` | Filtro por confiança: `high`, `medium`, `low`, `all` |
| `status` | enum | `all` | Filtro por RAG status: `green`, `yellow`, `red`, `all` |
| `date_from` | date | - | Data início do período |
| `date_to` | date | - | Data fim do período |
| `only_overdue` | boolean | `false` | Mostrar apenas atrasados |
| `q` | string | - | Busca textual |
| `page` | number | `1` | Página atual |
| `page_size` | number | `20` | Itens por página |

## Funcionalidades

### Tab: Feed

**Toggle de Visualização (v1.3):**
- **Cards** (default): Visualização em cards individuais
- **Tabela**: Visualização tabular com todas as informações
- **Evolução**: Visualização de gráficos de evolução ⭐ NOVO
- Toggle persiste na URL (`?view=cards`, `?view=table` ou `?view=evolution`)

**Visualização Evolução:**
- **1 KR filtrada**: Gráfico expandido com progresso, baseline, target e histórico
- **Múltiplas KRs**: Grid de mini-cards clicáveis com gráficos compactos
- Clique em mini-card abre `KrHistoryDialog`

**Dados exibidos:**
- Data, KR, objetivo, time, usuário, valor, tendência, confiança
- Comentários e bloqueadores inline
- Paginação
- Clique em KR abre `KrHistoryDialog`

### Tab: Pendências
- Lista de KRs sem check-in nos últimos 7 dias
- Mostra: KR, time, owner, "há X dias", status RAG
- Botão "Histórico" abre `KrHistoryDialog`
- Banner de alerta com contagem

### Tab: Resumo
- Cards por time com:
  - % de KRs em dia
  - Quantidade de atrasados
  - Confiança dominante
- Clique em time aplica filtro e muda para tab Feed

## Checklist de QA

### URL State
- [ ] Parâmetros persistem no refresh
- [ ] Parâmetros são atualizados ao mudar filtros
- [ ] URL é compartilhável (abre com mesmos filtros)
- [ ] Tab persiste na URL
- [ ] **View mode (`?view=`) persiste no refresh**
- [ ] Troca de ciclo reseta paginação

### Toggle Cards/Tabela/Evolução
- [ ] Toggle visível na tab Feed com 3 opções
- [ ] Alterna corretamente entre Cards, Tabela e Evolução
- [ ] URL atualiza com `?view=cards`, `?view=table` ou `?view=evolution`
- [ ] Preference mantida ao trocar de página
- [ ] Loading skeleton correto em cada modo
- [ ] Empty state correto em cada modo

### Visualização Tabela
- [ ] Colunas: Data, Usuário, KR, Objetivo, Time, Valor, Confiança, Info
- [ ] Clique em KR abre `KrHistoryDialog`
- [ ] Tooltips funcionam para comentários/bloqueadores
- [ ] Scroll horizontal em mobile
- [ ] Ordenação por data (cronológica)

### Visualização Evolução ⭐ NOVO
- [ ] 1 KR filtrada: Gráfico expandido com progresso e histórico
- [ ] Múltiplas KRs: Grid de mini-cards com gráficos compactos
- [ ] Progress bar mostra baseline → target
- [ ] Gráfico exibe linha de meta e baseline
- [ ] Clique em mini-card abre `KrHistoryDialog`
- [ ] Loading skeleton nos gráficos
- [ ] Empty state quando sem KRs

### Permissões (RBAC)
- [ ] Líder vê apenas times próprios + descendentes
- [ ] Admin vê todos os times da BU
- [ ] Usuário comum não vê dados fora do escopo
- [ ] Líder de sub-time NÃO vê time pai

### Tabs
- [ ] Feed: lista cronológica funciona
- [ ] Feed: paginação funciona
- [ ] Pendências: lista overdue correta
- [ ] Pendências: estado vazio quando tudo em dia
- [ ] Resumo: cards por time renderizam
- [ ] Resumo: clique em time filtra corretamente

### KrHistoryDialog
- [ ] Abre corretamente do Feed (Cards)
- [ ] Abre corretamente do Feed (Tabela)
- [ ] Abre corretamente das Pendências
- [ ] Dados do KR são carregados
- [ ] Gráfico de evolução funciona

### Cards de Resumo
- [ ] % KRs em dia calculado corretamente
- [ ] Total de check-ins correto
- [ ] Contagem de atrasados correta

### Filtros
- [ ] Busca por texto funciona
- [ ] Filtro por time funciona
- [ ] Filtro por confiança funciona
- [ ] Filtro por status funciona
- [ ] Limpar filtros funciona
- [ ] Badge de filtros ativos atualiza

### Performance
- [ ] Página carrega em < 3s
- [ ] Paginação não recarrega toda a página
- [ ] Sem queries N+1

### Responsividade
- [ ] Layout mobile funciona
- [ ] Tabs compactas em mobile
- [ ] Cards empilham verticalmente
- [ ] Toggle responsivo (ícones em mobile)
- [ ] Tabela com scroll horizontal em mobile

## Componentes Utilizados

- `CycleCheckinsPage` - Página principal
- `CycleCheckinsFeed` - Tab Feed (com toggle e renderização condicional)
- `CycleCheckinsTable` - Visualização tabular
- `CycleCheckinsEvolution` - Visualização de gráficos ⭐ NOVO
- `CycleCheckinsViewToggle` - Toggle Cards/Tabela/Evolução
- `CycleCheckinsOverdue` - Tab Pendências
- `CycleCheckinsSummary` - Tab Resumo
- `CycleCheckinsFilters` - Barra de filtros
- `KrHistoryDialog` - Modal de histórico (reutilizado)
- `KrEvolutionChart` - Gráfico de evolução (reutilizado)

## Hooks

- `useCycleCheckins` - Dados de check-ins via RPC
- `useCycles` / `useActiveCycles` - Lista de ciclos
- `useManageableTeamsFlat` - Times para filtro
- `useKrWithHistory` - Busca KR + histórico para gráficos ⭐ NOVO

## Backend

- RPC: `get_cycle_checkins(p_cycle_id, p_filters)`
- Retorna: checkins, aggregates, overdue_krs, pagination
- RBAC via `get_manageable_teams()`

## Erros Comuns

1. **Ciclo não selecionado**: Usar ciclo ativo como default
2. **Sem dados**: Mostrar empty state apropriado
3. **Sem permissão**: RPC retorna lista vazia (não erro)
