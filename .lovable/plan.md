
# Wave: Isolamento Cross-BU em Todos os Módulos

## Pré-checklist consultado
- `docs/canonical/BU_SCOPED_SUPABASE_RULES.md` v4.1.0 — regras inquebráveis de filtragem `.eq('bu_id', currentBuId)` por camada
- `docs/canonical/QUERY_KEYS_STANDARD.md` — query keys devem incluir `buId` para evitar reuso de cache cross-BU
- `mem://features/tickets/cross-bu-isolation` — padrão canônico de defesa em 4 camadas estabelecido nesta sessão
- `mem://standards/bu-isolation-master` — filtro mandatório, query gating, cross-BU profiles

## Diagnóstico — auditoria de páginas de detalhe operacionais

Apliquei o padrão `Tickets v2026-04-27` (RLS + frontend filter + query key + UX guard) a cada rota com `:id` que carrega entidade BU-scoped:

| Módulo | Rota | Hook detalhe | Query key inclui `buId`? | Guard pós-fetch (`return null` se BU != atual)? | UX guard na página? |
|---|---|---|---|---|---|
| Tickets | `/tickets/:id` | `useTicket` | ✅ (corrigido) | ✅ | ✅ |
| Projetos | `/projects/:id` | `useProject` | ✅ | ✅ (linha 63) | ❌ |
| KPIs | `/kpis/:kpiId` | `useKpiDetail` | ❌ key sem buId | ✅ (linha 424) | ❌ |
| Times | `/teams/:id` | `useTeam` | ❌ key sem buId | ✅ (linha 133) | ❌ |
| Squads | `/squads/:id` | `useSquad` | ❌ key sem buId | ❌ ausente | ❌ |
| Análise | `/analysis/:reportId` | `useAnalysisReport` | ❌ key sem buId | ❌ ausente | ❌ |
| OKRs Org View | `/okrs/org-view/:objectiveId` | `useOrgObjectiveView` | ✅ | ❌ ausente | ❌ |
| OKRs Team Contribution | `/okrs/team-contribution/:teamId` | inline | ❌ | ❌ ausente | ❌ |
| Parceiros (BU-scoped) | `/settings/partners/:partnerId` | `usePartnerById` | ❌ | parcial | ❌ (mas é multi-BU por design — manter) |

> **Eventos** (`/events/...`) e **Agentes/Integrações Hub** (`/hub/integrations/...`) usam mocks ou são intencionalmente platform-wide → fora do escopo desta wave.
>
> **Parceiros globais** (`/hub/partners/:partnerId`) são platform-level → fora do escopo (não há conceito de "BU correta").

## Plano de execução (4 camadas por módulo)

Para cada módulo afetado aplicaremos o mesmo padrão consolidado:

### 1. Query keys — incluir `buId`
Atualizar em `src/lib/queryKeys/`:
- `kpis.ts` → `detail: (buId, kpiId) => ['kpis', 'detail', kpiId, buId]` + `detailPrefix(kpiId)`
- `teams.ts` → `teams.detail: (buId, teamId)` + `squads.detail: (buId, squadId)` + prefixes
- `analysis.ts` → `detail: (buId, id)` + prefix
- `okrs.ts` → `teamContribution: (buId, teamId, cycleId?)`
- `participantKeys.ts` (squad memberships) — manter (não muda BU)

Atualizar todos os `invalidateQueries` em hooks de mutação para passar `buId` (ou usar `detailPrefix` quando se quer invalidar sem conhecer buId).

### 2. Frontend filter explícito + post-fetch guard
Adicionar `.eq("bu_id", buId)` no select onde a coluna existir, ou garantir validação pós-fetch `if (data.bu_id !== currentBuId) return null` em:
- `useSquad` (não tem nem um nem outro)
- `useAnalysisReport` (não tem `.eq('bu_id')` nem post-fetch validation)
- `useOrgObjectiveView` (precisa post-fetch validation: objective.bu_id !== currentBuId → null)
- `useTeamContributionPage` query inline → mover para hook nomeado com guard

