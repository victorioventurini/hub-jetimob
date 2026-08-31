---
name: Visibilidade de tickets por empresa parceira (contato gestor)
description: Flag partner_contacts.can_view_company_tickets libera contato externo a ver todos os tickets da empresa parceira na BU ativa
type: feature
---
Contato externo, por padrão, só vê tickets em que é participante ativo (`ticket_participants.partner_contact_id`).

`partner_contacts.can_view_company_tickets = true` (switch em Editar Contato > Dados; badge "Vê tickets da empresa" na lista) libera, dentro de `public.can_view_ticket` (CHECK 4b), a visualização de **todos os tickets da empresa parceira** quando:
- contato ativo, não deletado, com `external_company_id`;
- associação ativa em `partner_contact_bu_associations` para a BU do ticket;
- `tickets.external_company_id = pc.external_company_id` OU existe participante ativo de contato da mesma empresa.

O guard de BU ativa no topo de `can_view_ticket` continua valendo. Mensagens/anexos/participantes herdam via `can_view_ticket`. Ativado para bianca@ferrigoloadvogados.com.br (Ferrigolo Advogados Associados).
