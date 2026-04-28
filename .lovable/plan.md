## Contexto (pré-checklist concluído)

- **TCR**: módulo "Ritual Calendar & Cadences v1.0" ativo. Tabelas envolvidas: `ritual_cadences`, `ritual_occurrences`. Última evolução: "Ritual Calendar Health Filters v1.0" (mesmo layout de filtros entre abas).
- **DEVELOPMENT_STANDARDS §E (URL State)**: filtros, ordenação e modos de visualização vão para URL via `useUrlState` de `@/shared/url` (API object, não tuple legado).
- **Memory `frontend-memoization-standard`**: linhas de listas densas devem usar `React.memo`.
- **Memory `url-state-preservation`**: `setSearchParams` em rotas multi-param usa functional update — coberto pelo `useUrlState` canônico.
- **Memory `entity-names-cell-tooltip-standard`**: para listar times em tooltip, usar `EntityNamesCell` (não criar tooltip paralelo).
- **Sem impactos**: RLS, query keys, edge functions, schema. Mudança 100% UI/presentation.

## Objetivo

Adicionar um toggle **Grade / Lista** na aba **Calendário** de `/settings/rituals`, mantendo todos os filtros atuais (mês, rito, time, usuário) e o `OccurrenceSheet` existente.

## Escopo

- **Editar**: `src/modules/okrs/pages/ritual-calendar/CalendarTab.tsx`
- **Criar**: `src/modules/okrs/pages/ritual-calendar/CalendarListView.tsx` (subcomponente da própria aba)
- **Não tocar**: `useRitualOccurrences`, `OccurrenceSheet`, `CadencesTab`, `HealthTab`, `constants.ts` (a menos que precise de label novo), nada em `lib/queryKeys`, RLS, edge.

## Comportamento

### Toggle
- `ToggleGroup` (shadcn) com 2 opções: **Grade** (`LayoutGrid`, default) e **Lista** (`List`).
- Posição: dentro do mesmo Card de filtros, alinhado à direita do navegador de mês (acima dos selects em mobile).
- Estado em URL com `useUrlState({ key: 'view', defaultValue: 'grid' })` — valores `'grid' | 'list'`. URL compartilhável (`?view=list`).
- Trocar de modo preserva mês, rito, time e usuário.

### Modo Grade
- Sem alterações no layout atual (grid 7 colunas, pills, legenda, auto-navigate).

### Modo Lista
- Mesma fonte: `filteredOccurrences` (já memoizado, herda todos os filtros e o auto-navigate de mês vazio).
- Layout de tabela leve, agrupada por dia:
  - Sub-header sticky por data: `qua, 05/mai/2026` (capitalizado, `date-fns/ptBR`).
  - Linhas: badge de persona (`WIZARD_TYPE_LABELS`), nome do time (quando `teamId` presente — resolvido via mesma fonte que o grid usa), badge de status (`STATUS_CONFIG`), contagem `completed/expected` para `collaborator` (mesma lógica de `getCollaboratorLabel`).
  - Click na linha → abre o mesmo `OccurrenceSheet` que o grid abre.
- Ordenação: `plannedDate` ASC, depois persona.
- Linha implementada como `CalendarListRow` com `React.memo` (padrão `frontend-memoization-standard`).
- Empty state: reutiliza a mesma mensagem ("Nenhuma ocorrência neste mês").
- Mantém a legenda de status no rodapé, idêntica ao grid.

### Header de mês
- O navegador `◀ mês ▶` continua governando o intervalo em ambos os modos.
- Sem date-range customizado nesta entrega (escopo separado).

## Detalhes técnicos

- **URL state**: `useUrlState<'grid' | 'list'>({ key: 'view', defaultValue: 'grid' })` de `@/shared/url`.
- **Acessibilidade**: `ToggleGroup` com `aria-label="Modo de visualização"` e `aria-pressed` por botão; tabela em modo lista com `<table>` semântica e `<th scope="col">`.
- **Mobile (≤ sm)**: cada item da lista colapsa em duas linhas (data+persona em cima; time+status embaixo). Toggle continua acessível.
- **i18n**: reutiliza labels existentes; novas strings somente "Grade" e "Lista".
- **Sem novas queries**, sem novas tabelas, sem mudança de query key.

## Não-objetivos

- Filtro de intervalo customizado (date range).
- Exportação `.csv` / `.ics`.
- Visão consolidada anual.
- Edição inline de cadência.

## Critérios de aceite

1. Toggle Grade/Lista visível no Calendário, default = Grade.
2. Trocar para Lista mantém mês, rito, time e usuário; voltar para Grade idem.
3. Lista exibe a mesma quantidade e identidade de ocorrências do grid, ordenadas por data ASC.
4. Click em linha abre o `OccurrenceSheet` correto, com `expectedCount`/`completedCount` corretos para `collaborator`.
5. URL reflete o modo (`?view=list`) e é compartilhável.
6. Layout sem overflow em viewport ≤ 993px.
7. Sem regressão nas abas Cadências, Saúde nem no fluxo de reagendamento.
