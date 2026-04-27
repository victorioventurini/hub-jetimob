
## Diagnóstico (validado contra TCR + canônicos)

**O que o usuário viu:** "erro ao listar os ritos da semana" no `/rituals/pre-weekly?team=<marketing>` logado como victorio (admin), enquanto vitor.severo (líder do Marketing) tinha 3 check-ins concluídos hoje.

**Causa raiz confirmada (lendo `PreWeeklySourcesStep.tsx` linha 60-89):**

O hook `useUserWeeklySources` filtra `okr_wizard_sessions` por `started_by = profileId` do usuário logado. Como victorio não foi quem iniciou os check-ins, a query retorna `[]` e o componente renderiza o texto "Nenhum rito registrado por você nesta semana ainda" (linha 156). O usuário interpretou isso como erro porque os dados existem — apenas estão associados a outro `started_by`.

**Conflito com o canônico Pré-Weekly v2:** o ritual é uma destilação **do time** para a Weekly. Quando `?team=` está presente (admin/líder de área navegando contexto via `HierarchyContextSwitcher`), as fontes da semana devem refletir o que o **time** registrou — não apenas o que o usuário logado registrou.

**RLS já permite:** confirmei via `pg_policy` que `okr_wizard_sessions` tem 5 policies SELECT — admins de BU, líderes de área, membros do time e líderes de árvore podem ler sessões de outros usuários. O bloqueio é exclusivamente da query no frontend.

**Bug colateral confirmado:** `okr_wizard_sessions` não possui coluna `deleted_at` (verificado via `information_schema`). O `.is('deleted_at', null)` em `useWeeklyPreWeeklyAggregation.ts` linha 100 vai gerar erro Postgres `42703` quando o Weekly v2 for executado.

## Correção

### 1. `PreWeeklySourcesStep.tsx` — `useUserWeeklySources` deve respeitar contexto de time

- Aceitar `teamId` como parâmetro do hook.
- Quando `teamId` presente: filtrar por `team_id = teamId` (mostra fontes do time, independente de quem iniciou).
- Quando `teamId` ausente: manter `started_by = profileId` (fallback para fluxos sem contexto de time).
- Renomear conceitualmente para "Fontes do time esta semana" quando em modo time; manter "Suas fontes" no modo pessoal.
- Atualizar `preWeeklyKeys.userSources` para incluir `teamId` no key (cache correto por contexto).
- Ajustar copy do empty state: "Nenhum rito registrado **para este time** nesta semana" quando em modo time.

### 2. `PreWeeklyPage.tsx` — passar `teamIdParam` para o Step

Propagar `teamId={teamIdParam}` para `<PreWeeklySourcesStep />` (Step 1 já recebe `referenceWeek`, basta adicionar a prop).

### 3. `useWeeklyPreWeeklyAggregation.ts` — remover filtro inexistente

Remover linha 100: `.is('deleted_at', null)` da query de `okr_wizard_sessions`. Tabela não possui essa coluna; query falha silenciosamente em produção.

### 4. Query keys

Atualizar `preWeeklyKeys.userSources(buId, profileId, referenceWeek)` para `preWeeklyKeys.sources(buId, teamId | profileId, referenceWeek)` — mantendo o helper canônico em `src/lib/queryKeys/okrs.ts`.

## Arquivos afetados

- `src/modules/okrs/components/wizards/pre-weekly/PreWeeklySourcesStep.tsx` (hook + props + copy)
- `src/modules/okrs/pages/PreWeeklyPage.tsx` (passar `teamId` para o Step)
- `src/modules/okrs/hooks/useWeeklyPreWeeklyAggregation.ts` (remover `.is('deleted_at', null)`)
- `src/lib/queryKeys/okrs.ts` (adicionar variante `sources` com `teamId` no scope)

## Validação manual

1. **victorio (admin) + ?team=marketing** → vê as 3 fontes que vitor.severo registrou hoje.
2. **vitor.severo (líder) + ?team=marketing** → continua vendo as mesmas 3 (filtro por team_id).
3. **Usuário sem permissão** → RLS bloqueia, query retorna `[]`, empty state instrutivo (sem toast de erro).
4. **Semana vazia** → empty state "Nenhum rito registrado para este time nesta semana".
5. **Weekly v2 Step 2/3** → para de quebrar ao agregar Pré-Weeklies.

## Aderência ao TCR e canônicos

- **BU Isolation:** `currentBuId` mantido como filtro síncrono.
- **Soft Deletes:** mantido para `teams`; removido para `okr_wizard_sessions` (coluna inexistente).
- **Query Optimization:** select com colunas explícitas mantido.
- **Query Keys:** alteração via helper canônico em `src/lib/queryKeys/okrs.ts`.
- **Hierarchy Context Switcher:** alinhado com `mem://ui/rituals/hierarchy-context-switcher-standard` — ritual respeita o contexto trocado.
- **Pré-Weekly v2 standard:** Step 1 passa a refletir as fontes do contexto selecionado, não do consumidor.
- **RLS:** sem alteração — policies existentes já cobrem o caso.

## Não-objetivos

- Não alterar schema de `okr_wizard_sessions`.
- Não alterar RLS policies.
- Não mexer nos Steps 2/3/4 do Pré-Weekly (já consomem o draft, não as fontes).
- Não migrar para a Onda 4 (persistência estruturada de fontes) — mantém-se em scaffolding.
