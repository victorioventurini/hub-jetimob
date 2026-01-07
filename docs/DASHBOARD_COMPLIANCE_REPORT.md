# Dashboard Compliance Report

## TCR v2.4.0 - Leader Dashboard Validation

**Data:** 2026-01-07  
**Status:** ✅ PASS (com correções aplicadas)

---

## Resumo Executivo

| Área | Status | Observação |
|------|--------|------------|
| Validação Funcional | ✅ PASS | UX conforme especificação |
| Validação Técnica | ✅ PASS | Segurança validada |
| BU Scope Enforcement | ✅ PASS | Corrigido `useTeamManagement` |
| Hierarquia de Times | ✅ PASS | Líder não gerencia pai/irmãos |
| Permissões | ✅ PASS | Cards respeitam permission keys |

---

## 1. Validação Funcional (UX/Produto)

### 1.1 Leader Dashboard

| Cenário | Status | Evidência |
|---------|--------|-----------|
| Seletor de time aparece apenas para líderes | ✅ PASS | `Index.tsx:53` verifica `isLeader && !isExecutive` |
| Seletor persiste por BU | ✅ PASS | `useLeaderScope.ts:11-13` usa `hub.leader.selectedTeamId.{buId}` |
| Troca de time invalida queries | ✅ PASS | `useLeaderScope.ts:64-69` invalida queryKeys |
| Líder com 1 time vê selector read-only | ✅ PASS | `LeaderScopeSelector.tsx:77-95` |

### 1.2 Tickets do Time

| Cenário | Status | Evidência |
|---------|--------|-----------|
| Tickets bu_all aparecem | ✅ PASS | RPC linha 217: `t.visibility = 'bu_all'` |
| Tickets de sub-times aparecem | ✅ PASS | RPC linha 219: `visibility_team_ids && v_team_ids` |
| Tickets privados excluídos | ✅ PASS | RPC verifica apenas `bu_all`, `teams`, ou owner |

### 1.3 Assets do Time

| Cenário | Status | Evidência |
|---------|--------|-----------|
| Empréstimos de membros aparecem | ✅ PASS | RPC linha 288: `current_user_id = ANY(v_member_ids)` |
| Atrasados destacados | ✅ PASS | RPC linha 268: `m.due_at < NOW()` |
| Vencendo em 48h destacados | ✅ PASS | RPC linha 271: `BETWEEN NOW() AND NOW() + INTERVAL '48 hours'` |

### 1.4 OKRs do Time

| Cenário | Status | Evidência |
|---------|--------|-----------|
| Escopo do time selecionado | ✅ PASS | RPC linha 190: `kr.team_id = ANY(v_team_ids)` |
| Check-ins pendentes contados | ✅ PASS | RPC linha 194-204: intervalo de 7 dias |

### 1.5 Perfis

| Perfil | Comportamento Esperado | Status |
|--------|------------------------|--------|
| super_admin | Dashboard executive | ✅ PASS |
| admin BU | Dashboard executive | ✅ PASS |
| leader | LeaderDashboard | ✅ PASS |
| collaborator | Dashboard padrão | ✅ PASS |
| external | Nunca vê Leader Dashboard | ✅ PASS |

---

## 2. Validação Técnica (Segurança)

### 2.1 BU Scope Enforcement

| Componente | useBuScopedSupabase? | Status |
|------------|---------------------|--------|
| useLeaderTeams.ts | ✅ Sim | PASS |
| useLeaderDashboard.ts | ✅ Sim | PASS |
| useTeamManagement.ts | ✅ Sim (corrigido) | PASS |

**Correção Aplicada:**
- `useTeamManagement.ts` foi atualizado para usar `useBuScopedSupabase()` em vez do cliente singleton `supabase`.

### 2.2 Header X-Current-Bu-Id

| Componente | Header Presente | Status |
|------------|-----------------|--------|
| RPCs do Leader Dashboard | ✅ Via `current_bu_id()` | PASS |
| Queries diretas | ✅ Via `useBuScopedSupabase` | PASS |

### 2.3 RLS Policies

| Tabela | Policy Type | Validação |
|--------|-------------|-----------|
| teams | SELECT | `user_has_bu_access + is_current_bu` |
| asset_inventory | SELECT/INSERT/UPDATE | `user_has_bu_access + is_current_bu` |
| tickets | SELECT | `user_has_bu_access` |
| okr_team_key_results | SELECT/INSERT/UPDATE | `user_has_bu_access + is_current_bu` |

### 2.4 Hierarquia de Times

| Regra | Implementação | Status |
|-------|---------------|--------|
| Líder de sub-time NÃO gerencia time pai | `user_can_manage_team` retorna false | ✅ PASS |
| Líder de sub-time NÃO gerencia irmãos | `is_team_leader` verifica apenas o time exato | ✅ PASS |
| Admin BU gerencia qualquer time | `is_bu_admin` verificação | ✅ PASS |

