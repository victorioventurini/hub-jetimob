
## Objetivo

Enviar uma notificação de teste para `luana@ferrigoloadvogados.com.br` (profile `06efb1a2-6470-4fee-a05d-01179caf50e5`, BU Jetimob) usando a infraestrutura existente, sem mudança de código.

## Passos

1. Chamar a RPC `public.send_test_notification_v2` com:
   - `p_bu_id` = `a0000000-0000-0000-0000-000000000001` (Jetimob)
   - `p_target_profile_id` = `06efb1a2-6470-4fee-a05d-01179caf50e5`
   - `p_channels` = `['email','in_app']`
2. Invocar `process-notification-outbox` para forçar o envio imediato (não esperar o cron de 30s).
3. Verificar no `notification_outbox` se a linha gerada saiu com `status=sent` e `provider=sendgrid`.
4. Reportar:
   - ID do outbox criado
   - Status final (sent / failed) e erro, se houver
   - Próximos passos: pedir à Luana checar Caixa de Entrada + Spam/Lixeira, e (se nada chegar) verificar Activity Feed + Suppressions no SendGrid.

## Sem alteração de código

Tudo executa via RPC e Edge Function já existentes (`send_test_notification_v2`, `process-notification-outbox`). Nenhum arquivo será modificado.
