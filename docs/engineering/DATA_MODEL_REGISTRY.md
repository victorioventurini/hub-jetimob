# Data Model Registry — Hub da Jet

**Gerado em:** 2026-01-15T11:47:00.000Z  
**Versão do Generator:** 1.2.0  
**Versão do TCR:** 2.35.0  
**Project ID:** oiwnghihyqdsinouwmga

> ⚠️ **FONTE ÚNICA DE VERDADE**
> Este arquivo é gerado automaticamente do banco de dados.
> NÃO edite manualmente. Regenere com:
> ```bash
> npx tsx scripts/generate-data-model-registry.ts
> ```

---

## Tabelas (public schema)

Lista completa das tabelas no schema `public`:

| Tabela | RLS | BU-Scoped | Descrição |
|--------|-----|-----------|-----------|
| `ai_agent_documents` | ✅ | ✅ | Documentos de agentes IA |
| `ai_agent_instruction_sources` | ✅ | ✅ | Fontes de instrução de agentes |
| `ai_agent_logs` | ✅ | ✅ | Logs de execução de agentes |
| `ai_agents` | ✅ | ✅ | Configuração de agentes IA |
| `app_error_logs` | ✅ | ✅ | Logs de erros da aplicação |
| `areas` | ✅ | ✅ | Áreas organizacionais |
| `asset_categories` | ✅ | ✅ | Categorias de ativos |
| `asset_clavicularies` | ✅ | ✅ | Claviculários (porta-chaves) |
| `asset_gift_batches` | ✅ | ✅ | Lotes de brindes |
| `asset_gift_items` | ✅ | ✅ | Itens de brinde |
| `asset_gift_movements` | ✅ | ✅ | Movimentações de brindes |
| `asset_group_items` | ✅ | ✅ | Itens de grupos de ativos |
| `asset_groups` | ✅ | ✅ | Grupos de ativos (kits) |
| `asset_hooks` | ✅ | ✅ | Ganchos de claviculário |
| `asset_inventory` | ✅ | ✅ | Inventário de ativos |
| `asset_key_movements` | ✅ | ✅ | Movimentações de chaves |
| `asset_keyrings` | ✅ | ✅ | Chaveiros |
| `asset_keys` | ✅ | ✅ | Chaves |
| `asset_movements` | ✅ | ✅ | Movimentações de ativos |
| `asset_permissions` | ✅ | ✅ | Permissões de ativos |
| `audit_logs` | ✅ | ❌ | Logs de auditoria (global) |
| `automation_action_catalog` | ✅ | ❌ | Catálogo de ações de automação |
| `automation_connection_events` | ✅ | ✅ | Eventos de conexões |
| `automation_connections` | ✅ | ✅ | Conexões de automação |
| `automation_event_catalog` | ✅ | ❌ | Catálogo de eventos |
| `automation_incoming_tokens` | ✅ | ✅ | Tokens de entrada |
| `automation_logs` | ✅ | ✅ | Logs de automação |
| `bu_agent_activations` | ✅ | ✅ | Ativações de agentes por BU |
| `bu_ia_config` | ✅ | ✅ | Configuração IA por BU |
| `bu_integrations_config` | ✅ | ✅ | Configuração de integrações por BU |
| `bu_locations` | ✅ | ✅ | Localizações/sedes da BU |
| `bu_module_configs` | ✅ | ✅ | Configuração de módulos por BU |
| `bu_notification_channels` | ✅ | ✅ | Canais de notificação por BU |
| `bu_notification_event_settings` | ✅ | ✅ | Configurações de eventos por BU |
| `bu_units` | ✅ | ❌ | Business Units (global) |
| `bu_user_memberships` | ✅ | ✅ | Memberships usuário ↔ BU |
| `bu_user_permission_overrides` | ✅ | ✅ | Overrides de permissão |
| `bu_user_permission_templates_v2` | ✅ | ✅ | Templates V2 por usuário |
| `cron_execution_logs` | ✅ | ❌ | Logs de execução cron |
| `cycles` | ✅ | ✅ | Ciclos (OKRs) |
| `hub_integrations_catalog` | ✅ | ❌ | Catálogo de integrações |
| `hub_integrations_global_config` | ✅ | ❌ | Config global de integrações |
| `job_titles` | ✅ | ✅ | Cargos |
| `kpi_metrics` | ✅ | ✅ | Métricas KPI |
| `kpi_values` | ✅ | ✅ | Valores de KPI |
| `mentions` | ✅ | ✅ | Menções (entity_type + entity_id) |
| `modules` | ✅ | ❌ | Módulos do sistema |
| `notification_channels` | ✅ | ❌ | Canais de notificação |
| `notification_deliveries` | ✅ | ✅ | Entregas de notificação |
| `notification_events` | ✅ | ❌ | Eventos de notificação |
| `notification_health_alert_actions` | ✅ | ✅ | Ações em alertas de saúde |
| `notification_health_alerts` | ✅ | ✅ | Alertas de saúde |
| `notification_health_runbooks` | ✅ | ✅ | Runbooks de saúde |
| `notification_outbox` | ✅ | ✅ | Outbox de notificações |
| `notification_template_audit_log` | ✅ | ✅ | Audit log de templates |
| `notification_template_variables` | ✅ | ✅ | Variáveis de templates |
| `notification_template_versions` | ✅ | ✅ | Versões de templates |
| `notification_templates` | ✅ | ✅ | Templates de notificação |
| `notifications` | ✅ | ✅ | Notificações |
| `okr_audit_log` | ✅ | ✅ | Audit log de OKRs |
| `okr_cancellation_reasons` | ✅ | ✅ | Motivos de cancelamento |
| `okr_checkins` | ✅ | ✅ | Check-ins de KRs |
| `okr_coaching_events` | ✅ | ✅ | Eventos de coaching |
| `okr_contributions` | ✅ | ✅ | Contribuições OKR |
| `okr_dependencies` | ✅ | ✅ | Dependências OKR |
| `okr_initiatives` | ✅ | ✅ | Iniciativas |
| `okr_insights` | ✅ | ✅ | Insights de OKR |
| `okr_kr_metrics` | ✅ | ✅ | Métricas de KR |
| `okr_notifications_log` | ✅ | ✅ | Log de notificações OKR |
| `okr_objective_reviews` | ✅ | ✅ | Reviews de objetivos |
| `okr_org_key_results` | ✅ | ✅ | KRs organizacionais |
| `okr_org_objectives` | ✅ | ✅ | Objetivos organizacionais |
| `okr_reports_config` | ✅ | ✅ | Configuração de relatórios |
| `okr_team_key_results` | ✅ | ✅ | KRs de time |
| `okr_team_objective_contributors` | ✅ | ✅ | Contribuidores de objetivos |
| `okr_team_objectives` | ✅ | ✅ | Objetivos de time |
| `okr_wizard_kr_actions` | ✅ | ✅ | Ações do wizard de KR |
| `okr_wizard_sessions` | ✅ | ✅ | Sessões do wizard de OKR |
| `partner_companies` | ✅ | ✅ | Empresas parceiras |
| `partner_contact_capabilities` | ✅ | ✅ | Capacidades de contatos |
| `partner_contacts` | ✅ | ✅ | Contatos de parceiros |
| `partner_service_mappings` | ✅ | ✅ | Mapeamento de serviços |
| `perf_metrics_snapshots` | ❌ | ❌ | Snapshots de métricas de performance (P4) |
| `permission_audit_log` | ✅ | ✅ | Audit log de permissões |
| `permission_catalog` | ✅ | ❌ | Catálogo de permissões |
| `permission_migrations` | ✅ | ✅ | Migrações de permissões |
| `permission_presets` | ✅ | ❌ | Presets de permissões |
| `permission_template_items_v2` | ✅ | ❌ | Items de template de permissão |
| `permission_templates_v2` | ✅ | ❌ | Templates de permissão V2 |
| `profiles` | ✅ | ✅ | Perfis de usuários |
| `squad_memberships` | ✅ | ✅ | Membros de squads |
| `squad_teams` | ✅ | ✅ | Relacionamento squad ↔ teams |
| `squads` | ✅ | ✅ | Squads |
| `system_settings` | ✅ | ❌ | Configurações do sistema |
| `teams` | ✅ | ✅ | Times |
| `ticket_attachments` | ✅ | ✅ | Anexos de tickets |
| `ticket_categories` | ✅ | ✅ | Categorias de tickets |
| `ticket_internal_routing_rules` | ✅ | ✅ | Regras de roteamento interno |
| `ticket_messages` | ✅ | ✅ | Mensagens de tickets |
| `ticket_participants` | ✅ | ✅ | Participantes de tickets |
| `ticket_routing_rules` | ✅ | ✅ | Regras de roteamento |
| `ticket_subcategories` | ✅ | ✅ | Subcategorias de tickets |
| `tickets` | ✅ | ✅ | Tickets |
| `user_notification_preferences_v2` | ✅ | ✅ | Preferências de notificação V2 |
| `user_preferences` | ✅ | ✅ | Preferências do usuário |
| `user_roles` | ✅ | ❌ | Roles globais |
| `user_saved_links` | ✅ | ✅ | Links salvos por usuário/módulo (v2.36.0) |
| `user_team_memberships` | ✅ | ✅ | Membros de times |

