# Plano — Reposicionar toggle de tickets e inverter default

## Mudanças
Tudo em `src/modules/tickets/components/TicketFilters.tsx` + `src/modules/tickets/pages/TicketsListPage.tsx`.

### 1. Toggle inline (sem nova linha)
- Remover o wrapper `<div className="space-y-3">` e a `<div>` separada do toggle.
- Mover o `Switch` + `Label` para dentro do mesmo `flex flex-wrap` dos selects, como último item, com `sm:ml-auto` para empurrar à direita quando houver espaço.
- Manter o comportamento de `disabled` quando `status !== "all"` (filtro pontual prevalece).

### 2. Default ON
`TicketsListPage.tsx`:
- `useUrlState({ key: "include_closed", defaultValue: true, parse: parsers.boolean })`.
- `DEFAULT_STATUSES` continua reagindo ao toggle:
  - `true` → `['waiting','paused','in_progress','done','discarded']` (default agora)
  - `false` → `['waiting','paused','in_progress']`
- Empty state: ajustar a mensagem condicional para refletir o novo default (só sugere ativar quando o usuário desligou o toggle).

## Não-objetivos
- Sem mudanças em hooks, queries, RLS, tipos.
- Sem alterar deep-links existentes da Home.

## Validação
1. `/tickets` (sem query params) lista todos os status (inclui concluídos e descartados) — toggle ligado por padrão.
2. Desligar o toggle → URL ganha `?include_closed=false`; lista esconde `done` e `discarded`.
3. Selecionar status pontual → toggle desabilita visualmente; filtro pontual prevalece.
4. Layout: toggle aparece na mesma linha dos selects no desktop; em mobile cai como último item do `flex-wrap`.

## Arquivos
- **Editar**: `src/modules/tickets/components/TicketFilters.tsx`, `src/modules/tickets/pages/TicketsListPage.tsx`
