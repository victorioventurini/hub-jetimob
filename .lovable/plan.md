
# Plano: Eliminar Warning "Multiple GoTrueClient instances"

## Resumo Executivo
Modificar o arquivo `client.ts` auto-gerado para incluir `detectSessionInUrl: false`, alinhando-o com os singletons `globalClient.ts` e `buScopedClient.ts`. Isso elimina o conflito que causa o warning no console.

## Contexto Técnico
- **TCR v2.70.0**: Documenta padrão singleton com `detectSessionInUrl: false`
- **BU_SCOPED_SUPABASE_RULES.md v4.0.0**: Proíbe uso de `client.ts` para operações
- **Causa Raiz**: `client.ts` linha 11-16 não tem `detectSessionInUrl: false`

## Alterações Necessárias

### 1. Modificar `src/integrations/supabase/client.ts`
Adicionar `detectSessionInUrl: false` para eliminar conflito:

```typescript
// Antes:
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Depois:
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // CRITICAL: Prevent GoTrueClient conflicts
  }
});
```

### 2. Atualizar Documentação
- **docs/guides/SHARED_COMPONENTS_REGISTRY.md**: Corrigir exemplos que usam `client.ts` para `globalClient.ts`
- **operationalTables.ts**: Atualizar lista de exceções para referenciar `globalClient.ts`
- **Scripts de auditoria**: Atualizar referências

### 3. Atualizar TCR para v2.71.0
Documentar correção do warning de GoTrueClient.

## Risco
O arquivo `client.ts` é auto-gerado pelo Lovable Cloud. A edição pode ser sobrescrita em futuras atualizações. Porém, essa é a única solução viável sem alterações na infraestrutura do Lovable.

## Resultado Esperado
- ✅ Console limpo sem warnings de "Multiple GoTrueClient instances"
- ✅ Comportamento de auth inalterado
- ✅ Conformidade com TCR
