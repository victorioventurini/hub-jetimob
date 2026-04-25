# Project Memory

## Core
Hooks: TODOS os hooks (useState/useEffect/useMemo/useCallback/useQuery) DEVEM preceder qualquer early-return. Ver mem://standards/frontend-rules-of-hooks.
OKRs compartilhados: objetivo é único do time owner; aparece read-only no dashboard do contribuidor via TeamOkrSections + ContributingOkrCard. Não duplicar.
URL state: `setSearchParams` DEVE usar functional update para preservar outros params. Ver mem://standards/url-state-preservation.
Wizard drafts: chave de localStorage DEVE incluir todo escopo (objectiveId + teamId). Ver mem://standards/wizard-draft-isolation.
No render side-effects: PROIBIDO chamar setState/navigate/setSearchParams/setStep durante render. Filtrar antes ou usar useEffect. Ver mem://standards/no-render-side-effects.
BU-scoped detail keys: query keys de detalhe DEVEM incluir `currentBuId` e separar loading de not-found para evitar loading infinito. Ver mem://standards/bu-scoped-detail-query-keys.
BU membership cache: toda mutação em bu_user_memberships/bu_units DEVE invalidar `queryKeys.bu.userBusPrefix()`. Ver mem://standards/bu-membership-cache-invalidation.
Internal OKR navigation: links de OKRs usam `getShareableUrl()` (`/go/...`) para shares; rotas internas canônicas em `okrs.routes.tsx`. Ver mem://standards/links/internal-okr-navigation.
Shared OKR insights: numerador e denominador SEMPRE no mesmo escopo (teamId+year). Ver mem://features/okrs/shared-okrs-insights-scope-standard.
BU detail diagnostic: páginas de detalhe BU-scoped DEVEM gate `currentBuId`, manter guard §A.3, classificar `!data` via diagnóstico secundário (cancelled/context_loading/not_found). Ver mem://standards/bu-scoped-detail-diagnostic-pattern.

## Memories
- [Rules of Hooks](mem://standards/frontend-rules-of-hooks) — Hooks antes de early-returns; deps array com chaves estáveis (não usar `length` como proxy)
- [URL state preservation](mem://standards/url-state-preservation) — Functional update em setSearchParams para não apagar params existentes (contributor_team_id, filtros)
- [Wizard draft isolation](mem://standards/wizard-draft-isolation) — Key de draft inclui objectiveId+teamId; valida scope no load; evita owner sobrescrever contribuidor
- [No render side-effects](mem://standards/no-render-side-effects) — Nunca chamar setState/setSearchParams/navigate em render; filtrar steps ou usar useEffect
- [BU-scoped detail query keys](mem://standards/bu-scoped-detail-query-keys) — Incluir buId em keys de detalhe; separar loading de not-found; usar prefix para invalidar
- [BU membership cache invalidation](mem://standards/bu-membership-cache-invalidation) — Mutações em bu_user_memberships/bu_units invalidam userBusPrefix(); selectBu defensivo refeta no miss
- [Internal OKR navigation](mem://standards/links/internal-okr-navigation) — Tabela de rotas canônicas; redirects legacy; auditoria de targetPath em ResolveContextPage
- [Shared OKRs insights scope](mem://features/okrs/shared-okrs-insights-scope-standard) — Hook aceita {teamId,year}; clamp [0,100]; supressão se shared > total
- [Shared OKR edit hydration](mem://features/okrs/shared-okr-edit-hydration-standard) — Caller deve passar is_shared/responsibility_model/org_objective_id; hidratação one-shot de contribuidores; diff no save
- [Shared OKR contributor view](mem://features/okrs/shared-okr-contributor-view-standard) — Bloco "OKRs Compartilhadas" no dashboard do time contribuidor; ContributingOkrCard read-only com KRs filtradas por kr.team_id
- [Team contribution tab](mem://features/teams/team-contribution-tab-standard) — Aba /teams/:id?tab=contribution com 5 sub-tabs, toggle sub-times (off por padrão), sparkline de confidence; rota legada /okrs/team-contribution/:teamId redireciona
- [BU detail diagnostic pattern](mem://standards/bu-scoped-detail-diagnostic-pattern) — Gate currentBuId + guard §A.3 + diagnóstico secundário classificando cancelled/context_loading/not_found; helper getBuScopedClientCurrentBuId só p/ telemetria


