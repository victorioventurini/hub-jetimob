# Schema Quick Reference

> **Auto-generated**: 2026-01-22  
> **Purpose**: Referência rápida de tabelas e colunas para validação antes de migrations.  
> **Regra**: Consultar ANTES de escrever qualquer SQL que referencie colunas.

---

## AI & Agents

### ai_agent_documents
`id, agent_id, name, description, file_url, file_type, file_size, processing_error, extracted_content, created_by, created_at, updated_at, status`

### ai_agent_instruction_sources
`id, agent_id, source_type, name, description, priority, is_enabled, config, last_fetch_at, last_fetch_status, last_fetch_error, cached_content, created_by, created_at, updated_at`

### ai_agent_logs
`id, agent_id, agent_name, scope, bu_id, user_id, integration_key, status, error_message, latency_ms, input_tokens, output_tokens, total_tokens, model_used, created_at, action_context`

### ai_agents
`id, scope, bu_id, integration_key, name, description, is_active, system_prompt, output_format, output_schema, allowed_tools, model_name, max_tokens, temperature, created_by, created_at, updated_at, slug`

---

## Areas

### areas
`id, bu_id, name, description, leader_user_id, co_leader_user_id, status, color, icon, created_at, updated_at, deleted_at`

---

## Assets

### asset_categories
`id, bu_id, name, parent_id, description, created_at, deleted_at, updated_at, status`

### asset_clavicularies
`id, bu_id, location_id, name, notes, created_at, created_by, updated_at, deleted_at, status`

### asset_gift_batches
`id, bu_id, gift_item_id, batch_code, acquired_at, quantity_in, quantity_available, cost_center, campaign, notes, created_at, created_by, updated_at, deleted_at`

### asset_gift_items
`id, bu_id, name, category, status, notes, created_at, created_by, updated_at, deleted_at`

### asset_gift_movements
`id, bu_id, gift_item_id, batch_id, movement_type, quantity, destination_type, destination_description, performed_by_user_id, occurred_at, notes, created_at`

### asset_group_items
`id, bu_id, group_id, asset_id, role, is_required, quantity, notes, created_at, updated_at, deleted_at`

### asset_groups
`id, bu_id, name, primary_asset_id, type, notes, status, created_at, created_by, updated_at, deleted_at`

### asset_hooks
`id, claviculary_id, hook_number, occupied, notes, created_at`

### asset_inventory
`id, bu_id, internal_code, name, category_id, description, status, home_location_id, current_holder_type, current_location_id, current_user_id, assigned_at, last_moved_at, acquired_at, acquisition_value, serial_number, brand, model, quantity_total, quantity_available, photos, documents, notes, created_at, created_by, updated_at, updated_by, deleted_at`

### asset_key_movements
`id, bu_id, keyring_id, movement_type, user_id, from_claviculary_id, from_hook_id, to_claviculary_id, to_hook_id, authorized_by_user_id, performed_by_user_id, occurred_at, due_at, notes, created_at`

### asset_keyrings
`id, bu_id, claviculary_id, hook_id, name, tag_number, status, current_user_id, notes, created_at, created_by, updated_at, deleted_at`

### asset_keys
`id, bu_id, keyring_id, tag_number, description, access_type, status, notes, created_at, created_by, updated_at, deleted_at`

### asset_movements
`id, bu_id, asset_id, movement_type, from_holder_type, from_location_id, from_user_id, to_holder_type, to_location_id, to_user_id, authorized_by_user_id, performed_by_user_id, occurred_at, due_at, returned_at, notes, created_at`

### asset_permissions
`id, bu_id, user_id, role, created_at, created_by, updated_at`

---

## Audit & Logs

### app_error_logs
`id, user_id, bu_id, module, action, error_code, message, stack, metadata, created_at`

### audit_logs
`id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at`

### cron_execution_logs
`id, ran_at, duration_ms, outbox_processed, outbox_sent, outbox_failed, health_alerts_created, health_alerts_resolved, error_message, correlation_id, created_at, status`

---

## Automation

### automation_action_catalog
`id, action_key, category, name, description, action_version, payload_schema, payload_example, required_fields, is_active, created_at, updated_at`

### automation_connection_events
`id, connection_id, event_key, is_active, created_at`

### automation_connections
`id, name, description, bu_id, scope, webhook_url, http_method, headers_encrypted, auth_type, auth_config_encrypted, is_active, retry_count, timeout_ms, created_by, created_at, updated_at`

### automation_event_catalog
`id, event_key, category, name, description, event_version, payload_schema, payload_example, scope, is_active, created_at, updated_at`

