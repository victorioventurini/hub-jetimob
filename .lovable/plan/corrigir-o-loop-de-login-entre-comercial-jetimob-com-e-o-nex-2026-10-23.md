# Corrigir o loop de login entre comercial.jetimob.com e o Next

## Diagnóstico (confirmado no código)

- **O Google Chat não é a causa.** A única coisa de Google Chat no Next é um botão "Abrir no Google Chat" no perfil do usuário, que só abre um link. Ele não interfere no login.
- **A causa é a correção do erro 520 no site institucional.** Antes, o Next guardava a sessão num cookie compartilhado com todo o `.jetimob.com`. O comercial lia esse cookie e já entrava logado. Como esse cookie estourava o site institucional, passamos a guardar a sessão só dentro do Next.
- **Resultado:** o comercial não encontra sessão e manda o usuário para `next.jetimob.com/auth?next=…/painel`. O Next vê que a pessoa já está logada e a devolve na hora para o comercial. O comercial continua sem sessão e manda de volta para o Next. O loop não termina.

## Correção: entrega de acesso de uso único (sem cookie compartilhado)

Em vez de compartilhar um cookie, o Next entrega ao comercial um **código de acesso de uso único**, válido por poucos minutos. Com ele, o comercial abre a **própria sessão**, independente da sessão do Next.

```text
comercial (sem sessão) -> next/auth?next=comercial/painel
next (usuário logado) -> pede um código de uso único ao backend
next -> comercial/auth/callback?token_hash=...&next=/painel
comercial -> troca o código por uma sessão própria -> /painel
```

1. **Nova função no backend: `sso-handoff`.**
   - Exige um usuário logado no Next e aplica a mesma regra de login: internos precisam ter entrado pelo Google.
   - Aceita apenas destinos HTTPS em `*.jetimob.com`.
   - Gera o código de uso único sem enviar nenhum e-mail e devolve o endereço de retorno.
   - Registra cada entrega nos logs.
2. **Tela de login do Next.** Quando o destino é outro sistema, o Next chama `sso-handoff` e redireciona para o endereço com o código. Hoje ele redireciona sem entregar nada.
3. **Proteção contra loop.** O Next conta os retornos para o mesmo destino. Se passar de 2 em 1 minuto, para e mostra a mensagem "Não foi possível abrir o sistema comercial", com botão para tentar de novo. A tela não fica mais piscando.
4. **Ajuste no projeto do comercial** (é outro projeto; vou entregar o prompt pronto para colar lá):
   - A página `/auth/callback` lê `token_hash` e `next` e troca o código por uma sessão.
   - Depois leva o usuário para o caminho interno indicado em `next`.
   - O comercial guarda a sessão só no próprio endereço e nunca grava cookie em `.jetimob.com`.
5. Atualizar `docs/canonical/SSO_VIBECODING.md` e o `AGENTS.md` com o novo modelo de entrega de acesso.

## Detalhes técnicos

- `supabase/functions/sso-handoff/index.ts`:
  - Valida o token do usuário com `getClaims` e aplica a regra de `amr` dos domínios internos (`_shared/internal-domains.ts`).
  - Valida `return_to` com a mesma regra de `isAllowedSsoUrl`.
  - Usa `auth.admin.generateLink({ type: 'magiclink' })` para obter o `hashed_token`, sem envio de e-mail.
  - Monta o endereço de retorno `origin/auth/callback?token_hash&type=magiclink&next=<path>`.
  - Responde de acordo com o padrão de erros das funções.
- `src/pages/Auth.tsx`: no ramo `targetKind === "external"`, chamar `sso-handoff` pelo `globalClient` em vez de `window.location.replace(targetValue)`. O contador anti-loop fica em `sessionStorage`.
- Sessões separadas evitam conflito de rotação do refresh token entre o Next e o comercial. O logout deixa de ser global: sair do Next não derruba o comercial.
- O cookie compartilhado não volta, para não reabrir o erro 520.
- Teste: um teste unitário cobre a validação de `return_to` (aceita `comercial.jetimob.com`, recusa `evil.com` e `http:`) e outro cobre o limite do contador anti-loop.

## Verificação

- Testar a função com um usuário logado: retorna o endereço com o código e recusa domínios de fora.
- Depois de publicar o Next e aplicar o prompt no comercial: abrir `comercial.jetimob.com` e chegar em `/painel` sem loop.
