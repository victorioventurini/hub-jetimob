# Reativar o agendador de tarefas (cron-dispatcher)

## Diagnóstico
- As 26 falhas seguidas (aprox. 13:12–13:38 UTC de 27/10) aconteceram durante a queda do servidor do Next, a mesma que derrubou o login com Google às 13:16.
- Nenhuma dessas chamadas chegou à função: não há registros dela nesse período. O erro foi do servidor fora do ar, não do código.
- O servidor já está funcionando de novo.

## Passos
1. **Victorio:** entrar em cron-job.org e reativar o job "Hub". Só o dono da conta pode fazer isso; eu não tenho acesso.
2. **Eu:** depois da reativação, conferir que as execuções voltaram a ser processadas e que as notificações em espera foram enviadas.
3. **Opcional (proteção):** no cron-job.org, ativar o aviso de falha sem desativação automática, ou subir o limite de falhas antes de desativar. Assim, uma queda curta do servidor não para o agendador.

## Fora do escopo
- Não é preciso mudar código. A função já trata erros passageiros. Desta vez a falha aconteceu antes da função rodar.