### automation_incoming_tokens
`id, name, description, token_hash, bu_id, scope, allowed_actions, rate_limit_per_minute, is_active, last_used_at, expires_at, created_by, created_at, updated_at`

### automation_logs
`id, type, event_key, action_key, connection_id, token_id, bu_id, user_id, status, status_code, request_payload, response_payload, error_message, latency_ms, retry_attempt, created_at`

---

## BU (Business Units)

### bu_units
`id, name, description, legal_entity, allowed_email_domains, status, created_at, updated_at, cnpj, logo_url, symbol_url, primary_color, secondary_color`

### bu_agent_activations
`id, bu_id, agent_id, is_enabled, custom_system_prompt, enabled_by, created_at, updated_at`

### bu_ia_config
`id, bu_id, ia_enabled, ia_mode, max_calls_per_user_day, max_calls_per_bu_day, created_at, updated_at`

### bu_integrations_config
`id, bu_id, integration_key, is_enabled_in_bu, config_mode, config_override_encrypted, last_test_status, last_test_message, last_test_at, updated_by, created_at, updated_at`

### bu_locations
`id, bu_id, name, type, status, is_default, formatted_address, address_line_1, address_line_2, district, city, state, country, postal_code, latitude, longitude, google_place_id, timezone, notes, created_at, created_by, updated_at, updated_by, deleted_at, parent_location_id`

### bu_module_configs
`id, bu_id, module_id, is_enabled, enabled_at, enabled_by, disabled_at, disabled_by, created_at, updated_at`

### bu_notification_channels
`id, bu_id, channel_slug, is_enabled, config, created_at, updated_at`

### bu_notification_event_settings
`id, bu_id, event_slug, channel, is_enabled, created_at, updated_at`

### bu_user_memberships
`id, user_id, bu_id, role_in_bu, is_default, created_at, updated_at, profile_id, deleted_at, job_title_id`

### bu_user_permission_overrides
`id, bu_id, user_id, permission_id, effect, created_at`

### bu_user_permission_templates_v2
`id, bu_id, user_id, template_id, created_at, created_by`

---

## Cycles

### cycles
`id, name, start_date, end_date, planning_date, review_date, retro_date, parent_cycle_id, created_at, updated_at, bu_id, type`

---

## Hub Integrations

### hub_integrations_catalog
`id, integration_key, name, description, icon, color, supports_global_config, supports_bu_override, supports_agents, status, display_order, documentation_url, created_at, updated_at`

### hub_integrations_global_config
`id, integration_key, is_enabled_global, config_encrypted, last_test_status, last_test_message, last_test_at, updated_by, created_at, updated_at`

---

## Job Titles

### job_titles
`id, name, description, is_active, created_at, updated_at, deleted_at, bu_ids`

---

## KPIs

### kpi_metrics
`id, name, description, category, owner_user_id, team_id, unit, direction, frequency, target_value, status, created_at, updated_at, deleted_at, bu_id, is_global`

### kpi_values
`id, kpi_id, value, reference_date, source, notes, created_by, created_at`

---

## Mentions

### mentions
`id, bu_id, entity_type, entity_id, mentioned_user_id, mentioned_contact_id, created_at, created_by`

---

## Modules

### modules
`id, name, slug, description, version, owner_user_id, status, health_status, icon, route, created_at, updated_at, type, dependencies, display_order`

---

## Notifications

### notification_channels
`id, slug, name, description, icon, requires_configuration, config_schema, status, display_order, created_at, updated_at`

### notification_deliveries
`id, notification_id, channel, status, sent_at, error_message, retry_count, created_at`

### notification_events
`id, slug, module, name, description, audience, severity, is_mandatory, default_channels, icon, created_at, updated_at`

### notification_health_alert_actions
`id, alert_id, action, actor_profile_id, notes, created_at`

### notification_health_alerts
`id, bu_id, alert_type, severity, detected_at, resolved_at, metadata, is_active, last_notified_at, cooldown_minutes, escalation_level, consecutive_occurrences, created_at, updated_at`

### notification_health_runbooks
`id, alert_type, severity, markdown_content, created_at, updated_at`

### notification_outbox
`id, bu_id, user_id, event_slug, channel_slug, payload, status, retries, max_retries, next_retry_at, last_error, processed_at, created_at, dedupe_key, sent_at, provider`

### notification_template_audit_log
`id, template_id, version_id, action, actor_id, changes, created_at`

### notification_template_variables
`id, event_slug, variable_key, variable_label, variable_type, description, example_value, is_required, created_at`

### notification_template_versions
`id, template_id, version, subject, body, variables_used, created_by, created_at, is_approved, approved_by, approved_at`

### notification_templates
`id, event_slug, channel, subject_template, body_template, version, is_active, created_at, updated_at, bu_id, current_version_id`

