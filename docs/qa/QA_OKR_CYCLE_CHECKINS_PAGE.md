# QA: Página de Check-ins do Ciclo (OKRs)

> Versão: 1.1  
> Última atualização: 2026-01-13
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
- Lista cronológica de check-ins
- Mostra: data, KR, objetivo, time, usuário, valor, tendência, confiança
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
- [ ] Troca de ciclo reseta paginação

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
- [ ] Abre corretamente do Feed
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

## Componentes Utilizados

- `CycleCheckinsPage` - Página principal
- `CycleCheckinsFeed` - Tab Feed
- `CycleCheckinsOverdue` - Tab Pendências
- `CycleCheckinsSummary` - Tab Resumo
- `CycleCheckinsFilters` - Barra de filtros
- `KrHistoryDialog` - Modal de histórico (reutilizado)

## Hooks

- `useCycleCheckins` - Dados de check-ins via RPC
- `useCycles` / `useActiveCycles` - Lista de ciclos
- `useManageableTeamsFlat` - Times para filtro

## Backend

- RPC: `get_cycle_checkins(p_cycle_id, p_filters)`
- Retorna: checkins, aggregates, overdue_krs, pagination
- RBAC via `get_manageable_teams()`

## Erros Comuns

1. **Ciclo não selecionado**: Usar ciclo ativo como default
2. **Sem dados**: Mostrar empty state apropriado
3. **Sem permissão**: RPC retorna lista vazia (não erro)
