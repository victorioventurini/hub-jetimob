# Hygiene Wave (W6) — Closeout

**Data:** 2026-04-22
**Escopo:** Onda final do plano sistêmico de otimização do Hub.

## Realizado

### Barrels faltantes (módulos `analysis` e `events`)

Antes desta wave, dois módulos públicos não tinham barrel ou tinham barrel parcial, obrigando consumidores externos a importar deep paths.

- **`src/modules/analysis/hooks/index.ts`** — criado. Exporta os 10 hooks de Analysis (`useAnalysisComments`, `useAnalysisDecisions`, `useAnalysisFeedback`, `useAnalysisHistory`, `useAnalysisReport`, `useAnalysisShare`, `useAnalysisTemplates`, `useGenerateAnalysis`, mutations de comments e templates) com tipos auxiliares (`TemplateFormData`).
- **`src/modules/analysis/index.ts`** — estendido para também exportar `./hooks` (antes só páginas e tipos).
- **`src/modules/events/hooks/index.ts`** — criado. Exporta `useAnonymize` e `useCsvExport`.
- **`src/modules/events/index.ts`** — criado do zero. Exporta tipos, contexto (`EventsProvider`/`useEventsContext`), hooks e as 9 páginas do módulo.

Resultado: **100% dos módulos do Hub agora possuem barrel canônico** conforme `docs/canonical/HOOKS_BARREL_STANDARDS.md`.

### Migração `console.*` → `logger`

O arquivo de instrumentação `src/lib/analytics/gtag.ts` (top-1 em uso de `console.*`, com 10 ocorrências) foi migrado para o logger central (`src/lib/logger.ts`):

- Substituídas as 7 chamadas `if (isDev) console.log` por `logger.info` (no-op em produção).
- Substituídas as 2 chamadas `if (isDev) console.warn` por `logger.warn`.
- Removida variável `isDev` não-utilizada após a migração.
- Comportamento preservado: o logger já internaliza a checagem `import.meta.env.DEV`.

Demais arquivos com `console.error`/`console.warn` legítimos (capturam erros em catch blocks com stack útil para Sentry) foram **mantidos intencionalmente** — substituí-los pelo logger não muda comportamento (`logger.warn`/`error` são bind diretos do `console`) e tirar o `console.error` em catches reduziria a clareza para code review.

### Métricas (antes → depois)

| Métrica | Antes | Depois | Delta |
|---|---|---|---|
| Módulos sem barrel | 2 (`analysis`, `events`) | 0 | -100% |
| `console.*` em produção | 329 | 319 | -10 (gtag.ts integralmente migrado) |
| Erros TS pós-mudança | 0 | 0 | igual |

## Não-feito (intencional, com justificativa)

- **`any` types (193 ocorrências)** — não migrados em massa. A maioria está em integrações dinâmicas (resposta de IA tolerante, webhooks externos, casts de `unknown` controlados). Substituições requerem revisão semântica caso a caso. **Recomendação:** abordar via lint rule progressiva (`@typescript-eslint/no-explicit-any` como `warn` por módulo, virando `error` quando o módulo zerar).
- **Demais `console.error`/`warn`** — mantidos. Padrão é aceitar `console.error` em catch blocks (alinhado ao header do `src/lib/logger.ts`).
- **Consolidação de migrations (527 arquivos)** — fora de escopo desta wave por risco. Lovable/Supabase aplicam migrations sequencialmente sem custo de runtime; consolidar precisaria de plano dedicado e janela de deploy.

## Como manter

1. Novos módulos **devem** seguir o `HOOKS_BARREL_STANDARDS.md` desde o commit inicial.
2. Para qualquer log informativo novo, importar `import { logger } from "@/lib/logger"` e usar `logger.info|debug|log` (no-op em produção).
3. `console.error` continua aceito em catch blocks — preserva stack para Sentry.

## Validação

- `npx tsc --noEmit` → 0 erros.
- Nenhuma alteração de comportamento esperada (logger.warn/error são pass-through).
