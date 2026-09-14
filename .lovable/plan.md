# Prompt de integração SSO para o projeto satélite (comercial.jetimob.com)

O texto abaixo é para copiar e colar no chat do outro projeto Lovable. Ele faz o
satélite usar a autenticação central do Next, sem tela de login própria.

Ponto importante: o satélite precisa usar **o mesmo backend de autenticação do
Next**. Se o outro projeto já tem um backend próprio (Lovable Cloud) com dados,
ele continua com o banco dele, mas o cliente de autenticação passa a apontar
para o backend do Next (URL + chave publicável abaixo, ambas públicas).

---

## Prompt (copiar daqui para baixo)

Implemente autenticação centralizada (SSO) neste projeto usando o Hub da Jetimob
(`next.jetimob.com`) como provedor de identidade. Este projeto NÃO deve ter tela
de login, cadastro, senha ou magic link próprios.

### 1. Cliente de identidade

Crie `src/integrations/identity/identityClient.ts` com um cliente Supabase
apontando para o backend de autenticação do Next:

- URL: `https://oiwnghihyqdsinouwmga.supabase.co`
- Publishable key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pd25naGloeXFkc2lub3V3bWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjM3NjksImV4cCI6MjA4MjczOTc2OX0.uFb5CcntcCDUATdeWbUyAdZw4xtd8SEb3_Fp0KFMxtg`

Opções: `auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storage: sharedSessionStorage() }`.

### 2. Storage de sessão compartilhado

Crie `src/integrations/identity/sharedSessionStorage.ts` exatamente com este
conteúdo (grava a sessão em cookies no domínio raiz `.jetimob.com`, fatiados em
chunks; fora de `*.jetimob.com` cai para `localStorage`, então o SSO real só vale
em produção):

```ts
const SHARED_COOKIE_DOMAIN = ".jetimob.com";
const CHUNK_SIZE = 3500;
const MAX_CHUNKS = 12;
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function hasDom(): boolean {
  return typeof document !== "undefined" && typeof window !== "undefined";
}

export function getSharedCookieDomain(): string | null {
  if (!hasDom()) return null;
  const host = window.location.hostname;
  if (host === "jetimob.com" || host.endsWith(".jetimob.com")) return SHARED_COOKIE_DOMAIN;
  return null;
}

export function isSharedSessionEnabled(): boolean {
  return getSharedCookieDomain() !== null;
}

function readCookieMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (!hasDom()) return map;
  for (const part of document.cookie.split(";")) {
    const raw = part.trim();
    if (!raw) continue;
    const eq = raw.indexOf("=");
    if (eq <= 0) continue;
    map.set(raw.slice(0, eq), raw.slice(eq + 1));
  }
  return map;
}

function writeCookie(name: string, value: string, domain: string) {
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Domain=${domain}`,
    `Max-Age=${MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    window.location.protocol === "https:" ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

function deleteCookie(name: string, domain: string) {
  document.cookie = `${name}=; Path=/; Domain=${domain}; Max-Age=0; SameSite=Lax`;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readChunked(key: string): string | null {
  const cookies = readCookieMap();
  const single = cookies.get(key);
  if (single !== undefined) {
    try { return decodeURIComponent(single); } catch { return single; }
  }
  const parts: string[] = [];
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const chunk = cookies.get(`${key}.${i}`);
    if (chunk === undefined) break;
    try { parts.push(decodeURIComponent(chunk)); } catch { parts.push(chunk); }
  }
  return parts.length ? parts.join("") : null;
}

function writeChunked(key: string, value: string, domain: string) {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE));
  deleteCookie(key, domain);
  chunks.forEach((chunk, index) => writeCookie(`${key}.${index}`, chunk, domain));
  for (let i = chunks.length; i < MAX_CHUNKS; i++) deleteCookie(`${key}.${i}`, domain);
}

function clearChunked(key: string, domain: string) {
  deleteCookie(key, domain);
  for (let i = 0; i < MAX_CHUNKS; i++) deleteCookie(`${key}.${i}`, domain);
}

function safeLocalGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeLocalRemove(key: string) {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

export function readSharedSessionRaw(key: string): string | null {
  const domain = getSharedCookieDomain();
  if (!domain) return safeLocalGet(key);
  return readChunked(key) ?? safeLocalGet(key);
}

export function sharedSessionStorage(): Storage {
  const adapter = {
    getItem(key: string): string | null {
      const domain = getSharedCookieDomain();
      if (!domain) return safeLocalGet(key);
      const fromCookie = readChunked(key);
      if (fromCookie !== null) return fromCookie;
      const legacy = safeLocalGet(key);
      if (legacy) { writeChunked(key, legacy, domain); safeLocalRemove(key); return legacy; }
      return null;
    },
    setItem(key: string, value: string): void {
      const domain = getSharedCookieDomain();
      if (!domain) { try { localStorage.setItem(key, value); } catch { /* noop */ } return; }
      writeChunked(key, value, domain);
      safeLocalRemove(key);
    },
    removeItem(key: string): void {
      const domain = getSharedCookieDomain();
      safeLocalRemove(key);
      if (domain) clearChunked(key, domain);
    },
  };
  return adapter as unknown as Storage;
}
```

Regra: qualquer outro cliente Supabase deste projeto que precise do token do
usuário deve lê-lo com `readSharedSessionRaw()` — nunca `localStorage.getItem`
direto.

### 3. Guard de rota

Crie um guard que envolve todas as rotas privadas:

- Ao montar, chama `identity.auth.getSession()` e registra
  `identity.auth.onAuthStateChange`.
- Sem sessão → `window.location.replace("https://next.jetimob.com/auth?next=" + encodeURIComponent(window.location.href))`.
- Enquanto verifica, mostra estado de carregamento (não pisque a tela de conteúdo).
- Não crie rota `/auth` local. Se existir, redirecione para o Next.

### 4. Identidade do usuário

Crie um hook `useIdentity()` que, com sessão válida, busca a identidade central:

```
GET https://oiwnghihyqdsinouwmga.supabase.co/functions/v1/identity-me
Authorization: Bearer <access_token>
```

Retorna `user_id`, `profile_id`, `email`, `display_name`, `first_name`,
`last_name`, `photo_url`, `status`. Se `status === "inactive"`, bloqueie o acesso
com mensagem "Acesso desativado. Fale com o administrador."

Esse endpoint NÃO retorna papéis, permissões nem BUs — autorização é local
deste projeto. Vincule o usuário local por `user_id` (UUID do auth), nunca por
e-mail.

### 5. Logout

Botão "Sair" chama `identity.auth.signOut()`. Isso encerra a sessão em todos os
sistemas `*.jetimob.com` (cookie compartilhado). Depois redirecione para
`https://next.jetimob.com/auth`.

### 6. Restrições

- Não implementar senha, cadastro, OAuth nem magic link neste projeto.
- Não escrever em nenhuma tabela do backend do Next.
- Em preview (`*.lovable.app`) e localhost o cookie não é compartilhado: a
  sessão fica local e o SSO só funciona de verdade em `comercial.jetimob.com`.
  Para testar no preview, permita login manual via magic link do Next em uma aba
  do domínio real e valide o SSO só em produção.
- O domínio `comercial.jetimob.com` precisa estar configurado no projeto e nas
  URLs de redirect permitidas do backend de autenticação.

## Pendência do lado do Next (eu faço aqui, se você aprovar)

Liberar `https://comercial.jetimob.com/*` na lista de redirect URLs do backend de
autenticação, para que o magic link possa devolver o usuário ao satélite.
