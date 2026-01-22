# Database Legacy Audit Report

**Data:** 2026-01-08  
**Autor:** Auditoria Automatizada  
**Versão:** 1.0

---

## Sumário Executivo

Esta auditoria analisou 92 tabelas no schema `public` do banco de dados Supabase, identificando problemas de estrutura, segurança (RLS), convenções e uso.

**Estatísticas:**
- Total de tabelas: 92
- Tabelas com RLS: 92 (100%)
- Tabelas operacionais sem `bu_id`: 22
- Tabelas vazias (0 registros): 41
- Funções SQL: 70+
- Views: 7
- Triggers identificados: ~15

---

## 1. Tabelas Suspeitas ou Legadas

### 1.1 Tabelas Operacionais sem `bu_id`

Estas tabelas são operacionais mas não possuem coluna `bu_id`, violando o padrão BU-scope:

| Tabela | Tipo | Problema | Risco | Ação Sugerida |
|--------|------|----------|-------|---------------|
| `ai_agent_documents` | Operacional | Sem `bu_id` | Médio | Adicionar `bu_id` via FK do agent |
| `asset_hooks` | Operacional | Sem `bu_id` | Baixo | Deriva do `claviculary_id` pai |
| `automation_connection_events` | Operacional | Sem `bu_id` | Baixo | Deriva de `connection_id` |
| `hub_integrations_global_config` | Meta/Global | Sem `bu_id` | Nenhum | ✅ Correto - é global |
| `kpi_values` | Operacional | Sem `bu_id` | Alto | Adicionar ou derivar via FK |
| `metrics` | Operacional | Sem `bu_id` | Médio | Adicionar `bu_id` |
| `notification_channels` | Meta/Global | Sem `bu_id` | Nenhum | ✅ Correto - catálogo global |
| `notification_deliveries` | Operacional | Sem `bu_id` | Médio | Deriva de notification |
| `notification_events` | Meta/Global | Sem `bu_id` | Nenhum | ✅ Correto - catálogo global |
| `notification_templates` | Meta/Global | Sem `bu_id` | Nenhum | ✅ Correto - templates globais |
| `okr_audit_log` | Operacional | Sem `bu_id` | Médio | Adicionar para auditoria BU-scoped |
| `okr_cancellation_reasons` | Meta/Global | Sem `bu_id` | Nenhum | ✅ Correto - catálogo |
| `okr_dependencies` | Operacional | Sem `bu_id` | Médio | Derivar de objectives |
| `okr_kr_metrics` | Operacional | Sem `bu_id` | Alto | Adicionar `bu_id` |
| `okr_notifications_log` | Operacional | Sem `bu_id` | Baixo | Log de sistema |
| `okr_reports_config` | Operacional | Sem `bu_id` | Médio | Adicionar `bu_id` |
| `okr_team_objective_contributors` | Operacional | Sem `bu_id` | Alto | Adicionar `bu_id` |
| `squad_memberships` | Operacional | Sem `bu_id` | Médio | Derivar de squad |
| `squad_teams` | Operacional | Sem `bu_id` | Médio | Derivar de squad |
| `user_notification_preferences` | Operacional | Sem `bu_id` | Médio | É por usuário, pode derivar |
| `user_preferences` | Operacional | Sem `bu_id` | Baixo | Preferências globais do user |
| `user_team_memberships` | Operacional | Sem `bu_id` | Alto | Adicionar `bu_id` |

### 1.2 Tabelas com Volume Muito Baixo ou Vazias

| Tabela | Registros | Classificação | Observação |
|--------|-----------|---------------|------------|
| `asset_keys` | 0 | SUSPECT | Funcionalidade não utilizada |
| `automation_connections` | 0 | SUSPECT | Feature não lançada |
| `automation_connection_events` | 0 | SUSPECT | Feature não lançada |
| `automation_incoming_tokens` | 0 | SUSPECT | Feature não lançada |
| `automation_logs` | 0 | SUSPECT | Feature não lançada |
| `notifications` | 0 | ACTIVE | Sistema novo, sem dados ainda |
| `notification_deliveries` | 0 | ACTIVE | Sistema novo |
| `notification_outbox` | 0 | ACTIVE | Outbox transacional |
| `mentions` | 0 | ACTIVE | Sistema novo |
| `user_notification_preferences` | 0 | LEGACY | Substituída por v2 |
| `user_notification_preferences_v2` | 0 | ACTIVE | Sistema novo |
| `okr_initiatives` | 0 | ACTIVE | Feature subutilizada |
| `okr_checkins` | 0 | ACTIVE | Ciclo não iniciado |
| `okr_coaching_events` | 0 | SUSPECT | Feature não lançada |
| `okr_insights` | 0 | ACTIVE | Gerados sob demanda |
| `okr_contributions` | 0 | ACTIVE | Feature de contribuições |
| `okr_dependencies` | 0 | SUSPECT | Feature não utilizada |
| `ticket_messages` | 0 | ACTIVE | Sistema novo |
| `ticket_attachments` | 0 | ACTIVE | Sistema novo |
| `ticket_mentions` | 0 | ACTIVE | Sistema novo |
| `ticket_routing_rules` | 0 | ACTIVE | Ainda não configurado |
| `ticket_participants` | 0 | ACTIVE | Sistema novo |
| `asset_groups` | 0 | ACTIVE | Feature de kits |
| `asset_group_items` | 0 | ACTIVE | Feature de kits |
| `asset_gift_items` | 0 | ACTIVE | Feature de brindes |
| `asset_gift_batches` | 0 | ACTIVE | Feature de brindes |
| `asset_gift_movements` | 0 | ACTIVE | Feature de brindes |
| `asset_key_movements` | 0 | ACTIVE | Movimentações de chaves |
| `bu_agent_activations` | 0 | ACTIVE | IA por BU |
| `bu_integrations_config` | 0 | ACTIVE | Config por BU |
| `bu_ia_config` | 0 | ACTIVE | Config IA por BU |
| `bu_notification_channels` | 0 | ACTIVE | Canais por BU |
| `bu_user_permission_overrides` | 0 | ACTIVE | Overrides de permissão |
| `kpi_metrics` | 0 | ACTIVE | KPIs não configurados |
| `kpi_values` | 0 | ACTIVE | Sem valores ainda |
| `app_error_logs` | 0 | ACTIVE | Log de erros |
| `squad_memberships` | 0 | SUSPECT | Squads subutilizados |
| `metrics` | 0 | OBSOLETE | Tabela legada |

