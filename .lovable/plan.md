# Gestor externo define categorias da própria equipe

## Onde fica na UI

Um novo item **"Minha equipe"** dentro da área de Tickets, que aparece só para usuários externos com a opção "Vê tickets da empresa" ativada.

- Endereço: `/tickets/team` (link/aba no topo da tela de Tickets, ao lado da lista).
- Mostra os usuários externos da **mesma empresa parceira**, na BU ativa, incluindo quem ainda não tem categoria (com o selo "Sem categorias").
- Cada linha tem o botão **Configurar**, que abre o mesmo modal de categorias e subcategorias usado hoje em Configurações de Tickets > Capacidades.
- O gestor externo **não** vê as configurações internas (`/tickets/settings`), nem outras empresas, nem pode criar/remover usuários ou mudar a opção "Vê tickets da empresa".

Motivo: os externos já usam a área de Tickets; colocar ali evita abrir configurações internas para eles.

## Regras

- Só altera categorias de contatos da própria empresa e da BU ativa.
- Só pode escolher categorias e subcategorias que a empresa atende naquela BU.
- Usuários internos com a permissão atual continuam editando como hoje.
- Toda alteração fica registrada com quem fez.

## Detalhes técnicos

- Banco: função SECURITY DEFINER `can_manage_partner_contact_capabilities(p_contact_id, p_bu_id)` — verdadeiro se tiver `partners.contact.update:bu` **ou** se o perfil atual for contato ativo com `can_view_company_tickets = true` na mesma `partner_company_id` e BU. Atualizar as policies INSERT/UPDATE/DELETE de `partner_contact_capabilities` para usá-la; trigger validando que categoria/subcategoria pertencem às capacidades da empresa na BU.
- SELECT: estender para o gestor externo ler capacidades e contatos da própria empresa.
- Frontend: página `TeamCapabilitiesPage.tsx` no módulo tickets, rota em `tickets.routes.tsx`, reaproveitando `ContactCapabilityDialog.tsx`; hook com query keys em `src/lib/queryKeys/`, filtro por `currentBuId`, mutações com `realProfileId`.
- Testes: SQL de QA cobrindo gestor (permitido), externo comum (negado), outra empresa (negado), categoria fora da empresa (negado).
