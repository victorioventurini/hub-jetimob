
# Fix: Relatório QBR gerado mas não exibido

## Diagnóstico confirmado

A edge function **funciona** — retornou HTTP 200 em 9.5s (confirmado via analytics). O problema está **100% no frontend**.

**Cadeia de falha:**

1. Edge function retorna `{ success: true, data: { quarterNarrative: "..." } }` → ✅ OK
2. Mutation recebe os dados corretamente → ✅ OK
3. Hook tenta `DELETE` de relatórios antigos em `okr_wizard_sessions` → ❌ **Não existe RLS policy de DELETE** → silently deletes nothing
4. Hook tenta `INSERT` do novo relatório → ❌ Pode falhar por RLS (validação de `started_by`) → o report **nunca é salvo no banco**
5. `onSuccess` executa `queryClient.invalidateQueries()` → re-fetch do banco → **banco vazio** → `report = null`
6. Página volta ao estado inicial ("Gerar relatório") → **Usuário vê "nada aconteceu"**

**Evidência**: `SELECT * FROM okr_wizard_sessions WHERE wizard_type = 'qbr-executive-report'` retorna **0 registros**.

## Correção

### 1. `src/modules/okrs/hooks/useQbrExecutiveReport.ts`

Duas mudanças:

**A) Usar `setQueryData` no `onSuccess`** para exibir o relatório imediatamente a partir dos dados retornados pela mutation, sem depender da persistência no banco:

```typescript
onSuccess: (data) => {
  // Exibir imediatamente — não depender de re-fetch do banco
  queryClient.setQueryData(queryKey, {
    report: data,
    generatedAt: new Date().toISOString(),
  });
  // Tentar invalidar para sincronizar com banco em background
  queryClient.invalidateQueries({ queryKey });
},
```

**B) Remover o `DELETE`** (sem RLS policy, nunca funciona) e manter apenas o INSERT. O query já faz `ORDER BY completed_at DESC LIMIT 1`, então múltiplos registros não são problema:

```typescript
// Remover estas linhas:
await supabase
  .from('okr_wizard_sessions')
  .delete()
  .eq(...)
```

### 2. Nenhuma mudança na edge function

A edge function está funcional — retorna 200 com dados válidos. Sem alterações.

## Resumo técnico

| Problema | Correção |
|---|---|
| `DELETE` sem RLS policy → falha silenciosa | Remover DELETE; manter INSERT (query pega o mais recente) |
| `invalidateQueries` re-fetch → banco vazio → report null | Usar `setQueryData` com o resultado da mutation |
| UI volta ao estado inicial | Dados exibidos imediatamente via mutation result |
