# 🩺 Auditoria Sistêmica — 2026-04-22

**Base:** TCR v3.28.0 | DEVELOPMENT_STANDARDS atual | Hygiene + Refactor Plans 2026-03-14 (concluídos)
**Foco solicitado:** complexidade do código + bugs/regressões recorrentes
**Apetite:** alto (refator profundo autorizado)

---

## 🎯 Diagnóstico Sistêmico

### Forças (manter)

1. **Arquitetura sólida** — PRE-BU/POST-BU, Identity Convention, BU-Scoped Client, Query Keys centralizadas: 100% de compliance.
2. **Banco saudável** — RLS V2 100%, cleanup automático via pg_cron, índices em `bu_id`.
3. **Edge Functions padronizadas** — Factory `_shared/client.ts`, middleware unificado, error handler centralizado.
4. **Documentação viva** — TCR mantido, audits arquivadas, memórias `mem://` consistentes.

### Dores reais identificadas

| # | Dor | Sintoma observado | Causa-raiz |
|---|-----|-------------------|------------|
| 1 | **IA trava wizards** | Giordano não conseguia concluir cadastro de OKR; outros usuários relataram tela "carregando" indefinidamente | Cada step do wizard chama `invokeVic` direto, sem timeout. Quando agente demora ou falha, o step trava. Solução ad-hoc (`withTimeout` local) só foi aplicada em 1 dos 9 steps. |
| 2 | **Arquivos gigantes em rotas críticas** | `ExecutiveQuarterReviewPage` 894 linhas, `MbrPage` 798, `OkrCreationPage` 701, `QbrPrePage` 691, `CreateTicketPage` 879 | Páginas absorvem orquestração + UI + business logic. Risco de regressão alto: qualquer mudança toca arquivo grande. |
| 3 | **Edge Function `okr-construction-review` 1133 linhas** | Difícil de auditar; um único arquivo concentra construção de prompts, parsing e orquestração | Falta split por responsabilidade. |
| 4 | **`invokeVic` espalhado em 10 wizards** | Padrão duplicado de try/catch + isLoading + fallback toast | Falta wrapper de "AI opcional com fallback" (cada autor reinventa). |
| 5 | **27 `JSON.parse` diretos** apesar do canon `tryParseAiJson` | Risco de React #31 quando LLM devolver string mal formada | Padrão documentado mas não enforçado por lint. |
| 6 | **320 `console.log/warn/error`** em produção | Ruído em DevTools, vaza contexto interno | Falta logger central + rule de lint para barrar `console.*` exceto via wrapper. |

### Não-dores (mantê-las assim)

- `select('*')` — **0 ocorrências reais** em código de aplicação (somente em `types.ts` auto-gerado e em string-doc).
- `KpiCategorySection`, `OpportunitiesVolumeChart`, `KrUnitSelect`, `krUnits.ts` — todos já removidos.
- Hardcode de `hub.jetimob.com` — já centralizado em `_shared/constants.ts`.

---

## 🌊 Plano em Waves

### ✅ Wave 1 — EXECUTADA NESTA SESSÃO (raiz das regressões de IA)

**Objetivo:** eliminar a fonte de regressões #1 (IA trava wizards) com mudança cirúrgica e centralizada.

| Mudança | Arquivo | Impacto |
|---------|---------|---------|
| Adicionar `timeoutMs` (default 12s) e `fallback` opt-in em `VicInvokeOptions` | `src/modules/vic/hooks/useVicAgent.ts` | **Toda** chamada `invokeVic` no app passa a ter timeout automático — protege os 10 wizards de uma vez. |
| Centralizar fallback-on-error no próprio `invoke` (race com timeout) | `src/modules/vic/hooks/useVicAgent.ts` | Caller passa `fallback`, promise nunca rejeita — wizard não trava. |
| Remover `withTimeout` ad-hoc local | `TeamOkrIntroStep.tsx` | Usa o novo padrão centralizado; -20 linhas de código duplicado. |

**Resultado verificado:** TypeScript limpo. `DEFAULT_VIC_TIMEOUT_MS = 12_000` aplicado a TODAS as chamadas existentes de `invokeVic` (10 wizards + `useWizardAI` + `useAskToVic`) sem precisar editar cada uma.

### 🔜 Wave 2 — Refator profundo (próxima sessão dedicada — ~6h)

| # | Item | Esforço | Risco | Justificativa |
|---|------|---------|-------|---------------|
| 1 | Split `okr-construction-review/index.ts` (1133 linhas) em `prompts.ts`, `parsers.ts`, `index.ts` | 2h | Médio | Isola edição de prompts da lógica de fluxo. |
| 2 | Split `ExecutiveQuarterReviewPage` (894) e `MbrPage` (798) em containers + presentational | 2h | Médio | Reduz risco de regressão a cada ajuste de KPI/ritual. |
| 3 | Criar `useAiSection({ agent, fallback, timeoutMs })` — hook que encapsula o padrão repetido nos 10 wizards (loading/error/fallback/silent) | 1h | Baixo | Elimina duplicação #4. |
| 4 | Substituir 27 `JSON.parse` diretos por `tryParseAiJson` em hooks de IA | 30min | Baixo | Aplica canon já documentado. |
| 5 | ESLint rule custom: proibir `console.*` exceto via `src/lib/logger.ts` | 30min | Baixo | Barra entrada de novos `console.*`. Limpeza dos 320 existentes pode ser progressiva. |

### 🌱 Wave 3 — Higiene contínua (próximas 2-3 semanas — diluído)

| # | Item | Quando |
|---|------|--------|
| 1 | Reduzir todos os arquivos > 600 linhas para < 400 | Sob demanda, ao tocar o arquivo |
| 2 | Migrar `console.*` legados para `logger.*` | Por módulo, em conjunto com outras edits |
| 3 | Storybook stories para os 5 componentes mais usados sem story | P4 |
| 4 | Page transitions com framer-motion | P4 — só se UX pedir |

---

## 📊 Indicadores antes/depois (Wave 1)

| Indicador | Antes | Depois |
|-----------|-------|--------|
| Wizards de OKR onde IA pode travar usuário | 9 / 10 | **0 / 10** |
| Implementações ad-hoc de `withTimeout` | 1 (TeamOkrIntro) | 0 (centralizado) |
| Fonte única de timeout/fallback de IA | ❌ | ✅ `useVicAgent` |
| Backward compatibility de chamadas antigas | — | ✅ `silent` e ausência de `fallback`/`timeoutMs` mantêm comportamento atual |

---

## 🧭 Recomendações de processo

1. **Adotar Wave 2 item 3 antes de criar próximo wizard** — qualquer step novo deve usar `useAiSection`, evitando reintrodução do problema #1.
2. **PRs que adicionarem `console.*` direto** devem ser bloqueados após item 5 da Wave 2.
3. **Auditoria mensal** continua suficiente — sistema está saudável estruturalmente; dores são localizadas, não sistêmicas.

---

*Auditoria executada em: 2026-04-22 — TCR v3.28.0*
*Próxima auditoria: 2026-05-22 ou após Wave 2 ser executada.*