**Total:** 108 tabelas

---

## Views

| View | Descrição |
|------|-----------|
| `identity_rls_violations` | Violações de identity em RLS |
| `users_without_v2_permissions` | Usuários sem permissões V2 |
| `v_ai_agents_public` | Agentes IA públicos |
| `v_bu_active_profiles` | Perfis ativos por BU (view canônica para User Directory) |
| `v_bu_all_profiles_admin` | Todos os perfis da BU (admin) |
| `v_bu_id_null_report` | Relatório de bu_id NULL |
| `v_bu_memberships_active` | Memberships ativas |
| `v_notification_delivery_health` | Saúde de entregas |
| `v_notification_failures` | Falhas de notificação |
| `v_notification_slo_by_channel_daily` | SLO por canal (diário) |
| `v_notification_slo_by_event_daily` | SLO por evento (diário) |
| `v_notification_slo_summary_7d` | Resumo SLO 7 dias |
| `v_objective_health` | Saúde de objetivos |
| `v_okr_insights_active` | Insights ativos |
| `v_partner_services` | Serviços de parceiros |
| `v_pending_checkins` | Check-ins pendentes |
| `v_perf_indexes_report` | Relatório de índices |
| `v_permission_risk_report` | Relatório de riscos de permissão |
| `v_permissions_without_explanation` | Permissões sem explicação |
| `v_profiles_directory` | Diretório de perfis |
| `v_shared_okrs_summary` | Resumo de OKRs compartilhados |
| `v_team_contributed_okrs` | OKRs com contribuição de times |
| `v_users_without_templates` | Usuários sem templates |

