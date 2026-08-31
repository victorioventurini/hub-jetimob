---
name: SSO VibeCoding — sessão compartilhada em .jetimob.com
description: Next é provedor de identidade dos satélites; sessão em cookie no domínio raiz, redirect allowlist *.jetimob.com, endpoint identity-me
type: feature
---

# SSO VibeCoding

**Modelo:** autenticação centralizada no Next, autorização local em cada app.

## Regras

1. Sessão do GoTrue vai para **cookie chunked em `.jetimob.com`** via
   `src/integrations/supabase/sharedSessionStorage.ts`. Fora de `*.jetimob.com`
   (preview/localhost) cai para `localStorage` → SSO só vale em produção.
2. `globalClient.ts` usa `sharedSessionStorage()`. `buScopedClient.ts` lê o token
   com `readSharedSessionRaw()` — **nunca** `localStorage.getItem` direto.
3. Destino pós-login: `resolveAuthTarget()` em `src/lib/authRedirect.ts`.
   Allowlist de redirect externo: **somente HTTPS em `jetimob.com` e subdomínios**.
   Qualquer outro valor vira caminho interno. Não relaxar (open redirect).
4. `/auth?next=<url absoluta>` é o ponto de entrada dos satélites.
   `AuthCallback`/`AuthConfirm` usam `window.location.replace` para destino externo.
5. `request-magic-link` preserva `next` absoluto autorizado (`resolveNextValue`) —
   o link do e-mail precisa voltar para o satélite.
6. Edge function `identity-me` (verify_jwt=false, valida Bearer em código) retorna
   só identidade: `user_id`, `profile_id`, `email`, `display_name`, `first_name`,
   `last_name`, `photo_url`, `status`. **Nunca** expor BUs, papéis ou permissões ali.
7. CORS de `identity-me` restrito a origens `https://*.jetimob.com`.

Doc completo (inclui checklist e snippet de integração do satélite):
`docs/canonical/SSO_VIBECODING.md`.
