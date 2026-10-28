# Ferrigolo Advogados em Soul e Victorio Venturini

## O que já está pronto
- A empresa Ferrigolo já está ativa nas 3 unidades (Jetimob, Soul e Victorio Venturini).
- Ela já atende "Jurídico / todas as subcategorias" nas 3 unidades.
- 9 dos 11 usuários externos já estão nas 3 unidades.

## O que falta
1. Incluir **caroline@** e **julialazarotto@** nas unidades Soul e Victorio Venturini. Hoje elas estão só na Jetimob.
2. Criar a subcategoria **"Notificações ou citações pelo DJE"** em Jurídico na Soul e na Victorio Venturini. Ela existe só na Jetimob. A mensagem inicial padrão será copiada da Jetimob.
3. Liberar o acesso das duas usuárias às novas unidades, com o mesmo perfil externo que elas têm na Jetimob.

## Verificação
- Conferir que os 11 usuários aparecem na página do parceiro nas 3 unidades.
- Conferir que as subcategorias de Jurídico são iguais nas 3 unidades.

## Detalhes técnicos
- Inserir linhas em `partner_contact_bu_associations` para os 2 contatos e as 2 BUs, e o membership externo em `bu_user_memberships`.
- Inserir `ticket_subcategories` nas categorias Jurídico das BUs `2eeeb494…` e `f3d2d8a5…`. O mapeamento por categoria inteira (`subcategory_id` nulo) já cobre a nova subcategoria.
- Só alterações de dados, sem mudar o código.
