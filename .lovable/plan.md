## Diagnóstico do bug

Você está na BU **Jetimob** mas vê o ticket "Carro para PCD" (categoria Jurídico → Civil, criado por Victorio Venturini) — que pertence à BU **Victorio Venturini**. Isso é uma violação de isolamento de BU.

### Causa raiz (3 camadas falham simultaneamente)

1. **RLS permissivo** — A função `can_view_ticket` (usada por `tickets_select_policy`) retorna `true` se você é creator/owner do ticket E membro da BU do ticket. Como você é membro de ambas as BUs e foi creator/owner do ticket original, o backend libera a leitura **mesmo com a BU ativa diferente**. Não há check `current_bu_id() = ticket.bu_id`.

2. **Hook `useTicket` sem filtro de BU** — `src/modules/tickets/hooks/useTicketQueries.ts` (linhas 175-180) faz `select(...).eq("id", ticketId)` sem `.eq("bu_id", buId)`. Depende exclusivamente do RLS.

3. **Query key sem `buId`** — `queryKeys.tickets.detail(ticketId) = ['ticket', ticketId]` não inclui a BU. Ao trocar de BU, o React Query reaproveita o cache do ticket carregado na BU anterior.

### Como o cenário acontece
- Você abriu o ticket enquanto estava em "Victorio Venturini" → o ticket foi cacheado.
- Trocou para "Jetimob" → cache reaproveitado E, mesmo se refetch, RLS libera.
- Resultado: tela do shell Jetimob renderiza dados de ticket da outra BU.

## Plano de correção

### 1. Backend — Endurecer RLS de tickets

Atualizar `can_view_ticket(p_ticket_id, p_profile_id)` para exigir que o ticket pertença à BU ativa do header `x-current-bu-id`:

```text
v_current_bu := current_bu_id();  -- já existe como helper
IF v_current_bu IS NULL OR v_current_bu <> v_ticket.bu_id THEN
  RETURN false;
END IF;
```

Inserir esse check **logo após** carregar `v_ticket`, **antes** dos checks 1-5. Isso garante isolamento absoluto: mesmo se o usuário é creator, owner ou participante, ele só vê o ticket quando está logado na BU correta.

Exceção controlada: platform admins (via `is_platform_admin(auth.uid())`) podem bypassar — mantém capacidade de suporte cross-BU. Se a função `current_bu_id()` retornar NULL (ex: jobs internos), bloqueia.

Aplicar a mesma proteção em:
- `ticket_messages` (policy `Users can view messages of tickets they can see`) — já delega via `can_view_ticket`, herdará automaticamente.
- `ticket_attachments` — idem.
- `ticket_participants` — idem.

### 2. Frontend — Filtrar `bu_id` em `useTicket`

Em `src/modules/tickets/hooks/useTicketQueries.ts` (`useTicket`):
- Adicionar `.eq("bu_id", buId)` no `select` do detail.
- Se o ticket retornar `null` (não pertence à BU ativa), navegar para `/tickets` com toast: "Este ticket pertence a outra BU. Selecione a BU correta para visualizá-lo."

### 3. Frontend — Incluir `buId` na query key

Em `src/lib/queryKeys/tickets.ts`:
```text
detail: (buId: string | null, ticketId: string | null) =>
  ['ticket', buId, ticketId] as const,
```
Atualizar todos os call-sites (`useTicket`, invalidações em `useTicketMutations`, `useTicketMessageMutations`, `useTransferTicket`, `usePinMessage`, `TicketsListPage`, `TicketDetailPage`).

### 4. Frontend — Invalidar cache no switch de BU

Adicionar limpeza explícita do cache de tickets em `BuContext.applyBuSwitch` (já remove `clearBuClientCache`; garantir que `queryClient.removeQueries({ queryKey: ['ticket'] })` e `['tickets']` também roda — verificar se já existe handler global de invalidação).

### 5. Guard de UX em `TicketDetailPage`

Após carregar `ticket`, comparar `ticket.bu_id !== currentBu?.id`:
- Se diferente, exibir `VicErrorState` com CTA "Trocar para a BU correta" ou voltar para `/tickets`.
- Não renderizar conteúdo do ticket nesse estado (defesa em profundidade contra dados em cache).

### 6. QA e validação

- Cenário A: Usuário multi-BU abre ticket via URL direta de outra BU → tela de erro + redirect.
- Cenário B: Trocar BU enquanto ticket aberto → redireciona automaticamente.
- Cenário C: Platform admin → mantém capacidade de visualização (RLS bypass).
- Adicionar entrada em `docs/qa/QA_BU_SCOPE.md` (Teste 8 — Tickets cross-BU).
- Migration nota: `current_bu_id()` retorna NULL fora de requests com header — qualquer trigger interno que precise ler ticket usará `SECURITY DEFINER` próprio.

## Arquivos afetados

- `supabase/migrations/<novo>.sql` — patch em `can_view_ticket`.
- `src/modules/tickets/hooks/useTicketQueries.ts` — filtro `bu_id` no detail.
- `src/lib/queryKeys/tickets.ts` — `detail` agora inclui `buId`.
- `src/modules/tickets/hooks/useTicketMutations.ts`, `useTicketMessageMutations.ts`, `useTransferTicket.ts`, `usePinMessage.ts` — invalidações com novo formato.
- `src/modules/tickets/pages/TicketDetailPage.tsx` — guard UX cross-BU.
- `docs/qa/QA_BU_SCOPE.md` — novo cenário documentado.
- `mem://standards/bu-isolation-master` — adicionar nota sobre detail pages exigirem `bu_id` no select E na query key.

## Conformidade com docs canônicos

- Respeita **Regra 1 (PRE-BU vs POST-BU)**: continua usando `useBuScopedSupabase`.
- Respeita **Regra 3 (BU-scoped)**: adiciona o filtro explícito que faltava.
- Respeita **Query Keys SSOT**: alteração centralizada em `src/lib/queryKeys/tickets.ts`.
- Alinha com `mem://standards/bu-isolation-master` e `mem://standards/bu-scoped-detail-query-keys`.
