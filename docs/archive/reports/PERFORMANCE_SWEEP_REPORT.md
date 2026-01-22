# Performance Sweep Report — Hub da Jet

**Data:** 2026-01-10  
**Versão:** 2.0.0  
**Status:** ✅ P1 Concluído

---

## Resumo Executivo

Esta rodada focou na eliminação de `select('*')` nos principais módulos do Hub, seguindo as diretrizes do TCR e DEVELOPMENT_STANDARDS.md.

### Antes

| Métrica | Valor |
|---------|-------|
| Arquivos com `select('*')` | 30+ |
| Módulos afetados | OKRs, Assets, Tickets, Settings, Permissions |
| Edge Functions com overfetch | 3 |

### Depois (Todas Correções Aplicadas)

| Módulo | Arquivos Corrigidos | Status |
|--------|---------------------|--------|
| OKRs | 6 | ✅ Concluído |
| Assets | 5 | ✅ Concluído |
| Tickets/Partners | 4 | ✅ Concluído |
| Core/Settings | 5 | ✅ Concluído |
| Edge Functions | 3 | ✅ Concluído |
| Permissions | 1 | ✅ Concluído |
| **TOTAL** | **24** | ✅ |

---

## P1 Closure (2026-01-10)

### Arquivos Corrigidos nesta Wave

#### Settings Pages

| Arquivo | Correções |
|---------|-----------|
| `src/modules/bu/hooks/useBuData.ts` | 2 ocorrências: `useBuUnit()`, `useAllBus()` → campos explícitos em bu_units |
| `src/pages/settings/SettingsModules.tsx` | 1 ocorrência: modules → `id, slug, name, description, type, status, route, display_order, icon` |
| `src/pages/settings/SettingsBusinessUnits.tsx` | 1 ocorrência: bu_units → campos explícitos |
| `src/pages/settings/SettingsIntegrations.tsx` | 2 ocorrências: hub_integrations_catalog e hub_integrations_global_config → campos explícitos |
| `src/modules/permissions/hooks/usePermissionGovernance.ts` | 4 ocorrências: permission_presets, v_permission_risk_report, permission_audit_log, v_users_without_templates → campos explícitos |

#### Edge Functions

| Arquivo | Correções |
|---------|-----------|
| `supabase/functions/process-agent-document/index.ts` | ai_agent_documents → `id, agent_id, name, file_url, file_type, file_size, status` |
| `supabase/functions/culture-message/index.ts` | ai_agents → `id, scope, bu_id, integration_key, name, system_prompt, output_format, model_name, max_tokens, temperature` |
| `supabase/functions/_shared/instruction-sources.ts` | ai_agent_instruction_sources → campos explícitos |

#### OKRs Timeline/Wizards

| Arquivo | Correções |
|---------|-----------|
| `src/modules/okrs/components/ObjectiveTimeline.tsx` | 3 ocorrências: objective, okr_audit_log (+ limit 100), okr_objective_reviews (+ limit 50) |
| `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx` | okr_initiatives → campos explícitos |
| `src/modules/okrs/components/settings/CyclesTab.tsx` | cycles → campos explícitos |

### Principais Melhorias Aplicadas

1. **Eliminação de overfetch**: Substituídos 18+ `select('*')` por campos explícitos
2. **Limites adicionados**: ObjectiveTimeline agora tem LIMIT 100 em audit_logs e LIMIT 50 em reviews
3. **Edge Functions otimizadas**: Payload reduzido significativamente
4. **Views mapeadas corretamente**: v_permission_risk_report e v_users_without_templates com colunas corretas

---

## Correções Wave Anterior

### Módulo OKRs

| Arquivo | Linha | Antes | Depois |
|---------|-------|-------|--------|
| `useOkrHealth.ts` | 78 | `select('*')` em okr_insights | Campos explícitos |
| `useOkrHealth.ts` | 192 | `select('*')` em v_objective_health | Campos explícitos |
| `useCycleData.ts` | 32, 75 | `select('*')` em cycles | Campos explícitos |
| `CancelOkrDialog.tsx` | 84 | `select('*')` em okr_cancellation_reasons | Campos explícitos |

### Módulo Assets

| Arquivo | Linha | Antes | Depois |
|---------|-------|-------|--------|
| `useAssetPermissions.ts` | 29, 45 | `select('*')` | Campos explícitos |
| `useCategories.ts` | 20 | `select('*')` | Campos explícitos |
| `useInventory.ts` | 34, 226 | `select('*')` | Campos explícitos |
| `useKeys.ts` | 34, 61 | `select('*')` | Campos explícitos |
| `useGifts.ts` | 33 | `select('*')` | Campos explícitos |

### Módulo Tickets/Partners

| Arquivo | Linha | Antes | Depois |
|---------|-------|-------|--------|
| `usePartners.ts` | 23, 45 | `select('*')` | Campos explícitos |
| `usePartnerServices.ts` | 71, 146 | `select('*')` | Campos explícitos |
| `useRoutingRules.ts` | 19 | `select('*')` | Campos explícitos |

---

## Status Final

### ✅ Concluído

- [x] Módulo OKRs (6 arquivos)
- [x] Módulo Assets (5 arquivos)
- [x] Módulo Tickets/Partners (4 arquivos)
- [x] Settings Pages (5 arquivos)
- [x] Edge Functions (3 arquivos)
- [x] Permissions Hooks (1 arquivo)

### Pendências P2 (Próxima Wave)

1. **Paginação**: Adicionar paginação em listas de alto volume (notifications, audit_logs gerais)
2. **Índices**: Criar índices após EXPLAIN ANALYZE em queries frequentes
3. **RPCs agregadoras**: Para dashboards com múltiplas queries simultâneas
4. **staleTime otimizado**: Revisar configuração de cache em hooks restantes

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

*Relatório atualizado em 2026-01-10 após closure do P1.*
