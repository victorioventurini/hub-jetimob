# Fix: SharedOkrInsights vaza dados entre BUs

## Diagnóstico

Na BU **Jet Experience** (sem OKRs cadastradas), o card de Insights mostra
"2 OKRs envolvem múltiplos times". Esses 2 OKRs vêm do cache da BU
**Jetimob** carregada anteriormente.

**Causa raiz:** `queryKeys.okrs.sharedSummary(teamId, year)` **não inclui
`buId`** na chave. Ao trocar de BU, o React Query devolve o cache da BU
anterior porque a chave colide. A query em si até roda pelo cliente
BU-scoped (RLS via `security_invoker` no `v_shared_okrs_summary` filtra
corretamente), mas o usuário vê o cache antigo até o refetch completar —
e o insight é renderizado com `sharedOkrs.length > 0`.

Isso viola a regra Core de **BU Isolation** (chave de query precisa
carregar `bu_id`).

## Mudanças

### 1. `src/lib/queryKeys/okrs.ts`
- `sharedSummary(buId, teamId, year)` — adicionar `buId` como **primeiro**
  segmento após o namespace: `['shared-okrs-summary', buId, teamId, year]`.
- `sharedSummaryPrefix(buId?)` — aceitar `buId` opcional para permitir
  invalidação escopada por BU, mantendo compat com invalidação global
  quando chamado sem argumento.

### 2. `src/modules/okrs/hooks/queries/useTeamContributedQueries.ts`
- Em `useSharedOkrsSummary`: ler `currentBuId` via `useCurrentBuId()` (ou
  `useBu()`), passar na query key, e bloquear via `enabled: isReady && !!supabase && !!buId`.
- `useSharedOkrsInsights` não muda assinatura (continua repassando scope).

### 3. `src/modules/okrs/components/TeamKrFormDialog.tsx`
- Atualizar `invalidateQueries({ queryKey: queryKeys.okrs.sharedSummaryPrefix() })`
  — chamada sem argumento mantém invalidação ampla; comportamento preservado.

## Fora de escopo
- Não mexer no `v_shared_okrs_summary` (RLS já correta via security_invoker).
- Não tocar em `useOkrDashboardData` / RPC.
- Sem mudança visual.

## Validação
1. Logar como user com acesso a Jetimob e Jet Experience.
2. Abrir `/okrs` em Jetimob → insight mostra "2 OKRs...".
3. Trocar BU para Jet Experience → insight some imediatamente (cache não
   colide; query roda com `buId` correto e retorna 0).
