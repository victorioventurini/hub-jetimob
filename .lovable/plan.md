## Objetivo
Trocar o e-mail de login e de trabalho da usuária **Laura Marchezan Rodrigues** de `laura.ferrigoloadvogados@gmail.com` para `laura@ferrigoloadvogados.com.br`.

## Contexto verificado
- `auth.users.id` = `6fe87fd8-d8ae-4cb4-bc8a-e844494fa17a` — e-mail atual: `laura.ferrigoloadvogados@gmail.com`
- `profiles.id` = `16deddef-f433-47de-b311-8e1211a2e898`, `work_email` = `laura.ferrigoloadvogados@gmail.com`, `user_type` = `external` (obs: você mencionou "interno", mas no banco está como `external` — apenas trocaremos o e-mail, sem alterar o tipo).
- Nenhum outro registro usa `laura@ferrigoloadvogados.com.br` (sem conflito em `auth.users`, `profiles.email`, `profiles.work_email`).

## Mudanças
1. `auth.users`: atualizar `email` para `laura@ferrigoloadvogados.com.br`, marcar `email_confirmed_at = now()` e limpar `email_change*` para não disparar fluxo de confirmação.
2. `public.profiles`: atualizar `work_email` para `laura@ferrigoloadvogados.com.br` na linha da Laura.

## Fora de escopo
- Não alterar `user_type`, papéis, vínculos de BU, ou enviar e-mail de notificação.
- Se você quiser de fato convertê-la para usuária interna, peça em mensagem separada.

## Próximo passo
Após sua aprovação, executo as duas atualizações via SQL e confirmo o resultado consultando `auth.users` e `profiles`.