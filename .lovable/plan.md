# Corrigir erro ao gerar chave de API na BU

## Diagnóstico (confirmado)

O erro "Failed to send request to the edge function" não é permissão nem banco — é **bloqueio de CORS no preflight**.

- A tela chama a função `bu-api-keys` pelo cliente BU-scoped, que injeta o header `x-current-bu-id` em toda requisição.
- A resposta de preflight da função devolve apenas `access-control-allow-headers: authorization, x-client-info, apikey, content-type` (verificado agora via requisição OPTIONS real).
- Como `x-current-bu-id` não está na lista, o navegador aborta a chamada antes de enviar o POST. Isso explica os logs: a função "boota" e não registra nada — nenhum handler executa.
- Consistente com a tabela `bu_api_keys` estar vazia: nenhuma criação chegou ao banco. O usuário (victorio@jetimob.com) tem `role_in_bu = admin` na Jetimob, então autorização não é o problema.

## O que será feito

1. Incluir `x-current-bu-id` (e demais headers usados pelo cliente, como `x-client-version`) na lista de `Access-Control-Allow-Headers` da função `bu-api-keys`, tanto no preflight quanto nas respostas.
2. Aplicar a mesma correção na função `bu-api` (gateway público), que também aceita headers customizados (`x-api-key`) e sofre do mesmo problema quando chamada de um navegador.
3. Redeploy das duas funções.
4. Validação: novo preflight via OPTIONS conferindo os headers liberados, e criação real de uma chave na BU Jetimob para confirmar retorno 201 com a chave em texto puro (a chave de teste é revogada/removida em seguida).

## Notas técnicas

- Padronizar o bloco de CORS das duas funções com a lista completa: `authorization, x-client-info, apikey, content-type, x-current-bu-id, x-api-key, x-client-version`.
- Nenhuma mudança de schema, RLS ou frontend é necessária — a UI, os hooks e as políticas já estão corretos.
