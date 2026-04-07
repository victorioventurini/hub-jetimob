## Objetivo
Criar uma página que exiba os OKRs de **todos os times** de um quarter em uma única visão, com análise de IA que identifique sinergias e sugira OKRs compartilhadas entre times — superando silos.

## Princípio de Reutilização
- **Reutilizar** `ConstructionScoreCard` e `ObjectiveChecklistCard` existentes (sem duplicar)
- **Reutilizar** tipos de `construction-review.ts` (sem criar novos)
- **Criar** um novo hook `useFullConstructionReview` que estende a lógica do `useConstructionReview` para múltiplos times

## Arquivos

### 1. `src/lib/queryKeys/okrs.ts`
- Adicionar query key `fullConstructionReview: (buId, cycleId) => [...]`

### 2. `src/modules/okrs/hooks/useFullConstructionReview.ts` (novo)
- Busca **todos** os `okr_team_objectives` do ciclo (sem filtro de `team_id`)
- Agrupa por time
- Dispara avaliações IA individuais (mesma edge function `okr-construction-review`)
- Dispara análise consolidada cross-time (mode: `'cross-team-analysis'` — **nova** chamada à edge function com todos os times juntos para sugestões de OKRs compartilhadas)
- Retorna: lista de teams com seus objectives + score global + sugestões cross-team

### 3. `src/modules/okrs/pages/OkrFullConstructionReviewPage.tsx` (novo)
- Layout similar ao `OkrConstructionReviewPage`:
  - Header com título + seletor de ciclo (sem seletor de time)
  - Sidebar: `ConstructionScoreCard` com score global + sugestões cross-team
  - Main: Agrupamento por time (accordion/section) → cada seção lista `ObjectiveChecklistCard`
- Acesso: `requiresBuAdmin` (visão consolidada é para admin/C-Level)

### 4. `src/modules/okrs/hooks/index.ts`
- Exportar `useFullConstructionReview`

### 5. `src/routes/okrs.routes.tsx`
- Adicionar rota `/okrs/construction-review-full` com lazy import e `requiresBuAdmin`

## O que NÃO muda
- Componentes `ConstructionScoreCard` e `ObjectiveChecklistCard` (reuso direto)
- Types existentes em `construction-review.ts`
- Edge function `okr-construction-review` (reutiliza os modos existentes)
- Hook `useConstructionReview` original
