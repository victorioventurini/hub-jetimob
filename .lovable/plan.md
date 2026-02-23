

# Correcao: Timeout do Navigator LockManager na Autenticacao

## Diagnostico Completo (pos-TCR)

O TCR v3.8.0 documenta a arquitetura singleton com dois clientes:
- **globalClient**: auth, bootstrap, pre-BU
- **buScopedClient**: dados operacionais pos-BU

Ambos criam um GoTrueClient com `persistSession: true`. O codigo-fonte do `@supabase/auth-js` (GoTrueClient.ts, linha 334) mostra que quando `persistSession && navigator.locks` esta disponivel, o GoTrueClient automaticamente usa `navigatorLock` para serializar operacoes de auth.

Como ambos clientes compartilham a mesma storage key (`sb-oiwnghihyqdsinouwmga-auth-token`), tentam adquirir o mesmo lock exclusivo `lock:sb-oiwnghihyqdsinouwmga-auth-token`. Quando um segura o lock (durante `getSession()`, `initialize()`, etc.), o outro espera e atinge o timeout de 10 segundos.

## Analise de Impacto

| Area | Impacto | Justificativa |
|------|---------|---------------|
| 133 arquivos com `useBuScopedSupabase` | Nenhum | Consomem o mesmo singleton; nenhum chama `auth.*` |
| Auth (login/logout) | Nenhum | Auth usa exclusivamente `globalClient` |
| Multi-tab | Nenhum | `buScopedClient` nao faz refresh proprio; token vem do `globalClient` via custom fetch |
| Token sync | Nenhum | `createBuAwareFetch()` le token do `globalClient.auth.getSession()` por request |
| BU switching | Nenhum | `clearBuClientCache()` destroi o singleton; proximo request recria |

## Evidencia no Codigo-Fonte

Do `@supabase/auth-js/src/GoTrueClient.ts`:

```text
linha 179: async function lockNoOp(name, acquireTimeout, fn) { return await fn() }
linha 326: this.lock = settings.lock || lockNoOp
linha 332-338: if (settings.lock) { this.lock = settings.lock }
             else if (this.persistSession && isBrowser() && navigator?.locks)
               { this.lock = navigatorLock }
             else { this.lock = lockNoOp }
```

A opcao `lock` em `GoTrueClientOptions` (linha 126) aceita `LockFunc`. Ao fornecer um no-op, impedimos que o `buScopedClient` tente adquirir o Navigator Lock.

## Alteracao

**Arquivo**: `src/integrations/supabase/buScopedClient.ts`

Na funcao `getBuScopedClient`, adicionar `lock` no-op nas opcoes de auth:

```typescript
const created = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    fetch: createBuAwareFetch(),
  },
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Disable Navigator Lock to prevent timeout conflict with globalClient.
    // Both clients share the same storage key. Only globalClient should hold the lock.
    // buScopedClient syncs auth tokens from globalClient via custom fetch.
    lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
      return await fn();
    },
  },
});
```

## Resultado Esperado

- Timeout de 10 segundos do LockManager eliminado
- Login via magic link funciona para todos os usuarios
- Sem regressao em nenhum dos 133 modulos que usam `useBuScopedSupabase`
- `globalClient` continua coordenando auth via Navigator Lock normalmente