### 3. UX guard nas páginas de detalhe
Padrão idêntico ao `TicketDetailPage`: comparar `entity.bu_id !== currentBu.id` e renderizar `VicErrorState` instruindo o usuário a trocar de BU. Aplicar em:
- `ProjectDetailPage`
- `KpiDetailPage`
- `TeamDetailPage`
- `SquadDetailPage`
- `AnalysisResultPage`
- `OrgObjectiveViewPage`

### 4. RLS hardening (banco) — onde necessário
Auditar e endurecer funções `can_view_*` para exigir `current_bu_id() = entity.bu_id` (com bypass para `is_platform_admin`). Apliquei a Tickets; replicar para entidades sem BU guard no RLS:

- `okr_team_objectives`, `okr_team_key_results`, `okr_initiatives`, `okr_org_objectives`, `okr_org_key_results` — verificar policies SELECT e adicionar cláusula `bu_id = current_bu_id() OR is_platform_admin()`
- `kpi_metrics`, `kpi_values` — idem
- `projects`, `project_milestones` — verificar `can_view_project` (se existir)
- `teams`, `squads` — idem
- `analysis_reports`, `analysis_decisions`, `analysis_comments` — idem

Migration única consolidada com revisão policy-a-policy. Funções `SECURITY DEFINER` com `SET search_path = public`. Sem CHECK constraints.

## Detalhes técnicos

### Pseudocódigo do UX guard (replicado por página)
```tsx
const { currentBu } = useBu();
const { data: entity, isLoading } = useEntity(id);

if (isLoading) return <Loader />;
if (!entity) return <NotFound />;
if (currentBu && entity.bu_id !== currentBu.id) {
  return (
    <VicErrorState
      title="Conteúdo de outra BU"
      description="Este registro pertence a outra Business Unit. Troque de BU para visualizá-lo."
    />
  );
}
```

### Query key pattern (replicado por módulo)
```ts
detail: (buId: string | null, id: string | null) => 
  ['<module>', 'detail', id, buId] as const,
detailPrefix: (id: string) => 
  ['<module>', 'detail', id] as const,
```

### Migration RLS (esqueleto)
```sql
-- Para cada policy SELECT em tabelas operacionais:
DROP POLICY IF EXISTS "<old_select_policy>" ON public.<table>;
CREATE POLICY "<table>_select_v2" ON public.<table>
FOR SELECT
USING (
  is_platform_admin()
  OR (bu_id = current_bu_id() AND <existing_ownership_check>)
);
```

## Ordem de execução (atomic per module)

1. **Wave 1 — Query keys SSOT**: atualizar todas as `detail`/`detailPrefix` keys de uma vez. Risco baixo, alto blast radius.
2. **Wave 2 — Hooks**: `useSquad`, `useAnalysisReport`, `useOrgObjectiveView`, `useTeamContributionPage`. Adicionar guards.
3. **Wave 3 — UX guards**: aplicar `VicErrorState` nas 6 páginas listadas.
4. **Wave 4 — Migration RLS**: hardening backend em uma migration consolidada e revisada.
5. **Wave 5 — Testes & memória**: atualizar testes de query keys; atualizar `mem://standards/bu-isolation-master` com novo padrão de UX guard universal e tabela de cobertura.

## Riscos & mitigações

- **Cache invalidations existentes**: alguns `invalidateQueries(['kpis', 'detail', id])` deixam de matchar com a nova key. Usar `detailPrefix` para garantir compatibilidade.
- **Realtime subscriptions** que filtram por id (sem buId) continuam funcionando — apenas a chave do React Query muda.
- **Multi-BU users (admins)** que abrem links profundos de outras BUs vão ver `VicErrorState` em vez de carregar — comportamento desejado e consistente com Tickets.
- **OKRs Cross BU rituals** (QBR C-Level) usam `is_platform_admin()` bypass — manter intacto.

## Documentação
- Atualizar `docs/canonical/BU_SCOPED_SUPABASE_RULES.md` adicionando seção "UX Guard Universal" e tabela de incidentes (2026-04-27 Tickets cross-BU).
- Atualizar `mem://standards/bu-isolation-master` consolidando o padrão de 4 camadas como SSOT.
