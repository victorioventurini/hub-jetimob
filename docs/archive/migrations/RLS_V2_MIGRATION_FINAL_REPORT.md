# RLS V2 Migration — Final Report

**Data:** 2026-01-12 (atualizado 2026-01-21)  
**Status:** ✅ 100% Completo + Auditoria de Segurança  
**TCR Version:** v2.48.0

> 📋 **Auditoria de segurança:** [RLS_SECURITY_AUDIT_2026-01-21.md](./RLS_SECURITY_AUDIT_2026-01-21.md) — 6 correções críticas aplicadas

---

## 1. Resumo Executivo

A migração de RLS V2 foi concluída com sucesso. Todas as 79 tabelas do Hub agora usam o padrão V2 de permissões baseado em `has_permission()` e `is_profile_bu_member()`.

### Antes (V1 - Legado)
```sql
-- Padrão antigo usando funções legadas
CREATE POLICY "old_policy" ON table
  FOR INSERT WITH CHECK (
    is_bu_admin(auth.uid(), bu_id) OR 
    is_platform_admin(auth.uid()) OR
    has_role(auth.uid(), 'admin')
  );
```

### Depois (V2 - Atual)
```sql
-- Padrão novo usando permission keys
CREATE POLICY "new_policy" ON table
  FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

CREATE POLICY "new_policy" ON table
  FOR INSERT WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'module.entity.create:scope')
  );
```

---

## 2. Tabelas Migradas por Módulo

### Assets (14 tabelas)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `asset_inventory` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_categories` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_movements` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_groups` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_group_items` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_clavicularies` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_hooks` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_keyrings` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_keys` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_key_movements` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_gift_items` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_gift_batches` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_gift_movements` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `asset_permissions` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |

### OKRs (12 tabelas)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `okr_org_objectives` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `okr_org_key_results` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `okr_team_objectives` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `okr_team_key_results` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `okr_checkins` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `okr_initiatives` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `okr_contributions` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `okr_kr_metrics` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `okr_objective_reviews` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `okr_wizard_sessions` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `cycles` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `okr_reports_config` | ✅ global | ✅ has_permission | ✅ has_permission | ✅ has_permission |

### KPIs (2 tabelas)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `kpi_metrics` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `kpi_values` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |

### Tickets (8 tabelas)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `tickets` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `ticket_messages` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `ticket_participants` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `ticket_attachments` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `ticket_views` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `ticket_categories` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `ticket_subcategories` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `ticket_sla_configs` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |

### Teams (5 tabelas)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `teams` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `squads` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `user_team_memberships` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `squad_memberships` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `team_objectives_limits` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |

### Profiles (1 tabela)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `profiles` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |

### Notifications (2 tabelas)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `notifications` | ✅ recipient_id = my_profile_id | ✅ has_permission | ✅ recipient_id = my_profile_id | ✅ has_permission |
| `notification_preferences` | ✅ profile_id = my_profile_id | ✅ profile_id = my_profile_id | ✅ profile_id = my_profile_id | ✅ has_permission |

### Automations (4 tabelas)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `automation_connections` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `automation_connection_events` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `automation_incoming_tokens` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `automation_logs` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |

### Partners (4 tabelas)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `partner_companies` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `partner_contacts` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `partner_categories` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `partner_tags` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |

### AI/Agents (6 tabelas)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `ai_agents` | ✅ is_profile_bu_member/public | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `ai_agent_documents` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `ai_agent_instruction_sources` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `ai_agent_logs` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `bu_agent_activations` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `bu_ia_config` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |

### BU Config (8 tabelas)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `bu_units` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `bu_locations` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `bu_user_memberships` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `bu_user_permission_overrides` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `bu_user_permission_templates_v2` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `bu_integrations_config` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `bu_module_configs` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |
| `notification_health_alerts` | ✅ is_profile_bu_member | ✅ has_permission | ✅ has_permission | ✅ has_permission |

### Global/Infra (13 tabelas)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `user_roles` | ✅ global | ✅ has_permission:global | ✅ has_permission:global | ✅ has_permission:global |
| `permission_catalog` | ✅ authenticated | ✅ has_permission:global | ✅ has_permission:global | ✅ has_permission:global |
| `permission_templates_v2` | ✅ authenticated | ✅ has_permission:global | ✅ has_permission:global | ✅ has_permission:global |
| `permission_template_permissions_v2` | ✅ authenticated | ✅ has_permission:global | ✅ has_permission:global | ✅ has_permission:global |
| `permission_migrations` | ✅ global | ✅ has_permission:global | ✅ has_permission:global | ✅ has_permission:global |
| `audit_logs` | ✅ global | ✅ has_permission:global | ✅ has_permission:global | ✅ has_permission:global |
| `app_error_logs` | ✅ global | ✅ authenticated | N/A | N/A |
| `modules` | ✅ authenticated | ✅ has_permission:global | ✅ has_permission:global | ✅ has_permission:global |
| `system_settings` | ✅ global | ✅ has_permission:global | ✅ has_permission:global | ✅ has_permission:global |
| `hub_integrations_catalog` | ✅ authenticated | ✅ has_permission:global | ✅ has_permission:global | ✅ has_permission:global |
| `hub_integrations_global_config` | ✅ global | ✅ has_permission:global | ✅ has_permission:global | ✅ has_permission:global |
| `cron_execution_logs` | ✅ global | ✅ service_role | N/A | N/A |
| `notification_outbox` | ✅ service_role | ✅ service_role | ✅ service_role | ✅ service_role |

---

## 3. Funções RLS V2 Atualizadas

### `has_permission(profile_id, bu_id, permission_key)`
Função principal de avaliação de permissões. Recebe `profile_id` (não `auth.uid()`).

### `is_profile_bu_member(profile_id, bu_id)`
Verifica se o profile é membro da BU. Usada para policies SELECT.

### `my_profile_id()`
Retorna o `profiles.id` do usuário logado.

---

## 4. Anti-patterns Eliminados

| ❌ Legado | ✅ V2 |
|-----------|------|
| `is_bu_admin(auth.uid(), bu_id)` | `has_permission(my_profile_id(), bu_id, 'module.manage:bu')` |
| `is_platform_admin(auth.uid())` | `has_permission(my_profile_id(), null, 'admin.manage:global')` |
| `has_role(auth.uid(), 'admin')` | `has_permission(my_profile_id(), bu_id, 'module.action:scope')` |
| `role_in_bu = 'admin'` | `has_permission(my_profile_id(), bu_id, 'module.action:scope')` |
| `user_has_bu_access(auth.uid(), bu_id)` | `is_profile_bu_member(my_profile_id(), bu_id)` |

---

## 5. Migrations Executadas

1. `20260112121700_migrate_teams_rls_to_v2.sql` - Teams module
2. `20260112122015_*.sql` - Profiles, Notifications, Automations
3. `20260112122119_*.sql` - Extended Teams, BU Locations, Cycles, Partners
4. `20260112122247_*.sql` - Cleanup legacy + AI/Agents
5. `20260112122626_*.sql` - Remaining infra/global tables

---

## 6. Próximos Passos (Manutenção)

1. **Novas tabelas** DEVEM seguir padrão V2 desde o início
2. **Auditar** periodicamente com script `audit-rls-policies.ts` (a criar)
3. **Documentar** qualquer exceção em comentário SQL
4. **Testar** policies com diferentes perfis de usuário

---

*Migração concluída em 2026-01-12. Documento gerado automaticamente.*