**Total:** 23 views

---

## Enums

| Enum | Valores |
|------|---------|
| `agent_output_format` | `text`, `json` |
| `agent_scope` | `global`, `bu` |
| `app_role` | `super_admin`, `admin`, `collaborator`, `external` |
| `asset_group_item_role` | `primary`, `accessory` |
| `asset_group_status` | `active`, `inactive` |
| `asset_group_type` | `kit`, `bundle` |
| `asset_holder_type` | `location`, `user` |
| `asset_inventory_status` | `available`, `loaned`, `maintenance`, `written_off` |
| `asset_movement_type` | `checkout`, `return`, `transfer`, `maintenance_start`, `maintenance_end`, `write_off` |
| `asset_permission_role` | `assets_admin`, `inventory_admin`, `inventory_manager`, `keys_admin`, `keys_manager`, `gifts_admin`, `gifts_manager`, `viewer` |
| `automation_log_status` | `pending`, `success`, `error`, `timeout` |
| `automation_log_type` | `webhook`, `incoming`, `scheduled` |
| `bu_location_status` | `active`, `inactive` |
| `bu_location_type` | `headquarters`, `office`, `warehouse`, `remote_hub`, `other`, `room` |
| `bu_status` | `active`, `inactive` |
| `catalog_status` | `active`, `inactive` |
| `cron_status` | `started`, `success`, `failed`, `error`, `timeout` |
| `cycle_type` | `year`, `quarter`, `month`, `sprint`, `custom` |
| `document_processing_status` | `pending`, `processing`, `completed`, `error` |
| `employment_status` | `active`, `vacation`, `terminated`, `external` |
| `gift_destination_type` | `event`, `campaign`, `person`, `other` |
| `gift_item_status` | `active`, `inactive` |
| `gift_movement_type` | `in`, `out`, `adjustment` |
| `initiative_priority` | `low`, `medium`, `high` |
| `initiative_status` | `planned`, `in_progress`, `blocked`, `completed` |
| `instruction_source_type` | `api`, `document`, `hub_context`, `template` |
| `integration_config_mode` | `use_global`, `override` |
| `integration_test_status` | `ok`, `error`, `pending` |
| `key_access_type` | `door`, `padlock`, `gate`, `other` |
| `key_movement_type` | `checkout`, `return`, `transfer`, `lost`, `retired` |
| `key_status` | `in_claviculary`, `loaned`, `lost`, `retired` |
| `keyring_status` | `available`, `loaned`, `lost`, `retired` |
| `kpi_category` | `financeiro`, `growth`, `cs`, `produto`, `operacoes`, `pessoas` |
| `kpi_direction` | `up`, `down` |
| `kpi_frequency` | `daily`, `weekly`, `monthly`, `quarterly` |
| `kpi_status` | `active`, `inactive` |
| `kpi_value_source` | `manual`, `integration`, `calculation` |
| `migration_status` | `pending`, `in_progress`, `completed`, `failed`, `rolled_back` |
| `module_health` | `healthy`, `degraded`, `down` |
| `module_status` | `active`, `inactive`, `coming_soon` |
| `module_type` | `global`, `operational` |
| `notification_audience` | `internal`, `external`, `both` |
| `notification_channel` | `internal`, `email`, `slack`, `whatsapp` |
| `notification_delivery_status` | `pending`, `sent`, `failed`, `skipped` |
| `notification_outbox_status` | `pending`, `processing`, `sent`, `failed`, `cancelled` |
| `notification_severity` | `info`, `warning`, `critical` |
| `notification_type` | `mention`, `checkin_created`, `checkin_overdue`, `kr_status_changed`, `shared_okr_update`, `info`, `system`, `alert` |
| `okr_channel` | `email`, `slack`, `both` |
| `okr_confidence` | `high`, `medium`, `low` |
| `okr_contribution_entity_type` | `objective`, `kr` |
| `okr_dependency_status` | `ok`, `blocked`, `at_risk` |
| `okr_direction` | `up`, `down` |
| `okr_kr_type` | `contribution`, `enabler`, `foundational` |
| `okr_metric_role` | `primary`, `guardrail` |
| `okr_rag_status` | `green`, `yellow`, `red`, `not_started` |
| `okr_report_frequency` | `weekly`, `monthly`, `quarterly`, `event` |
| `okr_status` | `draft`, `active`, `completed`, `cancelled`, `discarded` |
| `partner_company_status` | `active`, `inactive` |
| `partner_contact_status` | `active`, `inactive` |
| `partner_service_status` | `active`, `inactive` |
| `permission_effect` | `allow`, `deny` |
| `permission_scope` | `self`, `self_or_owner`, `team`, `team_tree`, `squad`, `bu`, `global`, `public` |
| `squad_product` | `crm`, `cms`, `erp` |
| `squad_role` | `product_owner`, `tech_lead`, `ux_ui_lead`, `member` |
| `team_status` | `active`, `inactive` |
| `ticket_author_type` | `internal_user`, `partner_contact` |
| `ticket_category_scope` | `internal`, `external`, `both` |
| `ticket_participant_role` | `requester`, `assignee`, `watcher` |
| `ticket_participant_type` | `internal_user`, `partner_contact` |
| `ticket_status` | `waiting_client`, `open`, `in_progress`, `waiting`, `resolved`, `closed` |
| `work_mode` | `remote`, `hybrid`, `onsite` |

