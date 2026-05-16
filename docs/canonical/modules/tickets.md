# Módulo Tickets — Canonical

**Slug:** `tickets` · **Status:** ✅ Ativo
**Master/SSOT:** `mem://features/tickets/cross-bu-isolation`
**Notificações cross-BU:** `mem://features/notifications/cross-bu-isolation`

## Tabelas

`tickets`, `ticket_messages`, `ticket_attachments`, `ticket_pinned_messages`, `ticket_transfers`. Schema: `types.ts`.

⚠️ **RLS Cross-BU:** filtragem RLS + filtro frontend `.eq('bu_id', currentBuId)` + query key contém `currentBuId` + UX guard. Sem isso → vazamento entre BUs.

## Páginas

`/tickets` (lista), `/tickets/:id` (detalhe com chat).

## Recursos

- **Pinned messages** (v1.0) — RLS v3
- **Transfer system** (v1.0) — entre owners/áreas
- **Attachments** — bucket privado `ticket-attachments`, signed URLs (RLS v3)
- **Routing** — atribuição por área/responsável
- **Parceiros** — partner_contacts globais (ver §Identity)

## Identity para externos

`can_view_ticket` suporta híbrido (interno + partner_contact). Ver `mem://auth/external-user-identity-unification-v3`, `mem://architecture/unified-participant-layer-standard-v1`.

## Permissões

`tickets.ticket.*`, `tickets.message.*`, `tickets.attachment.*`. Acesso por owner/area/admin + partner_contact ativo na BU.

## Notificações

Sino + `/me/notifications` respeitam BU ativa (`mem://features/notifications/cross-bu-isolation`).

## Referências

- Cross-BU: `mem://features/tickets/cross-bu-isolation`
- Participantes: `mem://architecture/unified-participant-layer-standard-v1`
- External user: `mem://auth/external-user-identity-unification-v3`
- Notificações: `mem://features/notifications/cross-bu-isolation`
