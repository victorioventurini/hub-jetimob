

# Gestão de Decisões — Reutilizando o que já existe

## Contexto descoberto (zero duplicação)

O Hub já tem **toda a infraestrutura** de decisões implementada — só não estão conectadas como ciclo de vida:

| Já existe | Onde |
|-----------|------|
| Card visual canônico | `DecisionCard` (registro inline + edição) |
| Linha c/ resolver + thread + permissão | `DecisionFollowUpRow` (consumido por `RitualHistoryPage` + `CollaboratorDecisionsStep`) |
| Hook de pendências do usuário | `useMyPendingDecisions(effectiveUserId)` |
| Mutations de resolver/comentar | `useUpdateDecisionFollowUp`, `useDecisionThread` |
| Permissão hierárquica (self/líder time/área/admin) | `useCanResolveDecision` |
| Slot de carry-over no DecisionsStep | `data.carryOverDecisions` (UI pronta, **sem fonte de dados hoje**) |
| Labels canônicos | `RITUAL_LABELS`, `RITUAL_STEP_LABELS`, `WIZARD_TYPE_LABELS` (SSOT) |
| Extrator de decisões da sessão | `extractAllDecisions(row)` (em `useMyPendingDecisions`) |
| Página de histórico c/ deep-link | `/rituals/history?session=:id` |

## O que vamos entregar (estendendo, sem recriar)

### 1) Carry-over automático no próximo rito
- **Novo hook** `useCarryOverDecisions({ persona, teamId, ownerProfileId? })` em `src/modules/okrs/hooks/`. Lê `okr_wizard_sessions` da BU, filtra pelo **mesmo `wizard_type` + mesmo `team_id`** (ou mesmo `started_by` para `collaborator`), pega a sessão concluída mais recente, extrai decisões via `extractAllDecisions` (será **promovido para módulo próprio** `src/modules/okrs/lib/extractDecisions.ts` e reusado pelo hook atual).
- **Wiring nos ritos** que usam `DecisionsStep` do framework: `team-checkin`, `mbr`, `qbr-pre`, `qbr-meeting`, `qbr-post`, `weekly`. Cada página do rito passa `data.carryOverDecisions` (vindo do hook) para o step. Nenhuma mudança no componente — o slot já existe.
- `collaborator-checkin` continua com `CollaboratorDecisionsStep` (já mostra pendências do usuário).

### 2) Card "Minhas decisões pendentes" no dashboard
- **Novo componente** `MyPendingDecisionsCard` em `src/modules/home/components/shared/`. Reutiliza `useMyPendingDecisions` + `DecisionFollowUpRow` (modo `hideThread` para versão compacta). Mostra top 5 ordenado por deadline (vencidos em destaque); footer "Ver todas (N) →" para `/decisions`.
- Adicionado tanto em `LeaderDashboard.tsx` quanto na página do colaborador (Index/CollaboratorDashboard equivalente). Renderiza condicionalmente quando `pendingItems.length > 0`.

### 3) Página `/decisions` (inbox unificado)
- **Nova página** `src/modules/okrs/pages/DecisionsPage.tsx`, registrada em `src/routes/rituals.routes.tsx` sob `RitualRoute`.
- **Filtro de escopo** (visível conforme papel do usuário, calculado via `usePermissions().isWildcard` + leitura de `teams.leader_user_id` / `areas.leader_user_id`):
  - **Minhas** (default): `owner.id === me` OU criadas por mim.
  - **Meu time** (líder de time): membros dos times que lidero (incl. sub-times via `parent_team_id`).
  - **Minha área** (líder de área): usuários de times com `area_id` que lidero.
  - **Toda a BU** (`isWildcard`): tudo.