### 1.3 Tabelas Bem Populadas (Referência)

| Tabela | Registros | Status |
|--------|-----------|--------|
| `asset_inventory` | 407 | ACTIVE |
| `audit_logs` | 375 | ACTIVE |
| `permission_group_permissions` | 327 | ACTIVE |
| `permission_catalog` | 143 | ACTIVE |
| `asset_categories` | 111 | ACTIVE |
| `job_titles` | 71 | ACTIVE |
| `profiles` | 63 | ACTIVE |
| `ticket_subcategories` | 42 | ACTIVE |
| `automation_event_catalog` | 37 | ACTIVE |

---

## 2. Colunas Suspeitas ou Inconsistentes

### 2.1 Colunas Potencialmente Sempre NULL

Muitas colunas nullable foram identificadas. As mais suspeitas:

| Tabela | Coluna | Tipo | Observação |
|--------|--------|------|------------|
| `profiles` | `job_title` | text | LEGACY - substituída por `job_title_id` |
| `profiles` | `cpf` | text | Não utilizado atualmente |
| `ai_agents` | `slug` | text | Opcional, pouco usado |
| `asset_inventory` | `serial_number` | text | Opcional |
| `asset_inventory` | `acquisition_value` | numeric | Raramente preenchido |

### 2.2 Colunas Redundantes ou Legadas

| Tabela | Coluna | Problema | Ação |
|--------|--------|----------|------|
| `profiles.job_title` | Substituída por FK | LEGACY | Deprecar após migração |

---

## 3. Views SQL

| View | Status | Uso | Ação |
|------|--------|-----|------|
| `identity_rls_violations` | ACTIVE | Auditoria RLS | Manter |
| `user_effective_permissions` | ACTIVE | RBAC | Manter |
| `v_bu_null_audit_*` | ACTIVE | Auditoria BU | Manter |
| `v_pending_checkins` | ACTIVE | OKRs | Manter |

---

## 4. Funções SQL

### 4.1 Funções Críticas (ACTIVE)

| Função | Uso |
|--------|-----|
| `get_my_permissions` | RBAC - RPC |
| `get_manageable_teams` | Teams - RPC |
| `calculate_objective_health` | OKRs - RPC |
| `emit_notification_event` | Notificações - RPC |
| `is_bu_member` | RLS |
| `is_bu_admin` | RLS |
| `has_role` | RLS |
| `has_permission` | RLS |
| `my_profile_id` | RLS/Identity |
| `current_bu_id` | BU-scope |
| `enforce_bu_scope` | Trigger |

### 4.2 Funções Suspeitas

| Função | Problema | Status |
|--------|----------|--------|
| `apply_ticket_assignment` | Uso não confirmado | SUSPECT |

---

## 5. Triggers

### 5.1 Triggers Ativos

| Tabela | Trigger | Função |
|--------|---------|--------|
| `profiles` | `audit_profile_changes_trigger` | `audit_profile_changes` |
| `teams` | `audit_team_membership_trigger` | `audit_team_membership_changes` |
| `*` (muitas) | `enforce_bu_scope_*` | `enforce_bu_scope` |
| `*` (muitas) | `update_*_updated_at` | `update_updated_at_column` |

---

## 6. Recomendações Prioritárias

### Alta Prioridade (Wave 1)
1. ✅ Todas as tabelas têm RLS habilitado
2. ⚠️ Adicionar `bu_id` em `okr_team_objective_contributors`
3. ⚠️ Adicionar `bu_id` em `okr_kr_metrics`
4. ⚠️ Adicionar `bu_id` em `user_team_memberships`

### Média Prioridade (Wave 2)
1. Deprecar `profiles.job_title` (texto) em favor de `job_title_id`
2. Revisar tabela `metrics` - provavelmente OBSOLETE
3. Avaliar necessidade de `okr_dependencies`

### Baixa Prioridade (Wave 3)
1. Remover tabelas de automação se feature não for lançada
2. Consolidar `user_notification_preferences` com v2

---

## Anexo: Exceptions de BU-Scope

Conforme `scripts/audit-bu-exceptions.json`:
```json
{
  "tables": [
    "profiles",
    "bu_units",
    "bu_user_memberships",
    "permission_catalog",
    "permission_groups",
    "permission_group_permissions",
    "modules",
    "hub_integrations_catalog",
    "automation_event_catalog",
    "automation_action_catalog"
  ],
  "reason": "global/meta tables - não escopadas por BU"
}
```

Estas tabelas são legitimamente globais e não precisam de `bu_id`.
