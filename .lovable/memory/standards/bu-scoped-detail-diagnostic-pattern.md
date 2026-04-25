---
name: BU-Scoped Detail Diagnostic Pattern
description: Padrão para páginas de detalhe BU-scoped — gate de currentBuId, guard §A.3 obrigatório, classificação via diagnóstico secundário, telemetria estruturada
type: standard
---

# BU-Scoped Detail Diagnostic Pattern

Páginas de detalhe que carregam uma entidade BU-scoped (objetivo, KR, ticket, ativo, projeto, etc.) DEVEM seguir este padrão para evitar falsos "não existe mais" causados por race de hidratação de BU.

## Regras

1. **Gate de query**: `enabled: isReady && !!supabase && !!entityId && !!currentBuId`. Sem `currentBuId`, NÃO disparar fetch — evita o cenário onde `useBu()` ainda não publicou o id mas o header já foi setado.

2. **Loading gate inclui `currentBuId`**:
   ```ts
   if (!isReady || !currentBuId || isLoading || !isFetched) return <Loading/>;
   ```

3. **Guard defensivo §A.3 obrigatório** (TCR regra inquebrável #1):
   ```ts
   if (data && currentBuId && data.bu_id !== currentBuId) {
     console.warn('[<PageName>] BU mismatch discard', {
       entityId, currentBuId, dataBuId: data.bu_id,
       headerBuId: getBuScopedClientCurrentBuId(),
     });
     return null;
   }
   ```
   **Nunca remover.** Telemetria estruturada classifica falsos positivos.

4. **Diagnóstico secundário** quando `isFetched && !data`:
   - Roda no MESMO cliente BU-scoped (sem cross-BU lookup).
   - Select mínimo: `id, bu_id, cancelled_at` (ou colunas de soft-delete equivalentes).
   - Classifica em três variantes para `ResourceNotFoundState`:
     - `cancelled` → `cancelled_at != null`
     - `context_loading` → row ativa retornada (race do guard §A.3, refaz quando BU estabilizar)
     - `not_found` → row null (RLS/inexistente real)

5. **Query keys**: incluir `currentBuId` na key principal; key do diagnóstico = `[...principalKey, 'diagnostic']`.

## Implementação de referência

`src/modules/okrs/pages/TeamKrCreationPage.tsx` — query principal + diagnóstico secundário + branch `!objective` com classificação por variant.

## Helper exportado

`getBuScopedClientCurrentBuId()` em `src/integrations/supabase/buScopedClient.ts` retorna o BU id atualmente injetado no header. Use APENAS para telemetria — nunca para business logic.

## Não-objetivos

- ❌ Cross-BU recovery automático (viola TCR §A.3).
- ❌ Remover guard §A.3 "porque RLS já filtra" (defesa em profundidade é mandatória).
- ❌ Usar cliente global para o diagnóstico (vazaria entre BUs).