### notifications
`id, user_id, bu_id, type, title, message, context_type, context_id, context_url, actor_id, is_read, read_at, created_at, event_slug, metadata`

---

## OKRs

### okr_audit_log
`id, entity, entity_id, action, old_value, new_value, user_id, created_at`

### okr_cancellation_reasons
`id, code, label, description, applies_to, display_order, is_active`

### okr_checkins
`id, kr_id, date, previous_value, current_value, confidence, blockers, comments, user_id, created_at, team_id, bu_id`

### okr_coaching_events
`id, bu_id, user_id, context_type, context_id, agent_slug, insight_id, event_type, payload, created_at, deleted_at`

### okr_contributions
`id, from_type, from_id, to_type, to_id, bu_id, description, created_at, created_by, deleted_at`

### okr_dependencies
`id, kr_id, depends_on_team_id, depends_on_kr_id, description, status, created_at, updated_at`

### okr_initiatives
`id, name, description, kr_id, bu_id, owner_user_id, status, priority, start_date, expected_end_date, progress, contributors, notes, created_at, updated_at, deleted_at`

### okr_insights
`id, bu_id, scope_type, scope_id, severity, code, title, message, suggested_actions, source, created_at, created_by, deleted_at`

### okr_kr_metrics
`id, kr_id, kr_type, kpi_id, role, created_at, created_by, deleted_at`

### okr_notifications_log
`id, type, channel, target, payload, sent_at, status, error_message`

### okr_objective_reviews
`id, objective_id, objective_type, review_type, reviewed_by, reviewed_at, changes_summary, notes, bu_id, created_at`

### okr_org_key_results
`id, org_objective_id, title, metric_id, baseline, current_value, target, direction, unit, owner_user_id, status, created_at, updated_at, deleted_at, bu_id, cancellation_reason, cancellation_learning, cancelled_at, cancelled_by`

### okr_org_objectives
`id, title, description, year, owner_user_id, status, created_at, updated_at, deleted_at, bu_id, cycle_id, start_date, end_date, cancellation_reason, cancellation_learning, cancelled_at, cancelled_by, health_score, health_status, last_health_calculated_at`

### okr_reports_config
`id, name, frequency, audience, content_blocks, channels, is_active, created_by, created_at, updated_at`

### okr_team_key_results
`id, team_objective_id, parent_kr_id, team_id, title, type, metric_id, baseline, current_value, target, direction, unit, owner_user_id, co_responsibles, linked_org_kr_id, status, evidence_url, created_at, updated_at, deleted_at, bu_id, last_checkin_at, cancellation_reason, cancellation_learning, cancelled_at, cancelled_by`

### okr_team_objective_contributors
`id, objective_id, team_id, created_at`

### okr_team_objectives
`id, team_id, org_objective_id, cycle_id, title, description, owner_user_id, status, created_at, updated_at, deleted_at, bu_id, is_shared, responsibility_model, year, cycle_type, cancellation_reason, cancellation_learning, cancelled_at, cancelled_by, last_reviewed_at, next_review_due, review_notes, health_score, health_status, last_health_calculated_at, kr_count, avg_progress`

### okr_wizard_kr_actions
`id, session_id, kr_id, action_type, notes, created_at`

### okr_wizard_sessions
`id, bu_id, cycle_id, team_id, wizard_type, started_by, started_at, completed_at, decisions, action_items, ai_insights_shown, reflection_data, meeting_notes, created_at, updated_at, status`

---

## Partners

### partner_companies
`id, bu_id, name, legal_name, allowed_domains, status, notes, created_at, created_by, updated_at, deleted_at, person_type, document, document_type`

### partner_company_bu_associations
`id, partner_company_id, bu_id, is_active, notes, created_at, created_by, updated_at, deleted_at, default_contact_ids, supervisor_profile_ids`

> **supervisor_profile_ids** (v2.75.0): Array de profiles.id que supervisionam esta empresa parceira na BU. Supervisores são automaticamente adicionados como watchers em novos tickets externos via trigger `trg_auto_add_supervisors`.

### partner_contact_bu_associations
`id, partner_contact_id, bu_id, is_active, notes, created_at, created_by, updated_at, deleted_at`

### partner_contact_capabilities
`id, bu_id, partner_company_id, contact_id, category_id, subcategory_id, is_active, created_at, created_by, updated_at, deleted_at`

### partner_contacts ⚠️
`id, bu_id, partner_company_id, profile_user_id, name, email, phone, status, created_at, created_by, updated_at, deleted_at, user_id`

> ⚠️ **ATENÇÃO**: Não possui coluna `role`!

