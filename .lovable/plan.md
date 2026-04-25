# Auditoria pós-correção (2026-04-25)

## Reverso: janela `BU_SWITCH_GUARD_WINDOW_MS` em `buScopedClient.ts`

**Decisão:** revertida. Era anti-pattern arquitetural por:

1. **Camada errada.** Guards temporais de transição de tenant pertencem ao `BuContext` (que já expõe `isSwitchingBu`), não ao client de transporte.
2. **Redundância.** O swap atômico em `clearBuClientCache(buId)` + fallback de `localStorage` no fetch interceptor já garantem coerência determinística do header `x-current-bu-id`.
3. **Heurística temporal vs. determinismo.** O TCR §Conventions exige soluções determinísticas; janelas de tolerância introduzem incerteza e bugs latentes em CI/HMR/abas múltiplas.
4. **Padrão canônico já existia.** `usePrefetchRoute` (e qualquer consumidor que dispare requests durante a janela de troca) deve gatear via `useBu().isSwitchingBu`. Esse é o contrato documentado.

## Mantidos (em conformidade com TCR + memórias)

- `TeamKrCreationPage.tsx` — `ensureBuHeaderSync` + retry one-shot + diagnóstico tiered. Conforme `mem://standards/bu-scoped-detail-diagnostic-pattern` regras #8 e #9. Defesa em profundidade legítima contra: (a) HMR re-avaliando o módulo do singleton; (b) troca de BU em outra aba (multi-tab) propagada via `localStorage` mas não via `globalThis`.
- `ResourceNotFoundState` — variante `permission_denied`. Pertence à camada de apresentação, sem impacto em segurança.
- Standard `bu-scoped-detail-diagnostic-pattern` — atualizado com regras #8/#9.

## Conformidade com pré-checklist

A próxima ação sobre `buScopedClient.ts` ou `BuContext.tsx` precisa consultar:
- TCR §1 (Architecture) — modelo multi-BU
- TCR §4 (Conventions) — RLS + queries determinísticas
- `mem://architecture/auth/supabase-client-sync-standard` — globalClient é o único refresh holder
- `mem://standards/bu-scoped-detail-diagnostic-pattern` — gates e diagnóstico de páginas de detalhe
