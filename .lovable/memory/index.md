# Project Memory

## Core
Hooks: TODOS os hooks (useState/useEffect/useMemo/useCallback/useQuery) DEVEM preceder qualquer early-return. Ver mem://standards/frontend-rules-of-hooks.
OKRs compartilhados: objetivo é único do time owner; aparece read-only no dashboard do contribuidor via TeamOkrSections + ContributingOkrCard. Não duplicar.
URL state: `setSearchParams` DEVE usar functional update para preservar outros params. Ver mem://standards/url-state-preservation.
Wizard drafts: chave de localStorage DEVE incluir todo escopo (objectiveId + teamId). Ver mem://standards/wizard-draft-isolation.
No render side-effects: PROIBIDO chamar setState/navigate/setSearchParams/setStep durante render. Filtrar antes ou usar useEffect. Ver mem://standards/no-render-side-effects.

## Memories
- [Rules of Hooks](mem://standards/frontend-rules-of-hooks) — Hooks antes de early-returns; deps array com chaves estáveis (não usar `length` como proxy)
- [URL state preservation](mem://standards/url-state-preservation) — Functional update em setSearchParams para não apagar params existentes (contributor_team_id, filtros)
- [Wizard draft isolation](mem://standards/wizard-draft-isolation) — Key de draft inclui objectiveId+teamId; valida scope no load; evita owner sobrescrever contribuidor
- [No render side-effects](mem://standards/no-render-side-effects) — Nunca chamar setState/setSearchParams/navigate em render; filtrar steps ou usar useEffect
- [Shared OKR edit hydration](mem://features/okrs/shared-okr-edit-hydration-standard) — Caller deve passar is_shared/responsibility_model/org_objective_id; hidratação one-shot de contribuidores; diff no save
- [Shared OKR contributor view](mem://features/okrs/shared-okr-contributor-view-standard) — Bloco "OKRs Compartilhadas" no dashboard do time contribuidor; ContributingOkrCard read-only com KRs filtradas por kr.team_id
- [Team contribution tab](mem://features/teams/team-contribution-tab-standard) — Aba /teams/:id?tab=contribution com 5 sub-tabs, toggle sub-times (off por padrão), sparkline de confidence; rota legada /okrs/team-contribution/:teamId redireciona


