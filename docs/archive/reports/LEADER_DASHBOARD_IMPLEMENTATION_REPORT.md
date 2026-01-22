# Leader Dashboard Implementation Report

## TCR v2.4.0 - Leader Dashboard Evolution

**Data:** 2026-01-07  
**Status:** Fase 1 Completa

---

## 1. Arquivos Adicionados

### Backend (RPCs)

| Arquivo | Descrição |
|---------|-----------|
| Migration | RPCs para Leader Dashboard |

### Frontend - Types

| Arquivo | Descrição |
|---------|-----------|
| `src/modules/home/types.ts` | Tipos TypeScript para dashboard |

### Frontend - Hooks

| Arquivo | Descrição |
|---------|-----------|
| `src/modules/home/hooks/useLeaderTeams.ts` | Busca times liderados |
| `src/modules/home/hooks/useLeaderDashboard.ts` | Dados do dashboard |
| `src/modules/home/hooks/useLeaderScope.ts` | Gerencia seleção de time |
| `src/modules/home/hooks/index.ts` | Exports |

### Frontend - Components

| Arquivo | Descrição |
|---------|-----------|
| `src/modules/home/components/LeaderScopeSelector.tsx` | Seletor de time |
| `src/modules/home/components/LeaderDashboard.tsx` | Dashboard principal |
| `src/modules/home/components/leader/TeamCriticalAlertsCard.tsx` | Alertas críticos |
| `src/modules/home/components/leader/LeaderTodayFocusCard.tsx` | Foco do dia |
| `src/modules/home/components/leader/TeamOkrsCard.tsx` | Resumo OKRs |
| `src/modules/home/components/leader/TeamKpisCard.tsx` | Resumo KPIs |
| `src/modules/home/components/leader/TicketsTeamInboxCard.tsx` | Tickets do time |
| `src/modules/home/components/leader/AssetsTeamLoansCard.tsx` | Empréstimos |
| `src/modules/home/components/leader/VicLeaderInsightsCard.tsx` | Insights Vic |
| `src/modules/home/components/leader/index.ts` | Exports |
| `src/modules/home/components/index.ts` | Exports |
| `src/modules/home/index.ts` | Module exports |

### Arquivos Modificados

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/Index.tsx` | Integração do LeaderDashboard |

---

## 2. RPCs Criadas

### `get_leader_teams(p_user_id uuid)`

**Retorna:** Lista de times onde o usuário é líder

```sql
RETURNS TABLE(
  team_id uuid,
  team_name text,
  team_description text,
  parent_team_id uuid,
  member_count bigint
)
```

### `rpc_leader_dashboard_summary(p_team_id uuid)`

**Retorna:** JSONB com dados agregados

```json
{
  "team": { "id": "uuid", "name": "string" },
  "okrs": {
    "green": 0, "yellow": 0, "red": 0, 
    "not_started": 0, "pending_checkins": 0
  },
  "tickets": {
    "total_open": 0, "overdue": 0, "due_soon": 0,
    "awaiting_internal": 0, "awaiting_external": 0,
    "top": []
  },
  "assets": {
    "active_loans": 0, "overdue": 0, "due_soon": 0,
    "top": []
  },
  "kpis": {
    "tracked_count": 0, "at_risk_count": 0, "breached_count": 0,
    "top": []
  }
}
```

### `rpc_leader_dashboard_focus(p_team_id uuid)`

**Retorna:** Array JSONB com até 3 focus items

```json
[
  {
    "type": "warning|action|info",
    "label": "string",
    "url": "string|null",
    "cta": "string|null"
  }
]
```

### `is_user_leader(p_user_id uuid)`

**Retorna:** Boolean

---

## 3. Funções Auxiliares

| Função | Descrição |
|--------|-----------|
| `get_team_member_ids(p_team_id)` | Retorna array de user_ids do time + sub-times |
| `get_descendant_team_ids(p_team_id)` | Retorna array de team_ids (time + descendentes) |

---

## 4. Índices Criados

```sql
CREATE INDEX idx_teams_leader_bu ON teams(leader_user_id, bu_id);
CREATE INDEX idx_asset_inventory_loaned_user ON asset_inventory(bu_id, current_user_id);
CREATE INDEX idx_tickets_visibility_due ON tickets(bu_id, visibility, expected_due_at);
CREATE INDEX idx_okr_team_kr_checkin ON okr_team_key_results(bu_id, team_id, last_checkin_at);
```

---

## 5. Permission Keys por Card

| Card | Permission Key | Comportamento |
|------|----------------|---------------|
| TeamOkrsCard | `okrs.read` | Hidden se false |
| TeamKpisCard | `kpis.read` | Hidden se false |
| TicketsTeamInboxCard | `tickets.read` | Hidden se false |
| AssetsTeamLoansCard | `assets.read` | Hidden se false |
| TeamCriticalAlertsCard | N/A | Respeita permissions dos módulos |
| LeaderTodayFocusCard | N/A | Sempre visível |
| VicLeaderInsightsCard | N/A | Sempre visível |

---

## 6. BU Scope

✅ **useBuScopedSupabase()** utilizado em:
- `useLeaderTeams.ts`
- `useLeaderDashboard.ts`

---

## 7. Validações de Segurança

### RPCs (SECURITY DEFINER)

1. ✅ Valida `auth.uid() IS NOT NULL`
2. ✅ Valida `current_bu_id() IS NOT NULL`
3. ✅ Valida `user_can_manage_team(auth.uid(), p_team_id)`
4. ✅ Retorna `FORBIDDEN_TEAM_SCOPE` se sem permissão

---

## 8. Persistência

- **localStorage key:** `hub.leader.selectedTeamId.{buId}`
- **Comportamento:** Persiste seleção de time por BU

---

## 9. QA Status

Ver: `docs/qa/QA_LEADER_DASHBOARD.md`

---

## 10. Próximos Passos (Fase 2)

- [ ] Integrar KPIs reais (quando módulo KPI estiver completo)
- [ ] Adicionar deep links com filtros de team nos módulos
- [ ] Implementar squads como visões auxiliares
- [ ] Adicionar realtime updates para alertas críticos
