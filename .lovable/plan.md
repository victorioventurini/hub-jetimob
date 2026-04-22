

# /decisions — Alinhar aos Canônicos + Filtros Salvos

## Objetivo
Ajustar a página `/decisions` aos padrões canônicos do Hub, revisar comportamento dos filtros, garantir URL state robusto e adicionar **filtros salvos** reaproveitando o `SavedLinksPopover` (mesmo padrão de Tickets/KPIs/OKRs/Projects).

## Diagnóstico (zero duplicação — só o que falta)

| Item | Hoje | Padrão canônico | Ação |
|------|------|-----------------|------|
| Busca | `<Input>` raw, sem debounce | `UrlSearchInput` (debounce + clear + Esc) | Trocar |
| Período | 2 `Popover` + `Calendar` inline | `UrlDateRangePicker` (range + clear) | Trocar |
| Limpar filtros | Inexistente | `UrlFilterBar` + `buildActiveFilters` | Adicionar |
| Filtros salvos | Inexistente | `SavedLinksPopover moduleSlug=…` | Adicionar |
| Reset de página | `pageState.set(1)` em cada `onChange` | Helper local `setFilter(setter, value)` | Consolidar |
| Defaults `'all'` | Tratados manualmente | OK — só normalizar ao montar `filters` | Já ok |
| URL state | ✅ Funciona | — | Manter |
| Ritos descontinuados | ✅ Já corrigido | — | Manter |

## Mudanças (apenas em `src/modules/okrs/pages/DecisionsPage.tsx`)

### 1. Imports
Adicionar:
```ts
import { UrlSearchInput, UrlDateRangePicker, UrlFilterBar, buildActiveFilters } from '@/shared/filters';
import { SavedLinksPopover } from '@/shared/saved-links';
```
Remover: `Input`, `Popover*`, `Calendar`, `format`/`parseISO` se não usados em outro ponto (`format` continua sendo usado nos cards — manter).

### 2. Header → ações
```tsx
<PageHeader
  title="Decisões e Notas"
  …
  actions={<SavedLinksPopover moduleSlug="decisions" />}
/>
```
- Reaproveita 100% a infra de `user_saved_links` (já cobre RLS por BU, favorito, criação/remoção). Nenhuma migration necessária — `module_slug` é texto livre.

### 3. Helper local de reset de página
```ts
const setAndResetPage = <T,>(setter: (v: T) => void, value: T) => {
  setter(value);
  pageState.set(1);
};
```
Aplicar em todos os filtros para remover repetição.

### 4. Substituir busca
```tsx
<UrlSearchInput
  value={searchState.value}
  onChange={(v) => setAndResetPage(searchState.set, v)}
  placeholder="Buscar no texto…"
  debounceMs={300}
  className="w-full sm:w-[260px]"
/>
```

### 5. Substituir 2 calendars por range único
```tsx
<UrlDateRangePicker
  startDate={dateFromState.value}
  endDate={dateToState.value}
  onChange={(s, e) => {
    dateFromState.set(s);
    dateToState.set(e);
    pageState.set(1);
  }}
  placeholder="Período"
/>
```

### 6. Barra de chips ativos + limpar tudo
Logo abaixo dos filtros:
```tsx
<UrlFilterBar
  activeFilters={buildActiveFilters(
    { status: statusState.value, category: categoryState.value, ritual: wizardState.value,
      owner: ownerState.value, from: dateFromState.value, to: dateToState.value, q: searchState.value },
    { status: 'pending', category: 'all', ritual: 'all', owner: '', from: '', to: '', q: '' },
    { status: 'Status', category: 'Categoria', ritual: 'Rito', owner: 'Responsável',
      from: 'De', to: 'Até', q: 'Busca' },
    {
      status: (v) => STATUS_OPTIONS.find(o => o.value === v)?.label ?? v,
      category: (v) => CATEGORY_OPTIONS.find(o => o.value === v)?.label ?? v,
      ritual: (v) => RITUAL_LABELS[v as WizardPersona] ?? v,
      from: (v) => format(parseISO(v), 'dd/MM/yyyy', { locale: ptBR }),
      to:   (v) => format(parseISO(v), 'dd/MM/yyyy', { locale: ptBR }),
    },
  )}
  onRemoveFilter={(key) => {
    const map: Record<string, () => void> = {
      status:   () => statusState.set('pending'),
      category: () => categoryState.set('all'),
      ritual:   () => wizardState.set('all'),
      owner:    () => ownerState.set(''),
      from:     () => dateFromState.set(''),
      to:       () => dateToState.set(''),
      q:        () => searchState.set(''),
    };
    map[key]?.(); pageState.set(1);
  }}
  onClearAll={() => {
    statusState.set('pending'); categoryState.set('all'); wizardState.set('all');
    ownerState.set(''); dateFromState.set(''); dateToState.set(''); searchState.set('');
    pageState.set(1);
  }}
/>
```

### 7. Limpeza
- Remover imports não utilizados (`Popover*`, `Calendar`, `Input`, `cn`, `CalendarIcon` no JSX dos filtros — mantém em outros lugares se necessário).
- Manter `ListPageFilters hideSearch` envolvendo os `Select`s + `BuUserSelect` + `UrlSearchInput` + `UrlDateRangePicker` (a busca passa para dentro do mesmo container, sem prop `searchValue` — passa como children agora; ajustar para usar `hideSearch` com children).

## Verificações pós-mudança (já cobertas pelos canônicos)
- ✅ URL state: todos os 8 parâmetros já estão em `useUrlState`.
- ✅ BU isolation: `useDecisionsInbox` + `SavedLinksPopover` usam BU-scoped client.
- ✅ Identity: `useProfileId` em `useSavedLinks` (sem `auth.uid()` em domínio).
- ✅ Query keys: `savedLinksKeys.list(buId, moduleSlug)` já prefixados.
- ✅ Sem `select('*')`: `useSavedLinks` lista colunas explícitas.
- ✅ `<Link>` para navegação (já usado para "Abrir rito").
- ✅ Ritos descontinuados: `ALL_RITUAL_WIZARD_TYPES` (já aplicado).

## Fora de escopo
- Nenhuma migration de banco (reaproveita `user_saved_links`).
- Nenhum hook novo, nenhum componente UI novo.
- Comportamento de paginação, escopos (self/team/area/all) e RPC `rpc_decisions_inbox` permanecem intactos.

