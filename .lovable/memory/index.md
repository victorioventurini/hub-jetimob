# Project Memory

## Core
Hooks: TODOS os hooks (useState/useEffect/useMemo/useCallback/useQuery) DEVEM preceder qualquer early-return. Ver mem://standards/frontend-rules-of-hooks.
OKRs compartilhados: objetivo é único do time owner; aparece read-only no dashboard do contribuidor via TeamOkrSections + ContributingOkrCard. Não duplicar.

## Memories
- [Rules of Hooks](mem://standards/frontend-rules-of-hooks) — Hooks antes de early-returns; deps array com chaves estáveis (não usar `length` como proxy)
- [Shared OKR edit hydration](mem://features/okrs/shared-okr-edit-hydration-standard) — Caller deve passar is_shared/responsibility_model/org_objective_id; hidratação one-shot de contribuidores; diff no save
- [Shared OKR contributor view](mem://features/okrs/shared-okr-contributor-view-standard) — Bloco "OKRs Compartilhadas" no dashboard do time contribuidor; ContributingOkrCard read-only com KRs filtradas por kr.team_id
