## Plano Aprovado — Implementação

### 1. Links de OKRs (Opção A + legacy)

**`src/lib/shareableLinks.ts`**
- Adicionar `getInternalOkrUrl(entity, id)` para uso interno.
- Manter `getShareableUrl` (`/go/...`) para shares externos.

**`src/pages/ResolveContextPage.tsx`**
- Mapear `okr_team_objective` → `/okrs?objective=:id`
- Mapear `okr_org_objective` → `/okrs/org-view/:id` (validar; senão `/okrs?org_objective=:id`)
- Manter mapeamentos existentes para `okr_team_kr`, `okr_org_kr`.

**`src/modules/teams/components/contribution/TeamContributionTab.tsx`**
- Trocar links quebrados (`/okrs/team-objective/:id`) por `getShareableUrl('okr_team_objective', id)` (rota `/go/`).

**`src/App.tsx` (ou `okrs.routes.tsx`)**
- Adicionar redirect legacy: `/okrs/team-objective/:id` → `/go/okr_team_objective/:id` via `<Navigate>`.

**`src/modules/okrs/pages/OkrDashboardPage.tsx`**
- Ler search param `?objective=:id` e fazer scrollIntoView no card correspondente.
- Limpar param após primeiro uso.

### 2. Insights com escopo correto

**`src/modules/okrs/hooks/queries/useTeamContributedQueries.ts`**
- `useSharedOkrsSummary(filters?: { teamId?, year?, cycleId? })`:
  - Filtro `.or('primary_team_id.eq.X,contributor_team_ids.cs.{X}')` quando `teamId`.
  - Filtro `.eq('year', Y)` quando `year`.
  - Incluir filtros na query key.
- `useSharedOkrsInsights(filters?)`: propagar filtros.

**`src/lib/queryKeys/okrs.ts`**
- Atualizar `sharedSummary` para aceitar `teamId`, `year`, `cycleId`.

**`src/modules/okrs/pages/OkrDashboardPage.tsx`**
- Passar `teamId` e `year` ativos para `useSharedOkrsInsights`.
- Garantir que numerador e denominador usam o mesmo escopo.

**`src/modules/okrs/components/SharedOkrInsights.tsx`**
- Defesa: clamp `Math.min(100, ...)`.
- Suprimir insight de "% colaborativas" se `sharedOkrsCount > totalOkrsCount`.

### 3. Memórias

**Novos:**
- `.lovable/memory/standards/links/internal-okr-navigation.md`
- `.lovable/memory/features/okrs/shared-okrs-insights-scope-standard.md`

**Atualizar:** `.lovable/memory/index.md`.

### 4. Validação

- `tsc --noEmit`.
- `rg` para localizar outros usos de `/okrs/team-objective/` ou `/okrs/team/`.

### Arquivos

**Edit:** `src/lib/shareableLinks.ts`, `src/lib/shareableLinks.test.ts`, `src/pages/ResolveContextPage.tsx`, `src/modules/teams/components/contribution/TeamContributionTab.tsx`, `src/modules/okrs/pages/OkrDashboardPage.tsx`, `src/modules/okrs/hooks/queries/useTeamContributedQueries.ts`, `src/modules/okrs/components/SharedOkrInsights.tsx`, `src/lib/queryKeys/okrs.ts`, `src/App.tsx` (ou `okrs.routes.tsx`), `.lovable/memory/index.md`.

**New:** `.lovable/memory/standards/links/internal-okr-navigation.md`, `.lovable/memory/features/okrs/shared-okrs-insights-scope-standard.md`.