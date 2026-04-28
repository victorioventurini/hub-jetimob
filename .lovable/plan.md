# Padronizar toggle do Calendário de Ritos no formato /projects

## Objetivo
Substituir o toggle atual (dois ícones colados num grupo bordado, sem rótulo) na aba Calendário em `/settings/rituals?tab=calendar` pelo mesmo padrão visual usado em `/projects` (pílulas com ícone + rótulo, fundo `bg-muted`, item ativo com `bg-background shadow-sm`), conforme a screenshot enviada.

## Pré-checklist (executado)
- TCR / `DEVELOPMENT_STANDARDS` revisados — sem mudanças de estado/URL exigidas além do que já existe (`useUrlState({ key: 'view' })` já aplicado).
- Componente de referência: `src/modules/projects/components/ProjectViewToggle.tsx` (já é o padrão canônico de toggle de visualização do projeto).
- Sem impacto em RLS, BU-scoping, query keys, permissões ou edge functions — mudança puramente de UI/presentation.
- Memória `mem://standards/url-state-preservation` mantida (continuamos persistindo `view` na URL).

## Mudanças

### 1. Criar `RitualCalendarViewToggle` (novo)
Arquivo: `src/modules/okrs/pages/ritual-calendar/RitualCalendarViewToggle.tsx`

- Espelha 1:1 a estrutura/markup do `ProjectViewToggle` (mesmas classes Tailwind, mesmo comportamento de hover/active, mesmo breakpoint para esconder o rótulo no mobile).
- Opções:
  - `calendar` → ícone `CalendarDays`, rótulo "Calendário"
  - `list` → ícone `List`, rótulo "Lista"
- Props: `viewMode: 'calendar' | 'list'`, `onViewModeChange(mode)`.
- Tipo exportado: `RitualCalendarViewMode`.

Observação: mantemos o nome semântico "Calendário" (não "Grade") porque a aba já se chama Calendário e o modo grid é literalmente o calendário mensal — alinhado ao mental model do usuário.

### 2. Atualizar `CalendarTab.tsx`
Arquivo: `src/modules/okrs/pages/ritual-calendar/CalendarTab.tsx`

- Renomear tipo local `CalendarViewMode` para reusar `RitualCalendarViewMode` do novo componente.
- Trocar literais `'grid'` por `'calendar'` em:
  - `useUrlState` (defaultValue + parse)
  - condicional de renderização (`viewMode === 'calendar' ? <Grade> : <CalendarListView>`)
- Substituir o bloco `<div role="group" …>` com os dois `Button` ícone-only pelo `<RitualCalendarViewToggle />`.
- Reposicionar o toggle: hoje ele fica grudado ao navegador de mês; manter no mesmo container do header de filtros, mas alinhado à direita (espelhando `/projects`, que mostra o toggle no canto superior direito da listagem). Implementação: envolver navegador de mês e toggle num `flex justify-between` dentro da primeira célula do grid de filtros, ou mover o toggle para fora do grid (acima do Card, à direita do contador). Escolha: **mover para fora do Card de filtros**, num header `flex items-center justify-between` acima do calendário, igual ao layout de `/projects`. Isso aproxima o visual da screenshot enviada.

### 3. Compatibilidade de URL
- `?view=grid` legado: o `parse` aceitará `'grid'` como alias para `'calendar'` (retrocompatível com qualquer link salvo).
- `?view=list` continua funcionando sem mudanças.

### 4. Testes
- Adicionar `src/modules/okrs/pages/ritual-calendar/__tests__/RitualCalendarViewToggle.test.tsx` espelhando o teste de `ProjectViewToggle` (renderiza ambas as opções, dispara callback nos cliques).

## Arquivos afetados

```text
NOVO   src/modules/okrs/pages/ritual-calendar/RitualCalendarViewToggle.tsx
NOVO   src/modules/okrs/pages/ritual-calendar/__tests__/RitualCalendarViewToggle.test.tsx
EDIT   src/modules/okrs/pages/ritual-calendar/CalendarTab.tsx
```

## Fora do escopo
- Não muda comportamento de filtros, dados, RLS ou hooks.
- Não altera `CalendarListView` nem o grid mensal em si.
- Não muda copy de outras abas (Cadências, Saúde).