**Total:** 70 enums

---

## Identity Map

### Colunas que armazenam `profiles.id` (PROFILE_ID)

> ⚠️ **ATENÇÃO:** Apesar do nome `_user_id`, estas colunas referenciam `profiles.id`, NÃO `auth.users.id`.
> Ver: [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md)

| Tabela | Coluna | FK Explícita | Notas |
|--------|--------|--------------|-------|
| `areas` | `leader_user_id` | ✅ → `profiles.id` | Líder da área |
| `areas` | `co_leader_user_id` | ✅ → `profiles.id` | Co-líder da área |
| `teams` | `leader_user_id` | ✅ → `profiles.id` | Líder do time |
| `squads` | `leader_user_id` | ✅ → `profiles.id` | Líder do squad |
| `squad_memberships` | `user_id` | ✅ → `profiles.id` | Membro do squad |
| `user_team_memberships` | `user_id` | ✅ → `profiles.id` | Membro do time |
| `okr_team_objectives` | `owner_user_id` | ✅ → `profiles.id` | Owner do objetivo |
| `okr_team_key_results` | `owner_user_id` | ✅ → `profiles.id` | Owner do KR |
| `okr_org_objectives` | `owner_user_id` | ✅ → `profiles.id` | Owner do objetivo org |
| `okr_org_key_results` | `owner_user_id` | ✅ → `profiles.id` | Owner do KR org |
| `okr_initiatives` | `owner_user_id` | ✅ → `profiles.id` | Owner da iniciativa |
| `okr_checkins` | `user_id` | ✅ → `profiles.id` | Quem fez check-in |
| `kpi_metrics` | `owner_user_id` | ✅ → `profiles.id` | Owner do KPI |
| `tickets` | `created_by_user_id` | ✅ → `profiles.id` | Criador do ticket |
| `tickets` | `assigned_user_id` | ✅ → `profiles.id` | Responsável |
| `ticket_messages` | `performed_by_user_id` | ✅ → `profiles.id` | Autor da mensagem |
| `asset_inventory` | `current_user_id` | ✅ → `profiles.id` | Possuidor atual |
| `asset_inventory` | `created_by` | ❌ (inferido) | Criador |
| `asset_inventory` | `updated_by` | ❌ (inferido) | Atualizador |
| `asset_movements` | `from_user_id` | ✅ → `profiles.id` | Origem |
| `asset_movements` | `to_user_id` | ✅ → `profiles.id` | Destino |
| `asset_movements` | `performed_by_user_id` | ✅ → `profiles.id` | Executor |
| `asset_movements` | `authorized_by_user_id` | ✅ → `profiles.id` | Autorizador |
| `asset_keyrings` | `current_user_id` | ❌ (inferido) | Possuidor atual |
| `asset_key_movements` | `user_id` | ❌ (inferido) | Usuário |
| `asset_key_movements` | `performed_by_user_id` | ❌ (inferido) | Executor |
| `asset_key_movements` | `authorized_by_user_id` | ❌ (inferido) | Autorizador |
| `asset_gift_movements` | `performed_by_user_id` | ❌ (inferido) | Executor |
| `mentions` | `mentioned_user_id` | ✅ → `profiles.id` | Usuário mencionado |
| `profiles` | `manager_user_id` | ❌ (inferido) | Gestor direto |
| `partner_contacts` | `profile_user_id` | ❌ (inferido) | Perfil vinculado |
| `notification_health_alert_actions` | `actor_profile_id` | ✅ → `profiles.id` | Ator |
| `bu_user_permission_templates_v2` | `user_id` | ✅ → `profiles.id` | Usuário |
| `bu_user_permission_templates_v2` | `created_by` | ✅ → `profiles.id` | Criador |
| `permission_audit_log` | `target_user_id` | ❌ (inferido) | Alvo |