- **Filtros adicionais** (URL state, padrão `RitualHistoryPage`): status (pendente/concluída/todas), categoria, rito de origem (dropdown com `WIZARD_TYPE_LABELS`), responsável (`BuUserSelect`), período, busca textual.
- **Cada linha** usa `DecisionFollowUpRow` (resolver + thread já funcionam). Cada item exibe origem completa: *"QBR · Decisões Estratégicas · Time Comercial · 12/04"* usando `getRitualLabel(persona)` + `getStepLabel(persona, sourceStep, version)` + nome do time. Link "Abrir rito" → `/rituals/history?session={id}`.
- **Acesso via menu**: link "Decisões" adicionado na navegação lateral (sob "Ritos") em `src/components/layout/HubLayout.tsx`.

### 4) Backend escalável
- **Nova RPC** `rpc_decisions_inbox(p_bu_id, p_user_id, p_scope, p_filters jsonb)` em migração SQL. Lê `okr_wizard_sessions`, extrai decisões de `decisions` + fallback `reflection_data->'data'->'decisions'` (mesma lógica do extrator client-side, agora no banco). Aplica escopo (self/team_ids/area_ids/all). Retorna paginado com `{ decision_json, session_id, wizard_type, structure_version, completed_at, team_id, team_name, started_by_profile_id }`.
- **Novo hook** `useDecisionsInbox(filters, scope)` consome a RPC.

### 5) SSOT auxiliar
- **Reusar 100% do que já existe**: nada de novo mapping de labels — todos vêm de `ritualLabels.ts` e `WIZARD_TYPE_LABELS`. Apenas garantir que decisões registradas tenham `sourceStep` (já têm, vindo do `InlineDecisionInput`).

## Arquivos

**Criar:**
- `src/modules/okrs/lib/extractDecisions.ts` (promove `extractAllDecisions` para utilitário compartilhado)
- `src/modules/okrs/hooks/useCarryOverDecisions.ts`
- `src/modules/okrs/hooks/useDecisionsInbox.ts`
- `src/modules/okrs/pages/DecisionsPage.tsx` + sub-componentes em `pages/decisions/` (`DecisionsFilters.tsx`, `DecisionsScopeSelector.tsx`, `DecisionInboxRow.tsx` — wrapper sobre `DecisionFollowUpRow` com metadados de origem)
- `src/modules/home/components/shared/MyPendingDecisionsCard.tsx`
- Migration SQL: `rpc_decisions_inbox` + índice em `okr_wizard_sessions(bu_id, status) WHERE decisions IS NOT NULL`
- Memória: `mem://features/decisions/decisions-lifecycle-master`

**Editar:**
- `src/modules/okrs/hooks/index.ts` — exportar novos hooks
- `src/modules/okrs/hooks/useMyPendingDecisions.ts` — passar a importar `extractAllDecisions` do novo módulo
- `src/lib/queryKeys/okrs.ts` — `decisionsInbox(...)`, `carryOverDecisions(...)`
- `src/routes/rituals.routes.tsx` — registrar `/decisions`
- `src/modules/home/components/LeaderDashboard.tsx` + dashboard do colaborador — incluir o card
- Páginas dos ritos com `DecisionsStep`: `TeamCheckinPage.tsx`, `MbrPage.tsx`, `QbrPrePage.tsx`, `QbrMeetingPage.tsx`, `QbrPostPage.tsx`, `WeeklyPage.tsx` — passar `carryOverDecisions` do hook
- `src/components/layout/HubLayout.tsx` (ou nav equivalente) — link "Decisões"

## Regras inquebráveis aplicadas
- BU isolation via `useBuScopedSupabase` + `currentBuId` em todos os hooks.
- Identity: `useIdentity().profileId` (real, nunca `auth.uid()`) para filtros e checagens.
- Permissões: `usePermissions().has()` + `useCanResolveDecision` para gates.
- Query keys: helpers prefixados em `lib/queryKeys/okrs.ts`.
- Sem `select('*')`. Sem CHECK constraints (a RPC dispensa).
- URL state nos filtros (padrão `RitualHistoryPage`).
- `<Link>` para navegação interna.

## Fora de escopo (sugestões para depois)
- Notificação por email/push de deadlines vencidos.
- Múltiplos owners por decisão.
- Conversão de decisão em projeto/iniciativa.

