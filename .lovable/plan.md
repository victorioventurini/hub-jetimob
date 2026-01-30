
# Plano de Correção: Requisição de INSERT em Tickets Pendente Indefinidamente

## 1. Diagnóstico Confirmado

### 1.1 Evidências Coletadas

| Evidência | Valor | Significado |
|-----------|-------|-------------|
| Log `🎫 TICKETS REQUEST INTERCEPTED` | ✅ Aparece | Interceptor é alcançado |
| Log `🎫 About to call native fetch` | ✅ Aparece | Headers foram preparados |
| Log `🎫 Fetch response received` | ❌ Não aparece | Fetch nativo não completa |
| Log `🔐 Auth header decision` para tickets | ❌ Não aparece | **PROBLEMA: Lógica pula log de auth para tickets!** |
| Aba Network | "Pending" indefinidamente | Servidor não responde |
| PostgreSQL logs | `NO_BU_CONTEXT: User is not authenticated` | `auth.uid()` = NULL |

### 1.2 Causa Raiz

O código atual no interceptor de fetch (`buScopedClient.ts`) **pula propositalmente** o log de auth para requisições de tickets:

```typescript
// PROBLEMA: Isso IGNORA os tickets, não vemos se auth está correto!
if (!isTicketsRequest) {
  console.error("[BuScopedClient] 🔐 Auth header decision:", ...);
}
```

Isso significa que não temos visibilidade sobre se:
- O token foi encontrado no localStorage
- O token é válido (não expirado, tem `sub`, role != anon)
- O header `Authorization` foi efetivamente setado

O PostgreSQL está recebendo a requisição **sem autenticação válida**, causando o trigger `enforce_bu_scope` a lançar a exceção `NO_BU_CONTEXT: User is not authenticated`.

### 1.3 Por que o Fetch Trava?

Quando o trigger PostgreSQL lança uma exceção, PostgREST tenta retornar um erro HTTP. Porém, há evidências de que o erro não está sendo propagado corretamente pelo Supabase SDK, deixando a Promise pendente.

---

## 2. Solução em 3 Fases

### Fase 1: Diagnóstico Completo (Logs de Auth para Tickets)

**Arquivo:** `src/integrations/supabase/buScopedClient.ts`

Adicionar log de auth **TAMBÉM** para requisições de tickets, não apenas para outras requisições:

```typescript
// ANTES (bug):
if (!isTicketsRequest) {
  console.error("[BuScopedClient] 🔐 Auth header decision:", ...);
}

// DEPOIS (correção):
// Log para tickets COM MAIS DETALHES
if (isTicketsRequest) {
  console.error("[BuScopedClient] 🎫 TICKETS AUTH DEBUG:", JSON.stringify({
    hasStoredToken: !!storedToken,
    hasSub,
    storedRole,
    expired,
    shouldUseStored,
    usedStoredToken,
    finalAuthHeader: headers.has("Authorization"),
    apiKeyHeader: headers.has("apikey"),
    method: init?.method ?? "GET",
    timestamp: new Date().toISOString(),
  }));
} else {
  console.error("[BuScopedClient] 🔐 Auth header decision:", ...);
}
```

### Fase 2: Garantir Headers Críticos

O SDK do Supabase requer o header `apikey` em todas as requisições. Verificar que nosso interceptor não está perdendo este header:

```typescript
// Log para confirmar headers originais do SDK
if (isTicketsRequest) {
  const originalHeaders = new Headers((init?.headers as HeadersInit) ?? undefined);
  console.error("[BuScopedClient] 🎫 Original SDK headers:", JSON.stringify({
    hasApiKey: originalHeaders.has("apikey"),
    hasAuthorization: originalHeaders.has("Authorization"),
    contentType: originalHeaders.get("Content-Type"),
    prefer: originalHeaders.get("Prefer"),
  }));
}
```

### Fase 3: Timeout de Segurança + Tratamento de Erro

Implementar timeout de 30 segundos para evitar que requisições fiquem pendentes indefinidamente:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => {
  console.error("[BuScopedClient] 💀 FETCH TIMEOUT after 30s:", url.substring(0, 100));
  controller.abort();
}, 30000);