### Colunas que armazenam `auth.users.id` (AUTH_USER_ID)

| Tabela | Coluna | Uso |
|--------|--------|-----|
| `profiles` | `user_id` | Link profile → auth.users |
| `bu_user_memberships` | `user_id` | Membership usa auth id |
| `bu_user_memberships` | `profile_id` | Referência ao profile |
| `user_roles` | `user_id` | Roles globais via auth id |
| `audit_logs` | `user_id` | Auditoria usa auth id |
| `notifications` | `user_id` | Notificações via auth id |
| `notification_outbox` | `user_id` | Outbox via auth id |
| `ai_agent_logs` | `user_id` | Logs de agente (auth id) |
| `app_error_logs` | `user_id` | Logs de erro (auth id) |
| `automation_logs` | `user_id` | Logs de automação (auth id) |
| `permission_migrations` | `user_id` | Migração de permissões (auth id) |

---

## Funções SQL Canônicas

### Identidade

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `my_profile_id()` | `uuid` | Retorna `profiles.id` do usuário logado |
| `my_profile_id_strict()` | `uuid` | Idem, lança exceção se não existir |
| `profile_id_from_user_id(uuid)` | `uuid` | Converte auth id → profile id |
| `user_id_from_profile_id(uuid)` | `uuid` | Converte profile id → auth id |
| `assert_profile_identity(uuid)` | `boolean` | Valida que profile_id pertence ao usuário |
| `current_profile_id()` | `uuid` | Alias para my_profile_id() |

### BU Scope

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `current_bu_id()` | `uuid` | Retorna BU do contexto (header) |
| `is_current_bu(uuid)` | `boolean` | Verifica se bu_id = contexto |
| `assert_bu_scope(uuid)` | `boolean` | Trigger: valida bu_id |
| `enforce_bu_scope()` | `trigger` | Trigger function para enforcement |

