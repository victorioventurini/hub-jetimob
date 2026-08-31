# Visão da empresa para contatos externos (gestor)

## Situação atual (verificado)

- A visibilidade de tickets é decidida por `can_view_ticket`, usada na política de leitura de `tickets`.
- Para usuário externo, existe apenas um caminho: ser **participante ativo** do ticket (`ticket_participants.partner_contact_id`). Não há nenhuma regra por empresa parceira.
- Ferrigolo Advogados Associados tem 16 contatos e 46 tickets ligados à empresa; a Bianca é participante de 45 deles.

## O que será feito

Criar um marcador de "gestor da conta" no contato externo. Contato marcado passa a ver **todos os tickets da empresa parceira dele**, dentro da BU ativa. Contato não marcado continua exatamente como hoje (só onde é participante).

1. Novo campo no contato externo: "Pode ver todos os tickets da empresa" (padrão desligado).
2. Regra de acesso: contato marcado, ativo e associado à BU do ticket vê o ticket quando o ticket é da empresa dele — seja pela empresa vinculada ao ticket, seja porque algum contato da mesma empresa participa do ticket.
3. Ativar o marcador para a Bianca (`bianca@ferrigoloadvogados.com.br`).
4. Interface: switch no cadastro/edição do contato parceiro, com selo indicando "vê todos os tickets da empresa" na lista de contatos.

## Detalhes técnicos

- Migração: `partner_contacts.can_view_company_tickets boolean not null default false`.
- `public.can_view_ticket`: novo CHECK após o de participante externo — resolve o `partner_contact` do `auth.uid()` (ou do `p_profile_id`) com `can_view_company_tickets = true`, `status='active'`, associação ativa em `pcba` para a BU do ticket, e retorna true se
  `tickets.external_company_id = pc.external_company_id`
  OU existe `ticket_participants` ativo com contato da mesma `external_company_id`.
  O guard de BU ativa no topo da função continua valendo.
- Nada muda nas queries do frontend: `useTickets`/detalhe leem via RLS, e mensagens/anexos/participantes já derivam de `can_view_ticket`.
- Dado: `update partner_contacts set can_view_company_tickets = true` para o contato da Bianca.
- UI: `PartnerContactDialog/ContactFormStep.tsx` (switch) e `PartnerContactsTab.tsx` (badge); tipo em `src/modules/tickets/types.ts`.

## Fora de escopo

- Não altera criação/edição de tickets nem permissões de escrita — só leitura.
- Não muda visibilidade de usuários internos.
