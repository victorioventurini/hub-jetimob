# Performance Sweep Report — Hub da Jet

**Data:** 2026-01-10  
**Versão:** 1.0.0  
**Status:** Parcialmente Concluído

---

## Resumo Executivo

Esta rodada focou na eliminação de `select('*')` nos principais módulos do Hub, seguindo as diretrizes do TCR e DEVELOPMENT_STANDARDS.md.

### Antes

| Métrica | Valor |
|---------|-------|
| Arquivos com `select('*')` | 30+ |
| Módulos afetados | OKRs, Assets, Tickets, Settings, Permissions |
| Edge Functions com overfetch | 3 |

### Depois (Correções Aplicadas)

| Módulo | Arquivos Corrigidos | Status |
|--------|---------------------|--------|
| OKRs | 3 | ✅ Concluído |
| Assets | 5 | ✅ Concluído |
| Tickets/Partners | 4 | ✅ Concluído |
| Core/Settings | Pendente | ⏳ P1 |
| Edge Functions | Pendente | ⏳ P1 |

---

## Correções Aplicadas

### Módulo OKRs

| Arquivo | Linha | Antes | Depois |
|---------|-------|-------|--------|
| `useOkrHealth.ts` | 78 | `select('*')` em okr_insights | Campos explícitos: id, bu_id, scope_type, scope_id, severity, code, title, message, suggested_actions, source, created_at |
| `useOkrHealth.ts` | 192 | `select('*')` em v_objective_health | Campos explícitos: id, objective_type, title, team_id, team_name, health_score, health_status, last_checkin_at, kr_count, kr_at_risk |
| `useOkrHealth.ts` | 219 | `select('*')` em okr_insights | Campos explícitos (mesmo que linha 78) |
| `useCycleData.ts` | 32, 75 | `select('*')` em cycles | Campos explícitos: id, name, type, start_date, end_date, planning_date, review_date, retro_date, parent_cycle_id |
| `CancelOkrDialog.tsx` | 84 | `select('*')` em okr_cancellation_reasons | Campos explícitos: id, code, label, description, applies_to, display_order |

### Módulo Assets

| Arquivo | Linha | Antes | Depois |
|---------|-------|-------|--------|
| `useAssetPermissions.ts` | 29, 45 | `select('*')` | Campos explícitos: id, bu_id, user_id, role, created_at, created_by, updated_at |
| `useCategories.ts` | 20 | `select('*')` | Campos explícitos: id, bu_id, name, parent_id, description, status, created_at, updated_at, deleted_at |
| `useInventory.ts` | 34 | `select('*')` em asset_categories | Campos explícitos |
| `useInventory.ts` | 226 | `select('*')` em asset_movements | Campos explícitos com todos campos de movimentação |
| `useKeys.ts` | 34, 61 | `select('*')` | Campos explícitos em clavicularies e hooks |
| `useGifts.ts` | 33 | `select('*')` | Campos explícitos: id, bu_id, name, category, status, notes, created_at, created_by, updated_at |

### Módulo Tickets/Partners

| Arquivo | Linha | Antes | Depois |
|---------|-------|-------|--------|
| `usePartners.ts` | 23, 45 | `select('*')` em partner_companies | Campos explícitos completos |
| `usePartnerServices.ts` | 71, 146 | `select('*')` em v_partner_services e partner_service_mappings | Campos explícitos |
| `useRoutingRules.ts` | 19 | `select('*')` | Campos explícitos: id, bu_id, partner_company_id, subcategory_id, assignee_contact_ids, watcher_contact_ids, notes, created_at, created_by, updated_at, deleted_at |

---

## Pendências (P1 - Alta Prioridade)

### Core/Settings (7 arquivos)

- `src/modules/bu/hooks/useBuData.ts` - lines 62, 82
- `src/pages/Modules.tsx` - line 121
- `src/pages/settings/SettingsModules.tsx` - line 95
- `src/pages/settings/SettingsIntegrations.tsx` - lines 27, 34
- `src/pages/settings/SettingsBusinessUnits.tsx` - line 33
- `src/modules/permissions/hooks/usePermissionGovernance.ts` - lines 106, 252, 287, 361

### Edge Functions (3 arquivos)

- `supabase/functions/process-agent-document/index.ts` - line 38
- `supabase/functions/culture-message/index.ts` - line 38
- `supabase/functions/_shared/instruction-sources.ts` - line 67

### Componentes com Timeline/ObjectiveTimeline

- `src/modules/okrs/components/ObjectiveTimeline.tsx` - lines 76, 94, 141
- `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx` - line 64
- `src/modules/okrs/components/settings/CyclesTab.tsx` - line 44

---

## Recomendações

### Imediatas

1. **Completar correções P1** nos arquivos de Settings e Edge Functions
2. **Adicionar staleTime** em hooks sem cache configurado
3. **Centralizar queryKeys** restantes

### Médio Prazo

1. **Criar índices** para queries frequentes (após EXPLAIN ANALYZE)
2. **RPCs agregadoras** para dashboards com múltiplas queries
3. **Paginação** em listas de alto volume (tickets, notifications, audit_logs)

---

## Scripts de Auditoria

Execute periodicamente para manter compliance:

```bash
# Overfetch
npx tsx scripts/audit-overfetch.ts

# QueryKeys centralizadas
npx tsx scripts/audit-querykeys.ts

# BU Scope
npx tsx scripts/audit-bu-scope.ts

# Identity Convention
npx tsx scripts/audit-identity-usage.ts
```

---

*Relatório gerado automaticamente durante varredura de performance.*
