# Bug: filtro `Compartilhadas` não funciona em `/okrs?shared=shared&view=team`

## Diagnóstico (TCR + docs canônicos)

1. `OkrDashboardPage.tsx` lê `sharedFilter` via `useUrlStates` (chave URL `shared`, valores `all|shared|exclusive`) — linha 81.
2. `OkrDashboardFilters.tsx` expõe o seletor "Tipo" e atualiza `filters.sharedFilter` corretamente.
3. **Defeito**: `displayObjectives` (memo nas linhas 289-312) **nunca consulta `filters.sharedFilter`**. O parâmetro vai para a URL, é mostrado como filtro ativo no chip ("Compartilhadas"), mas a lista renderizada permanece idêntica.
4. Campo `is_shared` já está selecionado no `OKR_FIELDS.teamObjective` e `teamObjectiveWithKrs` (`okrFieldDefinitions.ts`), portanto não há custo extra de query.
5. Aplicação canônica:
   - `team` view → primário: `teamObjectives`; `TeamOkrSections` recebe também `contributedObjectives`. Filtro deve atuar em ambos.
   - `my` view → `myObjectives` (já são team_objectives) — aplicar normalmente.
   - `company` view → `is_shared` não existe em `okr_org_objectives`; o filtro deve ficar **oculto** nessa view (TCR: filtros sem efeito devem ser escondidos para não confundir UX).

## Pré-checklist atendido

- TCR consultado: regras de URL state (#7) e `select('*')` (#4) respeitadas — campo já existe.
- `mem://features/okrs/shared-okr-contributor-view-standard` revisado: distinção dono vs contribuidor mantida.
- `mem://standards/frontend-memoization-standard`: alterações dentro de `useMemo` existente, sem novo componente.
- Sem mudanças em RLS, RPC, schema ou edge functions.

## Mudanças propostas

### 1. `src/modules/okrs/pages/OkrDashboardPage.tsx`

**(a)** Estender o `useMemo` `displayObjectives` (linhas 289-312) para aplicar `filters.sharedFilter` quando `activeView !== 'company'`:

```ts
const applySharedFilter = (objs: any[]) => {
  if (!filters.sharedFilter || filters.sharedFilter === 'all') return objs;
  if (filters.sharedFilter === 'shared')   return objs.filter(o => o.is_shared === true);
  if (filters.sharedFilter === 'exclusive') return objs.filter(o => !o.is_shared);
  return objs;
};
```

- `my` view: aplicar `applySharedFilter` após o filtro de KRs do usuário.
- `team` view: aplicar `applySharedFilter` antes do `sort` por nome de time.
- `company` view: não aplicar (org objectives não têm `is_shared`).

**(b)** Filtrar também `contributedObjectives` antes de passar para `TeamOkrSections` (linha 591):

```ts
const filteredContributed = useMemo(
  () => applySharedFilter(contributedObjectives || []),
  [contributedObjectives, filters.sharedFilter],
);
```

> Observação: como `contributedObjectives` por definição já são compartilhados (`is_shared=true`), `shared` mantém todos e `exclusive` remove todos — comportamento semanticamente correto.

### 2. `src/modules/okrs/components/dashboard/OkrDashboardFilters.tsx`

Esconder o seletor "Tipo" quando `activeView === 'company'` (campo não existe em org objectives) — wrap do bloco `SHARED_FILTER_OPTIONS` (linhas ~190-220) com `{showSharedFilter && activeView !== 'company' && (...)}`.

Atualizar `activeFilterCount` (linha 82) e `clearFilters` (linhas 95-103) para ignorar `sharedFilter` quando escondido.

### 3. Testes / verificação manual (sem novos arquivos de teste)

- `?view=team&shared=shared` → lista apenas objetivos do time com `is_shared=true` + objetivos contribuídos (todos shared por natureza).
- `?view=team&shared=exclusive` → lista apenas objetivos do time com `is_shared=false`; bloco de contribuídos fica vazio.
- `?view=my&shared=shared` → mostra somente objetivos onde sou KR-owner E `is_shared=true`.
- `?view=company&shared=shared` → seletor não aparece; nenhum objetivo é filtrado por shared.

### 4. Sem mudanças necessárias

- `useTeamObjectives`, `useMyTeamObjectives`, `useTeamContributedOkrs`: `is_shared` já incluso.
- Query keys: nenhuma mudança (filtragem é client-side, dados já hidratados).
- Memory: padrão existente (`shared-okr-contributor-view-standard`) já cobre a diferenciação dono/contribuidor; não há nova regra de domínio para registrar — bug fix puramente de cabeamento.

## Arquivos a alterar

- `src/modules/okrs/pages/OkrDashboardPage.tsx` (memo `displayObjectives` + memo novo para contributed)
- `src/modules/okrs/components/dashboard/OkrDashboardFilters.tsx` (esconder em company view)

## Risco

Baixo — alteração isolada, client-side, sem efeito em RLS/queries; campo `is_shared` já hidratado nos dados existentes.
