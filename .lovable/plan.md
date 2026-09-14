# Liberar comercial.jetimob.com e publicar o Hub

## O que verifiquei

A liberação de `comercial.jetimob.com` **já está feita no código do Hub**:

- A regra de retorno pós-login aceita qualquer endereço HTTPS em `jetimob.com`
  e seus subdomínios (`src/lib/authRedirect.ts`).
- O link enviado por e-mail preserva o endereço de volta autorizado
  (`supabase/functions/request-magic-link/index.ts`, mesma regra de domínio).
- O link do e-mail sempre aponta para o próprio Hub (`next.jetimob.com`) e só
  depois encaminha para o sistema de origem — por isso não é preciso cadastrar
  nenhum endereço extra na configuração de login do backend.

Ou seja: não há nada a acrescentar numa lista de endereços permitidos. O que
falta é apenas colocar a versão nova no ar.

## O que farei

1. Rodar a verificação de segurança do projeto e mostrar o resultado.
2. Publicar o app (o endereço real `next.jetimob.com` / `hub.jetimob.com`).
3. Confirmar que a página de login responde no endereço publicado.

## Observação combinada

O login compartilhado entre sistemas só funciona nos endereços reais
(`*.jetimob.com`). Na pré-visualização cada ambiente mantém sua própria sessão,
então o teste de ponta a ponta deve ser feito em `comercial.jetimob.com`.

## Nada de código muda

Este plano não altera nenhum arquivo do projeto — é verificação e publicação.