try {
  const response = await fetch(input, { ...init, headers, signal: controller.signal });
  clearTimeout(timeoutId);
  
  // Log adicional para diagnóstico
  if (isTicketsRequest) {
    console.error("[BuScopedClient] 🎫 Response received:", {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
    });
  }
  
  return response;
} catch (fetchError) {
  clearTimeout(timeoutId);
  console.error("[BuScopedClient] 💥 FETCH ERROR:", {
    name: (fetchError as Error)?.name,
    message: (fetchError as Error)?.message,
    isAbort: (fetchError as Error)?.name === "AbortError",
  });
  throw fetchError;
}
```

---

## 3. Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/integrations/supabase/buScopedClient.ts` | Adicionar log de auth para tickets + timeout + tratamento de erro |

---

## 4. Validação

Após implementar as mudanças, teste criação de ticket e verifique nos logs:

1. **`🎫 TICKETS AUTH DEBUG`** deve mostrar:
   - `hasStoredToken: true`
   - `usedStoredToken: true`
   - `finalAuthHeader: true`
   - `apiKeyHeader: true`

2. **Se algo estiver `false`**, esse é o problema

3. **Se tudo estiver `true` mas ainda travar**, o problema é no PostgreSQL (trigger/RLS)

---

## 5. Hipótese Alternativa

Se os logs mostrarem que todos os headers estão corretos, o problema pode ser:

| Hipótese | Diagnóstico | Solução |
|----------|-------------|---------|
| Trigger `enforce_bu_scope` causa deadlock | Verificar `pg_stat_activity` | Desabilitar trigger temporariamente |
| PostgREST não serializa erro | Verificar network tab para response body | Atualizar versão do Supabase |
| Token válido mas sessão expirada no servidor | Forçar refresh do token antes do insert | Adicionar `await supabase.auth.getSession()` |

---

## 6. Detalhes Técnicos da Implementação

### 6.1 Estrutura do Código Atualizado

```typescript
function createBuAwareFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : /* ... */;
    const isTicketsRequest = url.includes("/tickets");
    
    // 1. Log inicial para tickets
    if (isTicketsRequest) {
      console.error("[BuScopedClient] 🎫 TICKETS REQUEST:", {
        url: url.substring(0, 150),
        method: init?.method ?? "GET",
        hasBody: !!init?.body,
      });
    }
    
    const headers = new Headers((init?.headers as HeadersInit) ?? undefined);
    
    // 2. Inject BU header (existing logic)
    // ...
    
    // 3. Token handling (existing logic)
    const storedToken = readAccessTokenFromStorage();
    // ...
    
    // 4. LOG DE AUTH PARA TICKETS (NOVO!)
    if (isTicketsRequest) {
      console.error("[BuScopedClient] 🎫 TICKETS AUTH DEBUG:", JSON.stringify({
        hasStoredToken: !!storedToken,
        hasSub,
        storedRole,
        expired,
        usedStoredToken,
        finalAuthHeader: headers.has("Authorization"),
        finalBuHeader: headers.has("x-current-bu-id"),
        method: init?.method ?? "GET",
      }));
    }
    
    // 5. Fetch com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error("[BuScopedClient] 💀 TIMEOUT:", url.substring(0, 100));
      controller.abort();
    }, 30000);
    
    try {
      const response = await fetch(input, { ...init, headers, signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (isTicketsRequest) {
        console.error("[BuScopedClient] 🎫 Response:", response.status);
      }
      
      return response;
    } catch (e) {
      clearTimeout(timeoutId);
      console.error("[BuScopedClient] 💥 Error:", (e as Error)?.message);
      throw e;
    }
  };
}
```

---

## 7. Risco e Rollback

| Aspecto | Avaliação |
|---------|-----------|
| Breaking Changes | Nenhum - apenas logs adicionais e timeout de segurança |
| Performance | Negligível (logs + AbortController) |
| Rollback | Remover logs e timeout se necessário |

---

## 8. Compliance com Padrões do Hub

| Padrão | Status |
|--------|--------|
| PRE-BU vs POST-BU | ✅ Usa `useBuScopedSupabase()` para tickets (POST-BU) |
| IDENTITY_CONVENTION | ✅ Usa `realProfileId` para `created_by_user_id` |
| Client Singleton | ✅ Usa singleton com `detectSessionInUrl: false` |
| Campos Explícitos | ✅ `select("id, bu_id")` no insert |
