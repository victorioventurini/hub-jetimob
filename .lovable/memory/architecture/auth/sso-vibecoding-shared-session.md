---
name: SSO VibeCoding — isolamento de sessão
description: Sessão restrita à origem; cookies amplos proibidos para evitar headers excessivos nos sites irmãos
type: feature
---

# SSO VibeCoding

**Modelo:** autenticação centralizada no Next, autorização local em cada app.

## Regras

1. A sessão deve ficar restrita à origem atual, preferindo localStorage nesta SPA.
   Não gravar cookies de sessão em `.jetimob.com`: eles estouram os headers dos
   sites irmãos. O compartilhamento automático por cookie foi descontinuado.
2. Preservar o login existente quando possível ao migrar; expirar cookies amplos
   antigos (inclusive todos os chunks), sem apagar cookies host-only.
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