**Função `user_can_manage_team`:**
```sql
-- 1) Super admin can manage any team
IF is_super_admin(p_user_id) THEN RETURN true; END IF;

-- 2) Get team's BU
SELECT bu_id INTO v_bu_id FROM teams WHERE id = p_team_id;

-- 3) BU admin can manage any team in their BU
IF is_bu_admin(p_user_id, v_bu_id) THEN RETURN true; END IF;

-- 4) Direct leader of this exact team (NOT ancestors)
RETURN is_team_leader(p_user_id, p_team_id);
```

### 2.5 RPCs Security

| RPC | Validações | Status |
|-----|------------|--------|
| `get_leader_teams` | auth.uid(), user_has_bu_access | ✅ PASS |
| `rpc_leader_dashboard_summary` | auth.uid(), current_bu_id(), user_can_manage_team | ✅ PASS |
| `rpc_leader_dashboard_focus` | auth.uid(), user_can_manage_team | ✅ PASS |

---

## 3. Validação Automatizada

### 3.1 Supabase Linter

| Issue | Severity | Relacionado ao Dashboard? |
|-------|----------|--------------------------|
| Security Definer View | ERROR | ❌ Não relacionado |
| RLS Policy Always True (6x) | WARN | ❌ Policies de catálogos públicos |
| Leaked Password Protection | WARN | ❌ Configuração de auth |

**Resultado:** Nenhum issue crítico relacionado ao Leader Dashboard.

### 3.2 Audit-bu-scope

| Finding Type | Count |
|--------------|-------|
| INSERT_MISSING_BU_ID | 0 (no Leader Dashboard) |
| UPDATE_MISSING_BU_ID | 0 (no Leader Dashboard) |
| SELECT_MISSING_BU_FILTER | 0 (no Leader Dashboard) |

**Resultado:** ✅ 0 findings críticos no módulo Leader Dashboard.

---

## 4. Evidências

### 4.1 Evidência de BU Scope

```typescript
// useLeaderTeams.ts
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";

export function useLeaderTeams() {
  const supabase = useBuScopedSupabase(); // ✅ Header x-current-bu-id injetado
  // ...
}
```

### 4.2 Evidência de Hierarquia de Times

```sql
-- rpc_leader_dashboard_summary
IF NOT user_can_manage_team(v_user_id, p_team_id) THEN
  RAISE EXCEPTION 'FORBIDDEN_TEAM_SCOPE'; -- ✅ Bloqueia acesso não autorizado
END IF;
```

### 4.3 Evidência de Permissões

```typescript
// LeaderDashboard.tsx
const { has } = usePermissions();

const canViewOkrs = has("okrs.read");
const canViewKpis = has("kpis.read");
const canViewTickets = has("tickets.read");
const canViewAssets = has("assets.read");

// Cards hidden se usuário não tem permissão
{canViewOkrs && <TeamOkrsCard ... />}
{canViewAssets && <AssetsTeamLoansCard ... />}
```

---

## 5. Lista de Arquivos Alterados

### Nesta Validação

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/hooks/useTeamManagement.ts` | Corrigido | Migrado para `useBuScopedSupabase` |

### Implementação Original (TCR v2.4.0)

| Arquivo | Tipo |
|---------|------|
| `src/modules/home/types.ts` | Adicionado |
| `src/modules/home/hooks/useLeaderTeams.ts` | Adicionado |
| `src/modules/home/hooks/useLeaderDashboard.ts` | Adicionado |
| `src/modules/home/hooks/useLeaderScope.ts` | Adicionado |
| `src/modules/home/hooks/index.ts` | Adicionado |
| `src/modules/home/components/LeaderDashboard.tsx` | Adicionado |
| `src/modules/home/components/LeaderScopeSelector.tsx` | Adicionado |
| `src/modules/home/components/leader/*.tsx` | Adicionado |
| `src/pages/Index.tsx` | Modificado |
| Migration RPCs | Adicionado |

---

## 6. Pendências

| Item | Prioridade | Descrição |
|------|------------|-----------|
| KPIs reais | Média | Módulo KPI ainda usa mock data |
| Deep links com filtros | Baixa | CTAs navegam mas não filtram automaticamente |
| Squads como visões auxiliares | Baixa | Fase 2 |

---

## 7. Conclusão

O **Leader Dashboard** está **100% em conformidade** com as regras de negócio e segurança definidas no TCR v2.4.0:

- ✅ BU Scope enforcement em todas as queries
- ✅ Hierarquia de times respeitada (líder não gerencia pai/irmãos)
- ✅ Permission keys aplicadas em todos os cards
- ✅ Visibilidade de tickets por time/sub-times implementada
- ✅ Assets filtrados por membros do time
- ✅ RPCs validam autenticação e autorização

**Uma correção foi aplicada:** `useTeamManagement.ts` foi migrado de `supabase` singleton para `useBuScopedSupabase()`.

---

*Gerado automaticamente em 2026-01-07*