### partner_service_mappings
`id, bu_id, partner_company_id, category_id, subcategory_id, status, notes, created_at, created_by, updated_at, deleted_at`

---

## Performance

### perf_metrics_snapshots
`id, collected_at, metrics, summary, created_by`

---

## Permissions

### permission_audit_log
`id, bu_id, target_user_id, actor_id, action, entity_type, entity_id, entity_name, before_state, after_state, reason, created_at`

### permission_catalog
`id, key, module, resource, action, scope, description, status, created_at, updated_at`

### permission_migrations
`id, bu_id, user_id, status, v1_groups_snapshot, v2_templates_applied, migrated_at, migrated_by, verified_at, verified_by, notes, created_at, updated_at`

### permission_presets
`id, slug, name, description, module, surface, icon, sort_order, is_active, created_at, updated_at`

### permission_template_items_v2
`template_id, permission_key, created_at`

### permission_templates_v2
`id, slug, name, description, surface, module, is_system, version, created_at, updated_at`

---

## Profiles

### profiles
`id, user_id, first_name, last_name, display_name, work_email, team_id, manager_user_id, work_mode, city, state, start_date, employment_status, photo_url, whatsapp_personal, birth_day, birth_month, created_at, updated_at, deleted_at, instagram_id, bu_id, onboarding_completed, discord_id, job_title_id, global_status, user_type, email`

---

## Squads

### squad_memberships
`id, squad_id, user_id, role, created_at, updated_at, bu_id, deleted_at`

### squad_teams
`id, squad_id, team_id, created_at`

### squads
`id, name, description, bu_id, products, status, created_at, updated_at, deleted_at`

---

## System

### system_settings
`key, value, description, created_at, updated_at`

---

## Teams

### teams
`id, name, description, leader_user_id, parent_team_id, status, created_at, updated_at, deleted_at, bu_id, checkin_frequency, checkin_day, checkin_deadline_hour, member_count, area_id`

### user_team_memberships
`id, user_id, team_id, is_primary, created_at, updated_at`

> ⚠️ **ATENÇÃO**: Não possui coluna `is_active`! Membership é implícita pela existência do registro.

---

## Tickets

### ticket_attachments
`id, bu_id, ticket_id, message_id, file_url, file_name, file_size, mime_type, uploaded_by_user_id, created_at, deleted_at`

### ticket_categories
`id, bu_id, scope, name, description, status, created_at, created_by, updated_at, deleted_at`

### ticket_internal_routing_rules
`id, bu_id, category_id, subcategory_id, assignee_user_ids, assignee_team_ids, assignee_squad_ids, watcher_user_ids, watcher_team_ids, watcher_squad_ids, priority, notes, created_at, created_by, updated_at, deleted_at`

### ticket_messages
`id, bu_id, ticket_id, author_type, author_user_id, author_contact_id, body_richtext, created_at, edited_at, deleted_at, is_pinned, pinned_at, pinned_by_user_id, reply_to_message_id`

> ⚠️ **reply_to_message_id** (v2.73.0): FK self-referencing para suportar replies estilo WhatsApp. Null se não for resposta a outra mensagem.

### ticket_participants
`id, bu_id, ticket_id, participant_type, profile_id, partner_contact_id, role, is_active, created_at`

### ticket_routing_rules
`id, bu_id, partner_company_id, subcategory_id, assignee_contact_ids, watcher_contact_ids, notes, created_at, created_by, updated_at, deleted_at`

### ticket_subcategories
`id, bu_id, category_id, name, status, created_at, created_by, updated_at, deleted_at`

### tickets
`id, bu_id, type, title, status, expected_due_at, created_by_user_id, owner_user_id, visibility, visibility_team_ids, visibility_squad_ids, visibility_user_ids, partner_company_id, category_id, subcategory_id, external_assignee_contact_ids, created_at, updated_at, deleted_at, assigned_contact_id, assignment_source`

---

## User Preferences

### user_notification_preferences_v2
`id, user_id, bu_id, event_slug, channel_slug, enabled, created_at, updated_at`

### user_preferences
`id, user_id, theme, email_notifications, slack_notifications, weekly_digest, two_factor_enabled, created_at, updated_at`

### user_roles
`id, user_id, role, created_at, updated_at`

### user_saved_links
`id, user_id, bu_id, module_slug, label, path, is_favorite, created_at, updated_at`

---

## Notas Importantes

| Tabela | Observação |
|--------|------------|
| `partner_contacts` | ⚠️ Não possui `role` |
| `user_team_memberships` | ⚠️ Não possui `is_active` |
| `profiles` | Usa `employment_status` para status, não `is_active` |
| `bu_user_memberships` | Usa `deleted_at` para soft-delete, não `is_active` |
