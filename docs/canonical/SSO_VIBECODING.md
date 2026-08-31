# SSO VibeCoding — Next como Provedor de Identidade

Status: canônico · Última atualização: 2026-08

## 1. Modelo

O Next (`next.jetimob.com` / `hub.jetimob.com`) é o **provedor de identidade** dos
sistemas VibeCoding. Todos os sistemas irmãos (satélites) usam:

- o **mesmo backend de autenticação** (mesmo projeto de auth do Next);
- a **mesma sessão**, persistida em cookie no domínio raiz `.jetimob.com`.

**Autenticação é central. Autorização é local.** Cada satélite decide o que o
usuário pode fazer lá dentro; o Next só responde "quem é esse usuário".

```text
  usuário  ──▶ comercial.jetimob.com (satélite)
                 │  sem sessão?
                 ▼
            next.jetimob.com/auth?next=https://comercial.jetimob.com/...
                 │  magic link
                 ▼
            next.jetimob.com/auth/callback?next=<url absoluta>
                 │  cookie de sessão em .jetimob.com
                 ▼
            volta para comercial.jetimob.com  ──▶ sessão já hidratada
```

## 2. O que foi implementado no Next

| Peça | Arquivo | Papel |
|------|---------|-------|
| Storage compartilhado | `src/integrations/supabase/sharedSessionStorage.ts` | Grava a sessão em cookies chunked em `.jetimob.com`; fallback para `localStorage` fora do domínio (preview/localhost) |
| Cliente global | `src/integrations/supabase/globalClient.ts` | Usa `sharedSessionStorage()` |
| Cliente BU-scoped | `src/integrations/supabase/buScopedClient.ts` | Lê o token via `readSharedSessionRaw()` |
| Redirecionamento | `src/lib/authRedirect.ts` | `resolveAuthTarget()` — aceita URL absoluta só em HTTPS `*.jetimob.com` |
| Login | `src/pages/Auth.tsx` | Aceita `?next=<url absoluta>` e volta para o satélite após login |
| Callback | `src/pages/AuthCallback.tsx` / `AuthConfirm.tsx` | Redireciona para satélite (`window.location.replace`) ou rota interna |
| Magic link | `supabase/functions/request-magic-link/index.ts` | Preserva `next` absoluto autorizado no link do e-mail |
| Identidade | `supabase/functions/identity-me/index.ts` | `GET` com `Authorization: Bearer <access_token>` → identidade do usuário |

### Anti open-redirect

Só é aceito como destino externo: `https://jetimob.com` e `https://*.jetimob.com`.
Qualquer outro valor cai para caminho interno normalizado (`/`).

## 3. Cookie da sessão

- Domínio: `.jetimob.com`
- Nome: mesma storage key do GoTrue (`sb-<ref>-auth-token`), fatiada em `.0`, `.1`, ...
- Flags: `Secure`, `SameSite=Lax`, `Path=/`, 30 dias
- Fora de `*.jetimob.com` (preview Lovable, localhost) o adapter usa `localStorage`,
  então **SSO só vale em produção**.

## 4. Integração de um satélite (checklist)

1. O satélite deve apontar para o **mesmo backend de auth** do Next
   (mesma URL e mesma publishable key).
2. Criar o client do Supabase usando o mesmo `sharedSessionStorage.ts`
   (copiar o arquivo — ele não tem dependências do Next).
3. Guard de rota: se `supabase.auth.getSession()` não retornar sessão, redirecionar para
   `https://next.jetimob.com/auth?next=<URL absoluta atual, encodeURIComponent>`.
4. Opcional (backend do satélite / validação server-side): chamar
   `GET <SUPABASE_URL>/functions/v1/identity-me` com o access_token do usuário
   para obter `user_id`, `profile_id`, `email`, `display_name`, `photo_url`, `status`.
5. Logout: `supabase.auth.signOut()` no satélite encerra a sessão em **todos** os
   sistemas (cookie compartilhado). Se o logout deve ser local, não use signOut.
6. Autorização (papéis, permissões, BUs) fica no satélite — `identity-me`
   deliberadamente não expõe isso.

### Snippet de guard (satélite)

```ts
const CENTRAL_AUTH = "https://next.jetimob.com/auth";

export async function requireSharedSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  const next = encodeURIComponent(window.location.href);
  window.location.replace(`${CENTRAL_AUTH}?next=${next}`);
  return null;
}
```

## 5. Limitações conhecidas

- Ambientes de preview (`*.lovable.app`) não compartilham cookie: cada um mantém
  sua própria sessão em `localStorage`.
- Domínios diferentes de `jetimob.com` exigiriam troca de token via redirect
  (não implementado).
- Cookies chunked têm limite prático (~12 fatias); sessões maiores são rejeitadas
  pelo adapter, que registra aviso no console.
