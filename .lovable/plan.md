
# Plano de Correção: Header x-current-bu-id não reconhecido pelo PostgreSQL

## Resumo Executivo

O header `x-current-bu-id` está sendo corretamente injetado pelo JavaScript (confirmado via log no Console), mas o PostgreSQL está rejeitando a operação porque `auth.uid()` retorna NULL. Isso indica que o **token JWT não está sendo propagado corretamente** para o banco, não um problema com o header customizado.

---

## Diagnóstico Técnico Detalhado

### Evidências Coletadas

| Fonte | Resultado | Significado |
|-------|-----------|-------------|
| Console JS | `[BuScopedClient] Injecting x-current-bu-id: a0000000-...` | Interceptor funciona ✅ |
| `localStorage` | `hub_current_bu_id = "a0000000-..."` | BU armazenada corretamente ✅ |
| `globalThis.__hubJet_currentBuId` | `null` | Memória volátil não sincronizada ⚠️ |
| PostgreSQL logs | `NO_BU_CONTEXT: User is not authenticated` | `auth.uid() = NULL` no DB ❌ |
| RLS Policy | `user_has_bu_access(auth.uid(), bu_id)` | Falha porque auth.uid() é NULL |

### Fluxo do Problema

```text
1. Usuário clica "Criar Ticket"
2. useCreateTicket() chama useBuScopedSupabase()
3. useMemo() retorna cliente cacheado (possivelmente criado antes do auth hydrate)
4. Interceptor createBuAwareFetch() é chamado:
   - getCurrentBuId() → lê de localStorage (funciona) ✅
   - readAccessTokenFromStorage() → pode retornar token expirado ou inválido ⚠️
5. Request enviado ao PostgREST
6. PostgREST NÃO reconhece o JWT → auth.uid() = NULL
7. current_bu_id() lança "NO_BU_CONTEXT: User is not authenticated"
8. Trigger enforce_bu_scope falha
9. RLS policy tickets_insert_policy falha → Erro 42501
```

### Causa Raiz

O interceptor `createBuAwareFetch()` em `buScopedClient.ts` tenta injetar o JWT armazenado em localStorage, MAS:

1. O token pode estar expirado
2. O Supabase client singleton pode ter sido criado antes do auth token estar disponível
3. O auth state do singleton NÃO está sincronizado com o globalClient usado para login

---

## Solução Proposta

### Fase 1: Sincronizar Auth State entre Clientes (Crítico)

O problema fundamental é que temos dois singletons (`globalClient` e `buScopedClient`) que NÃO compartilham estado de auth. Quando o usuário faz login via `globalClient`, o `buScopedClient` não é atualizado.

**Correção:** Garantir que `buScopedClient` usa a mesma sessão que `globalClient`.

**Arquivo:** `src/integrations/supabase/buScopedClient.ts`

```typescript
// ANTES: Cada singleton tem seu próprio GoTrueClient
// DEPOIS: buScopedClient sincroniza auth com globalClient

import { supabase as globalClient } from './globalClient';

// Na função createBuAwareFetch(), usar o token do globalClient ao invés de localStorage:
async function createBuAwareFetch() {
  return async (input, init) => {
    const headers = new Headers(init?.headers ?? undefined);
    
    // Injetar BU header
    const buId = getCurrentBuId();
    if (buId && !headers.has("x-current-bu-id")) {
      headers.set("x-current-bu-id", buId);
    }

    // CORREÇÃO: Usar sessão do globalClient (fonte de verdade)
    const { data: { session } } = await globalClient.auth.getSession();
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }

    return fetch(input, { ...init, headers });
  };
}
```

### Fase 2: Invalidar Cache ao Trocar BU

Quando o usuário troca de BU, o cliente cacheado pode ter headers desatualizados.

**Arquivo:** `src/contexts/BuContext.tsx`

Garantir que `clearBuClientCache()` é chamado sempre que a BU muda.

### Fase 3: Validação Defensiva no Hook

**Arquivo:** `src/integrations/supabase/useBuScopedSupabase.ts`

Adicionar guard para verificar se há sessão ativa antes de retornar o cliente:

```typescript
export function useBuScopedSupabase(): SupabaseClient<Database> {
  const { currentBuId } = useBu();
  const { session, isLoading: authLoading } = useAuth();

  if (!currentBuId) {
    throw new Error('useBuScopedSupabase called before BU selection');
  }

  // Guard adicional: verificar se há sessão
  if (!session && !authLoading) {
    throw new Error('useBuScopedSupabase called without active session');
  }

  const client = useMemo(() => {
    return getBuScopedClient(currentBuId);
  }, [currentBuId]);

  return client;
}
```

---

## Arquivos a Modificar

| Arquivo | Mudança | Prioridade |
|---------|---------|------------|
| `src/integrations/supabase/buScopedClient.ts` | Sincronizar auth com globalClient | P0 (Crítico) |
| `src/integrations/supabase/useBuScopedSupabase.ts` | Guard para sessão ativa | P1 |
| `src/contexts/BuContext.tsx` | Chamar clearBuClientCache() ao trocar BU | P1 |

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Chamada async em interceptor fetch | Média | Usar `.then()` ao invés de `await` se necessário |
| Race condition no carregamento inicial | Baixa | Manter fallback para localStorage |
| Múltiplas instâncias GoTrueClient | Baixa | Usar apenas getSession(), não criar novo client |

---

## Checklist Pós-Implementação

- [ ] Testar criação de ticket (fluxo principal)
- [ ] Verificar Console: deve aparecer `[BuScopedClient] Injecting x-current-bu-id: ...` E sucesso na operação
- [ ] Verificar Network: request deve ter header `x-current-bu-id` E `Authorization: Bearer ...` válido
- [ ] Verificar PostgreSQL logs: NÃO deve aparecer `NO_BU_CONTEXT: User is not authenticated`
- [ ] Testar troca de BU e criar ticket na nova BU
- [ ] Atualizar TCR se houver mudança de padrão

---

## Documentação a Atualizar

Após implementação bem-sucedida:
- `docs/canonical/BU_SCOPED_SUPABASE_RULES.md` — Adicionar nota sobre sincronização de auth
- Memory `architecture/bu-scoped-client-interceptor-standard` — Atualizar com novo padrão
