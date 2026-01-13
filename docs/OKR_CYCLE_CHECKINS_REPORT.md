# Relatório de Check-ins do Ciclo (OKRs)

> **Última atualização:** 2026-01-13

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

Visão cronológica de todos os check-ins, mostrando:
- Data e hora do check-in
- Título do Key Result (clicável para ver histórico)
- Objetivo e time associados
- Usuário que realizou o check-in
- Valor registrado e variação
- Nível de confiança (Alta/Média/Baixa)
- Comentários e bloqueadores (quando presentes)

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

## Permissões

A página respeita o modelo de permissões existente:

- **Líderes**: Visualizam dados do próprio time e times descendentes
- **Administradores**: Visualizam todos os dados da Business Unit
- **Usuários comuns**: Acesso restrito ao escopo de seus times

## Integração com KrHistoryDialog

O modal existente `KrHistoryDialog` é reutilizado como drill-down para detalhes de cada Key Result, evitando duplicação de código e mantendo consistência visual.

## Changelog

### 2026-01-13
- Removido botão "Iniciar Check-in do Time" (wizard modal legacy)
- Corrigido mapeamento da RPC `get_cycle_checkins` (`feed→checkins`, `total_count→total`)
- Ciclo default agora prioriza quarter sobre year
- Adotado padrão full-page para todos wizards de OKRs
