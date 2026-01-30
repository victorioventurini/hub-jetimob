
# Plano de Correção: Sincronização de Sessão Auth no BU-Scoped Client

## 1. Diagnóstico Confirmado

### 1.1 Evidências dos Logs do Usuário
```json
{
  "writerProfileId": "f375b494-5edf-463e-97c1-c39206692759",
  "profileId": "f375b494-5edf-463e-97c1-c39206692759",
  "realProfileId": "f375b494-5edf-463e-97c1-c39206692759",
  "buId": "a0000000-0000-0000-0000-000000000001"
}
```

- Frontend está CORRETO: `profileId`, `buId`, e `created_by_user_id` estão todos válidos
- Usuário tem memberships válidas no banco de dados
- Funções SQL funcionam corretamente quando testadas diretamente

### 1.2 A RLS Policy
```sql
tickets_insert_policy:
  user_has_bu_access(auth.uid(), bu_id) 
  AND created_by_user_id = my_profile_id()
```

A policy requer que `auth.uid()` retorne o user_id correto. Se `auth.uid()` for NULL, `my_profile_id()` retorna NULL, e a condição `created_by_user_id = NULL` sempre falha.

### 1.3 Causa Raiz
O `buScopedClient.ts` cria um cliente Supabase separado com seu próprio GoTrueClient. Mesmo usando o mesmo localStorage para persistência, o estado de sessão em memória pode estar dessincronizado:

1. O singleton é criado com `void created.auth.getSession()` (fire-and-forget)
2. O custom fetch (`createBuAwareFetch`) tenta injetar JWT do localStorage
3. **BUG**: A lógica só injeta JWT se `currentAuth` for nulo ou `anon`, mas ignora tokens `authenticated` potencialmente inválidos/expirados que o SDK interno pode enviar

---

## 2. Solução Proposta

### 2.1 Modificação do Custom Fetch (buScopedClient.ts)

**Problema atual** (linha 124):
```typescript
const shouldInjectUserJwt = !currentAuth || currentRole === "anon" || currentRole === null;
```

Isso NÃO cobre o caso onde o SDK envia um token `authenticated` mas que está dessincronizado.

**Solução**: Sempre priorizar o token do localStorage, verificando também expiração:

```typescript
function createBuAwareFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers((init?.headers as HeadersInit) ?? undefined);
    
    // Inject BU header for current request (read from globalThis)
    const buId = getCurrentBuId();
    if (buId && !headers.has("x-current-bu-id")) {
      headers.set("x-current-bu-id", buId);
    }

    // SEMPRE injetar o JWT mais recente do localStorage para requisições de dados
    // Isso garante que não usamos um token stale do GoTrueClient interno
    const storedToken = readAccessTokenFromStorage();
    if (storedToken) {
      const storedRole = getJwtRole(storedToken);
      const isValidToken = storedRole === "authenticated" && !isTokenExpired(storedToken);
      
      if (isValidToken) {
        // Sempre usar o token do localStorage (source of truth)
        headers.set("Authorization", `Bearer ${storedToken}`);
      }
    }

    return fetch(input, { ...init, headers });
  };
}

// Nova função helper para verificar expiração
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  // Considerar expirado 30 segundos antes para margem de segurança
  return Date.now() >= (payload.exp - 30) * 1000;
}
```

### 2.2 Sincronização de Sessão no Singleton

Modificar `getBuScopedClient` para esperar a hidratação (opcional, pode ser implementado depois se necessário):

```typescript
// Opcional: versão async para casos críticos
export async function getBuScopedClientAsync(buId: string): Promise<SupabaseClient<Database>> {
  setCurrentBuId(buId);
  
  const existing = getBuSingleton();
  if (existing) {
    // Garantir que a sessão está sincronizada
    await existing.auth.getSession();
    return existing;
  }

  const created = createClient<Database>(...);
  
  // Esperar hidratação ao invés de fire-and-forget
  await created.auth.getSession();
  
  setBuSingleton(created);
  return created;
}
```

### 2.3 Logs de Diagnóstico Temporários (Já Implementados)

Os logs `[DEBUG_RLS]` já estão no código. Adicionar log do JWT role sendo usado:

```typescript
// No custom fetch, antes de retornar:
if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
  const finalToken = headers.get("Authorization")?.slice(7);
  if (finalToken) {
    console.debug("[BuScopedClient] Request with JWT role:", getJwtRole(finalToken));
  }
}
```

---

## 3. Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/integrations/supabase/buScopedClient.ts` | Refatorar `createBuAwareFetch()` para sempre usar JWT do localStorage |

---

## 4. Detalhes Técnicos da Implementação

### 4.1 Arquivo: `src/integrations/supabase/buScopedClient.ts`

**Adicionar função helper para verificar expiração de token:**
```typescript
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return Date.now() >= (payload.exp - 30) * 1000;
}
```

**Refatorar `createBuAwareFetch()` (linhas 108-132):**

A nova lógica:
1. Sempre ler o token do localStorage
2. Verificar se é `authenticated` e não expirado
3. Se válido, SEMPRE sobrescrever o header Authorization
4. Se não houver token válido, deixar o SDK usar o seu (ou nenhum)

Esta abordagem garante que o JWT mais recente do localStorage é sempre usado, eliminando race conditions com o GoTrueClient interno.

---

## 5. Validação Pós-Implementação

1. Publicar as mudanças
2. Usuário victorio@jetimob.com testa criação de ticket em hub.jetimob.com
3. Verificar se logs mostram `JWT role: authenticated`
4. Confirmar que ticket é criado com sucesso

---

## 6. Risco

| Aspecto | Avaliação |
|---------|-----------|
| Breaking Changes | Nenhum - mudança é transparente |
| Performance | Negligível - apenas decode de JWT |
| Segurança | Melhora - garante uso do token mais recente |
| Rollback | Fácil - reverter para lógica anterior |

---

## 7. Alinhamento com Documentação

- **TCR v2.75.0 §1.5**: Mantém padrão singleton do `buScopedClient`
- **IDENTITY_CONVENTION.md v2.1.1**: Não afeta - correção é na camada de transporte
- **BU_SCOPED_SUPABASE_RULES.md v4.0.0**: Mantém compatibilidade total
