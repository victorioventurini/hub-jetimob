# Plano — Esconder tickets concluídos/descartados por padrão em /tickets

## Pré-checklist (executado)
- ✅ TCR / `Tickets` ativo; `tickets` é um módulo com Saved Links v1.4 (`SavedLinksPopover moduleSlug="tickets"` já está em `TicketsPage`).
- ✅ Standard de URL state respeitado (filtros já moram em `useUrlState` em `TicketsListPage.tsx`).
- ✅ Hook `useTickets` (em `useTicketQueries.ts`) já aceita `status` como `TicketStatus | TicketStatus[]` e usa `.in("status", ...)` quando array. **Não precisa migration nem mudar tipos**.
- ✅ Componente canônico `TicketStatusSelect` já é usado nos filtros — qualquer multi-select deve nascer dele para não fragmentar.
- ✅ Hoje já há regra implícita: quando `status="all"`, `TicketsListPage` envia `['waiting','paused','in_progress','done']` ao hook (exclui apenas `discarded`). Concluídos continuam aparecendo — é exatamente a queixa.
- ✅ Deep-links existentes da Home (`/tickets`, `/tickets?overdue=true`, `/tickets?due_today=true`) não setam `status`, portanto continuam funcionando com o novo default.

## Diagnóstico
"Todos os status" hoje significa "tudo menos descartados". Concluídos ficam misturados com em-andamento, gerando ruído visual. As três opções do usuário são viáveis; abaixo a recomendação.

## Recomendação: opção 2 + abertura para evoluir para multi-select depois

Toggle único e óbvio "Mostrar concluídos e descartados" ao lado dos filtros, persistido em URL. É o caminho de menor atrito, resolve 95% dos casos com 1 clique, e mantém compatibilidade com Saved Links sem precisar reformular o select de status.

Por quê não a opção 1 agora:
- Multi-select de status custa: trocar `TicketStatusSelect` (canônico) ou criar variante; ajustar `useUrlState` para CSV; reformatar UI; risco de regressão em outros consumos do select. Pode ser feito numa segunda iteração se houver mais demanda por combinações arbitrárias (ex.: "só waiting + paused").

Por quê não inventar uma 3ª opção: o toggle já cobre o pedido com clareza máxima e zero curva de aprendizado.

## Mudanças (escopo cirúrgico)

### 1. Novo URL state `include_closed` (boolean, default `false`)
`src/modules/tickets/pages/TicketsListPage.tsx`
- Adicionar:
  ```ts
  const includeClosedState = useUrlState<boolean>({
    key: 'include_closed',
    defaultValue: false,
    parse: parsers.boolean,
  });
  const includeClosed = includeClosedState.value;
  ```
- Atualizar `DEFAULT_STATUSES` para refletir o toggle:
  ```ts
  const DEFAULT_STATUSES: TicketStatus[] = includeClosed
    ? ['waiting', 'paused', 'in_progress', 'done', 'discarded']
    : ['waiting', 'paused', 'in_progress'];
  ```
- Comportamento preservado quando o usuário escolhe explicitamente um status no select (`statusFilter !== "all"`): o filtro pontual sempre vence o toggle (ex.: selecionar "Concluído" mostra concluídos mesmo com toggle desligado).
- Incluir `includeClosed` nas dependências do `useMemo` de `queryFilters`.

### 2. UI do toggle no filtro
`src/modules/tickets/components/TicketFilters.tsx`
- Adicionar `includeClosed` e `onIncludeClosedChange` às props.
- Renderizar um `Toggle`/`Switch` canônico (usar o mesmo padrão de `showOverdue` se existir; ver `TicketFilters` atual — hoje `overdue` está fora deste componente, então seguir a convenção que já estiver em uso na página).
- Texto: **"Incluir concluídos e descartados"** (off por padrão). Ícone discreto à direita dos selects, alinhado com o restante.
- Quando o usuário escolhe "Concluído" ou "Descartado" no select de status, o toggle fica desabilitado/visualmente neutro (não tem efeito porque o filtro pontual prevalece).

### 3. Indicador visual sutil (opcional, de baixo custo)
- No `EmptyState` "nenhum ticket encontrado", quando `!includeClosed && statusFilter === 'all'`, sugerir: "Concluídos e descartados estão ocultos. Ative 'Incluir concluídos e descartados' para vê-los." — só mostra quando a tela está vazia.

## Não-objetivos
- Não trocar `TicketStatusSelect` por multi-select (fica para evolução futura, se necessário).
- Não tocar em RLS, RPC, `useTickets`, queries ou tipos.
- Não alterar comportamento do detalhe do ticket nem dos cards da Home.
- Não criar Saved Link novo automaticamente — o usuário pode salvar a URL com `?include_closed=true` ou sem, conforme uso.

## Validação
1. `/tickets` (default) lista apenas `waiting`, `paused`, `in_progress`. Concluídos e descartados sumiram.
2. Toggle ON → reaparecem; URL ganha `?include_closed=true`; refresh preserva.
3. Selecionar status específico "Concluído" no select → mostra concluídos independentemente do toggle.
4. Saved Links: salvar a URL atual e reabrir reproduz o estado.
5. Deep-links da Home (`?overdue=true`, `?due_today=true`) continuam funcionando e sem concluídos por padrão.
6. Como super_admin (ticket de outra pessoa) — comportamento de listagem inalterado, apenas o conjunto exibido muda.

## Arquivos
- **Editar**: `src/modules/tickets/pages/TicketsListPage.tsx`, `src/modules/tickets/components/TicketFilters.tsx`
- **Sem migration, sem mudanças em hooks/tipos/RLS.**
