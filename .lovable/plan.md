# Caroline (Ferrigolo) não vê os tickets em que é responsável

## O que foi verificado no banco
- O contato de parceiro da Caroline existe, está ativo, é da Ferrigolo e está ligado à unidade Jetimob.
- Ela é responsável por **11 tickets**. Mas **não aparece como participante** em nenhum deles.
- Quando ela entrou, o sistema criou o acesso dela como **colaboradora interna** (e não como externa), e esse acesso **não foi ligado ao cadastro de contato dela**. Ela também ganhou acesso de colaboradora em outra unidade.
- Resultado: a regra de visibilidade não a reconhece como a contato responsável, então os tickets ficam escondidos.
- As outras usuárias da Ferrigolo estão ligadas corretamente ao seu contato; só a Caroline está nessa situação.

## Correção
1. **Ajustar o cadastro da Caroline:** marcar como usuária externa, ligar o acesso ao contato dela e trocar o papel nas duas unidades para externo (seguindo a regra: todo @ferrigoloadvogados.com.br é externo).
2. **Visibilidade para o responsável:** a pessoa definida como contato responsável do ticket passa a vê-lo mesmo sem estar na lista de participantes (hoje só participantes veem). E incluir a Caroline como participante dos 11 tickets, para receber avisos.
3. **Evitar que se repita:** revisar por que o primeiro acesso dela criou um perfil interno em vez de externo e corrigir, para que todo contato de parceiro convidado entre já como externo e ligado ao seu cadastro.
4. **Conferir:** simular o acesso dela e confirmar que os 11 tickets aparecem na lista filtrada.

## Detalhes técnicos
- Dados: `profiles 6ce3566b…` → `user_type='external'`, `employment_status='external'`; `partner_contacts 15792ed3…` → `user_id`/`profile_user_id = 4fa579be…`; `bu_user_memberships.role_in_bu='external'` (BUs a000…001 e f3d2d8a5…).
- `can_view_ticket`: novo caminho para `tickets.assigned_contact_id` (e `external_assignee_contact_ids`) = contato do `auth.uid()` com associação ativa na BU do ticket; guard de BU ativa mantido.
- Backfill em `ticket_participants` (role assignee, partner_contact_id) para tickets com `assigned_contact_id` sem participante correspondente.
- Investigar `handle_new_user()` / `AuthCallback` para o caso de contato com `user_id` nulo no primeiro login (casamento por e-mail com `partner_contacts`).
