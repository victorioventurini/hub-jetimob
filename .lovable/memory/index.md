# Project Memory

## Core
Hooks: TODOS os hooks (useState/useEffect/useMemo/useCallback/useQuery) DEVEM preceder qualquer early-return. Ver mem://standards/frontend-rules-of-hooks.
OKRs compartilhados: objetivo é único do time owner; aparece read-only no dashboard do contribuidor via TeamOkrSections + ContributingOkrCard. Não duplicar.
URL state: `setSearchParams` DEVE usar functional update para preservar outros params. Ver mem://standards/url-state-preservation.
Wizard drafts: chave de localStorage DEVE incluir todo escopo (objectiveId + teamId). Ver mem://standards/wizard-draft-isolation.
No render side-effects: PROIBIDO chamar setState/navigate/setSearchParams/setStep durante render. Filtrar antes ou usar useEffect. Ver mem://standards/no-render-side-effects.
BU-scoped detail keys: query keys de detalhe DEVEM incluir `currentBuId` e separar loading de not-found para evitar loading infinito. Ver mem://standards/bu-scoped-detail-query-keys.
BU membership cache: toda mutação em bu_user_memberships/bu_units DEVE invalidar `queryKeys.bu.userBusPrefix()`. Ver mem://standards/bu-membership-cache-invalidation.
BU selection race: BuContext respeita seleção recente do usuário (5s) e selectBu retenta após refetch quando cache está stale. Ver mem://standards/bu-selection-race-protection.
Internal OKR navigation: links de OKRs usam `getShareableUrl()` (`/go/...`) para shares; rotas internas canônicas em `okrs.routes.tsx`. Ver mem://standards/links/internal-okr-navigation.
Shared OKR insights: numerador e denominador SEMPRE no mesmo escopo (teamId+year). Ver mem://features/okrs/shared-okrs-insights-scope-standard.
BU detail diagnostic: páginas de detalhe BU-scoped DEVEM gate `currentBuId`, filtrar `.eq('bu_id', currentBuId)` em TODAS as queries (inclusive diagnóstico), manter guard §A.3, classificar `!data` apenas em cancelled/not_found. Ver mem://standards/bu-scoped-detail-diagnostic-pattern.
Job titles: leitura de cargo de profile usa `job_title_rel:job_titles!job_title_id(name)` — `profiles.job_title` NÃO existe (Wave 2.6). Ver mem://standards/users/job-title-relation-access.

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
- [BU selection race protection](mem://standards/bu-selection-race-protection) — lastUserSelectionAtRef + janela 5s; effect de init não sobrescreve seleção recente; selectBu retenta após refetch e mostra toast quando BU realmente inacessível
- [BU detail diagnostic pattern](mem://standards/bu-scoped-detail-diagnostic-pattern) — Gate currentBuId + `.eq('bu_id', currentBuId)` em TODAS as queries (principal e diagnóstico) + guard §A.3; classifica em cancelled/not_found (sem context_loading enganoso)
- [Contributor KR uses modal](mem://features/okrs/contributor-kr-uses-modal) — "Adicionar KR" no card de OKR compartilhada abre TeamKrFormDialog (não wizard); passa objectiveId, teamId=contributor, buId=objective.bu_id; invalida caches de contribuição
- [Job title relation access](mem://standards/users/job-title-relation-access) — Wave 2.6: profiles não tem coluna `job_title`; sempre usar relação `job_title_rel:job_titles!job_title_id(name)` e achatar no consumo
- [Optional Select Clearable](mem://standards/ui/optional-select-include-none) — TeamSelect/AreaSelect/BuUserSelect em campos opcionais exigem includeNone/allowNone para permitir limpar a seleção (Radix Select não limpa nativamente)
- [Collaborator Initiatives Step Scope](mem://features/rituals/collaborator-initiatives-step-scope) — Step de Iniciativas: owner OR contributor no ciclo ativo; KRs derivados das iniciativas (não usa array `krs`)
- [Collaborator Step 1 Order](mem://features/rituals/collaborator-step1-order-mirrors-steps) — Snapshot e trilha do Step 1 derivam ordem de `STEP_ORDER` (SSOT em `wizardSteps.ts`); ordem canônica: KPIs → Projetos → Iniciativas → KRs


- [KPIs Permissions Matrix](mem://features/kpis/kpis-permissions-matrix) — Matriz scope-oriented (org/area/team) com herança hierárquica; Métricas travadas em scope=team; helpers SQL user_can_manage_kpi/user_can_create_kpi
- [KPI Value Entry SSOT](mem://features/kpis/kpi-value-entry-ssot) — `KpiValueEntryForm` é o único formulário de "Registrar valor de KPI"; consumido por modal /kpis e por todos os ritos; sempre enviar `input_type` no insert
- [KPI Status Consolidation](mem://standards/kpi-status-consolidation) — `lifecycle_status` é SSOT; `status` é @deprecated, sincronizado por trigger; filtros novos usam APENAS `lifecycle_status`
- [All Hands](mem://features/rituals/all-hands-standard) — Rito mensal (1ª sexta) reaproveita steps MBR read-only; cadência via sync-ritual-calendar

- [External User Tickets Access](mem://features/tickets/external-user-module-access) — userRole='external' ganha acesso ao módulo Tickets sem template V2 (RLS can_view_ticket é a defesa)
- [BU API Keys](mem://features/settings/bu-api-keys) — chaves de API por BU, gateway `bu-api`, escopos por módulo, rate limit

