# Usuários externos na página do parceiro

Hoje a página de um parceiro (Configurações > Parceiros > parceiro) mostra apenas dados da empresa, status na unidade atual e um atalho para categorias. Os contatos externos da empresa só podem ser gerenciados numa outra tela (configurações de tickets).

## O que será adicionado

Uma seção "Usuários externos" na própria página do parceiro, logo abaixo das informações da empresa:

- **Listar**: nome, e-mail, telefone (com link de WhatsApp/telefone), status (ativo/inativo) e um selo para quem pode ver todos os tickets da empresa. Busca por nome/e-mail/telefone, estado de carregamento e mensagem quando não houver ninguém cadastrado.
- **Cadastrar**: botão "Adicionar usuário", já com a empresa pré-selecionada. Usa o mesmo fluxo de cadastro existente (verificação de e-mail, reaproveitamento de contato já existente em outra unidade e envio de convite).
- **Importar**: botão para trazer contatos dessa mesma empresa já cadastrados em outras unidades de negócio.
- **Editar**: nome, e-mail, telefone, status e a permissão de ver todos os tickets da empresa.
- **Remover**: confirmação antes de remover; a remoção é lógica (o histórico de tickets é preservado).

Cada nome também leva ao perfil do contato, como já acontece na tela de tickets.

Os usuários listados são os vinculados à unidade de negócio ativa, seguindo o isolamento por unidade já usado no restante do sistema.

## Detalhes técnicos

- Novo componente `src/modules/partners/components/PartnerContactsSection.tsx`, renderizado em `PartnerDetailPage.tsx` com `partnerId` como `companyId` fixo.
- Reaproveita hooks existentes de `@/modules/tickets/hooks` (`usePartnerContacts(companyId)`, `useUpdatePartnerContact`, `useDeletePartnerContact`) e componentes `PartnerContactDialog`, `PartnerContactImportDialog`, `PartnerContactHoverCard` — sem duplicar lógica de mutação nem criar novas query keys.
- Filtro de busca em URL state via `useLocalSearch` (`contactSearch`), seguindo o padrão da aba atual.
- Sem alterações de banco: `partner_contacts`, `partner_contact_bu_associations`, RLS e query keys permanecem como estão.
- Nenhuma coluna extra em `select`; listagem já usa colunas explícitas.