### Autorização

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `is_platform_admin(uuid)` | `boolean` | É super_admin ou admin global |
| `is_super_admin(uuid)` | `boolean` | É super_admin |
| `is_bu_admin(uuid, uuid)` | `boolean` | É admin da BU |
| `is_bu_member(uuid, uuid)` | `boolean` | Tem membership na BU |
| `has_role(uuid, app_role)` | `boolean` | Possui role específica |
| `has_permission(uuid, uuid, text)` | `boolean` | Tem permission key |
| `get_my_permissions(uuid)` | `text[]` | Lista permissions do usuário |
| `check_scope_access(uuid, text, jsonb)` | `boolean` | Verifica acesso por scope |

### Hierarquia de Times

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `is_team_leader(uuid, uuid)` | `boolean` | É líder direto do time |
| `team_is_ancestor(uuid, uuid)` | `boolean` | Time é ancestral |
| `team_is_descendant(uuid, uuid)` | `boolean` | Time é descendente |
| `user_can_manage_team(uuid, uuid)` | `boolean` | Pode gerenciar time |
| `get_manageable_teams(uuid, uuid)` | `uuid[]` | Times gerenciáveis |
| `can_manage_team_okr(uuid, uuid)` | `boolean` | Pode gerenciar OKR do time |

### OKRs

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `get_cycle_checkins(uuid, uuid, uuid)` | `table` | Check-ins do ciclo |
| `get_team_kr_history(uuid)` | `table` | Histórico de KR |
| `calculate_kr_progress(...)` | `numeric` | Calcula progresso do KR |
| `calculate_objective_health(...)` | `jsonb` | Calcula saúde do objetivo |

### Notificações

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `emit_notification_event(...)` | `SETOF uuid` | Emite evento de notificação |
| `send_test_notification_v2(uuid)` | `boolean` | Envia notificação de teste |
| `resolve_work_email(uuid)` | `text` | Resolve email de trabalho |
| `resolve_notification_recipient(uuid)` | `jsonb` | Resolve destinatário completo |

### Assets

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `can_manage_asset_inventory(uuid, uuid)` | `boolean` | Pode gerenciar inventário |
| `can_manage_inventory(uuid, uuid)` | `boolean` | Pode movimentar inventário |
| `can_manage_keys(uuid, uuid)` | `boolean` | Pode gerenciar chaves |
| `can_manage_gifts(uuid, uuid)` | `boolean` | Pode gerenciar brindes |
| `has_asset_permission(uuid, uuid, text[])` | `boolean` | Verifica permissão de assets |

### Tickets

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `can_view_ticket(uuid, uuid)` | `boolean` | Pode ver ticket |

### Performance (P4)

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `collect_perf_metrics()` | `jsonb` | Coleta métricas de performance |
| `cleanup_old_perf_snapshots()` | `integer` | Remove snapshots antigos (>90 dias) |

---

## Triggers Padrão

| Trigger | Tabelas | Função | Descrição |
|---------|---------|--------|-----------|
| `update_*_updated_at` | Todas | `update_updated_at_column()` | Auto-update de `updated_at` |
| `trg_enforce_bu_scope_*` | BU-scoped | `enforce_bu_scope()` | Valida bu_id no insert/update |
| `trg_set_bu_id_*` | Algumas | Específica | Auto-preenche bu_id de FK |

---

## Regras de Uso

### ❌ PROIBIDO

- Inventar nomes de tabela/view/função
- Usar nomes que não existam neste registry
- Assumir estrutura de coluna sem verificar
- Comparar `auth.uid()` diretamente com colunas de domínio (ex: `owner_user_id = auth.uid()`)
- Usar `profiles.email` (não existe; usar `profiles.work_email`)

### ✅ OBRIGATÓRIO

- Consultar este registry antes de escrever SQL
- Usar funções canônicas (`my_profile_id()`, `current_bu_id()`)
- Respeitar identity map (profile_id vs auth_user_id)
- Regenerar registry após migrations

---

## Como Regenerar

```bash
# Com variáveis de ambiente
SUPABASE_URL="https://xxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
npx tsx scripts/generate-data-model-registry.ts
```

O script:
1. Conecta ao banco via Supabase client
2. Extrai metadados de `information_schema` e `pg_catalog`
3. Gera `DATA_MODEL_REGISTRY.md` e `.json`
4. Classifica colunas de identidade

---

*Gerado automaticamente do banco de dados em 2026-01-15. Não edite manualmente.*
