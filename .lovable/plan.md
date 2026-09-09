# Reativar o cron das notificações

## O que aconteceu

O serviço externo de agendamento desligou o job porque as chamadas vinham falhando. As falhas não vêm do código: os registros do disparador mostram erro "522 - Connection timed out" ao tentar falar com o banco, e agora as consultas ao banco também estão retornando "conexão indisponível". Ou seja, o banco do Hub está intermitente/fora do ar, e o disparador falha em cadeia.

Confirmado nesta sessão:
- Log do disparador: resposta HTML de timeout (522) em vez de dados.
- Consultas diretas ao banco: falham com pooler indisponível.
- Verificação geral de saúde: reporta "normal", o que confirma que o problema é de infraestrutura intermitente, não de configuração do app.

## Plano

1. Recuperar o banco
   - Reiniciar o backend do Hub (precisa da sua aprovação) e aguardar ficar saudável.
   - Confirmar com uma consulta simples antes de qualquer outra coisa.

2. Validar o disparador
   - Chamar o endpoint do cron com o segredo correto e confirmar resposta 200 com os blocos `outbox`, `health` e `maintenance`.
   - Conferir o histórico em `cron_execution_logs` e o backlog de `notification_outbox` (e-mails represados no período parado).

3. Drenar o que ficou parado
   - Rodar o processamento do outbox manualmente uma vez para enviar as notificações acumuladas.
   - Conferir se transições automáticas de ciclo e marcação de ritual perdido ficaram atrasadas e reexecutá-las.

4. Reativar o agendamento
   - Você reativa o job no cron-job.org (o serviço externo exige ação na conta deles).
   - Manter a mesma URL e o cabeçalho `x-cron-secret`.

5. Reduzir o risco de novo desligamento automático
   - Tornar o disparador tolerante a falhas transitórias: tentar novamente as chamadas ao banco e responder 200 com `success: false` e detalhe do erro quando a falha for temporária, em vez de 500. Assim uma instabilidade curta do banco não acumula falhas que desligam o job.
   - Manter o 500 apenas para erros reais de configuração (segredo ausente/integração desativada) e 401 para segredo inválido.
   - Registrar a causa da falha no log de execução para diagnóstico.

## Detalhes técnicos

- Arquivo: `supabase/functions/cron-dispatcher/index.ts`.
- Envolver `getCronSecret` e as RPCs em uma pequena política de retry (2 tentativas, backoff curto) e classificar erro de rede/timeout como transitório.
- No `catch` principal, distinguir transitório (HTTP 200 + `success:false` + `error_kind:"transient"`) de permanente (HTTP 500), preservando o registro em `cron_execution_logs`.
- Nenhuma mudança de schema é necessária.
