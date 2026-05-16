# DB Functions Index — Hub da Jet

> **Auto-gerado** • 236 funções públicas em `public.*` • Última geração: 2026-04-22

Este índice agrupa todas as funções armazenadas no banco por domínio funcional.
Funções marcadas com **[CANONICAL]** são as preferidas para novo código.
Funções marcadas com **[DEPRECATED]** ou **[LEGACY]** não devem ser usadas em código novo.

Para regenerar: `psql -c "..." > /tmp/db_functions.csv && python3 scripts/build-db-index.py`

---

## Sumário

| Domínio | Funções |
|---------|--------:|
| [Permissões / RBAC](#permissões--rbac) | 21 |
| [Perfis / Identidade](#perfis--identidade) | 40 |
| [Business Units](#business-units) | 12 |
| [OKRs](#okrs) | 21 |
| [Rituais](#rituais) | 5 |
| [KPIs / Métricas](#kpis--métricas) | 10 |
| [Projetos](#projetos) | 6 |
| [Tickets / Menções](#tickets--menções) | 27 |
| [Notificações](#notificações) | 16 |
| [Times / Áreas](#times--áreas) | 13 |
| [Assets / Chaves / Brindes](#assets--chaves--brindes) | 18 |
| [Parceiros / Externos](#parceiros--externos) | 7 |
| [Análises / Relatórios](#análises--relatórios) | 1 |
| [IA / Agentes](#ia--agentes) | 1 |
| [Cron / Jobs](#cron--jobs) | 1 |
| [Auditoria / Logs](#auditoria--logs) | 3 |
| [Triggers / Helpers internos](#triggers--helpers-internos) | 1 |
| [Outros / Utilitários](#outros--utilitários) | 33 |
| **Total** | **236** |

---

## Permissões / RBAC

### `auto_assign_leader_permissions()`

_Sem descrição._

### `check_permission_scope_access(p_user_id uuid, p_bu_id uuid, p_scope permission_scope, p_ctx jsonb DEFAULT '{}'::jsonb)`

Validates user access within a specific permission scope. Extracted from user_has_permission_ctx() for modularity.

### `explain_permission(p_user_id uuid, p_bu_id uuid, p_permission_key text)`

_Sem descrição._

### `get_effective_permissions_v2(p_user_id uuid, p_bu_id uuid)`

_Sem descrição._

### `get_my_permissions(p_bu_id uuid)`

V2-only: Returns permission keys for current user in specified BU. No V1 compatibility, no aliases.

### `get_permission_diff(p_user_id uuid, p_bu_id uuid, p_new_template_ids uuid[])`

_Sem descrição._

### `get_permission_scope(p_permission_key text)`

Helper function to retrieve permission scope from catalog. Used by user_has_permission_ctx() and other RBAC functions.

### `get_user_permissions_for_impersonation(p_target_profile_id uuid, p_bu_id uuid)`

Returns the permission keys for a target user in a specific BU.

### `has_any_asset_permission(p_user_id uuid)`

Verifica se usuário tem qualquer permissão do módulo assets

### `has_asset_permission(p_user_id uuid, p_bu_id uuid, p_roles asset_permission_role[])`

_Sem descrição._

### `has_permission(p_user_id uuid, p_bu_id uuid, p_permission_key text)`

V2-Only permission check. Receives profile_id, not auth.users.id. Checks templates and overrides.

### `has_permission_key(p_user_id uuid, p_bu_id uuid, p_permission_key text)`

_Sem descrição._

### `has_role(_user_id uuid, _role app_role)`

_Sem descrição._

### `is_bu_admin(p_user_id uuid, p_bu_id uuid)`

Checks if a user is BU admin. Accepts either profile_id or auth.users.id for backward compatibility. Prefers direct profile_id lookup.

### `is_bu_member(p_user_id uuid, p_bu_id uuid)`

[DEPRECATED] Legacy function with canary. Use is_profile_bu_member(profile_id, bu_id) instead.

### `is_platform_admin(_user_id uuid)`

[SECURITY DEFINER] [AUTHZ] Verifica se usuário é platform_admin.

### `is_profile_bu_admin(p_profile_id uuid, p_bu_id uuid)`

Verifica se profile é admin de uma BU. Uso preferencial em código novo.

### `is_profile_bu_member(p_profile_id uuid, p_bu_id uuid)`

Verifica se profile é membro de uma BU. Uso preferencial em código novo.

### `log_permission_change(p_bu_id uuid, p_target_user_id uuid, p_action text, p_entity_type text, p_entity_id uuid DEFAULT NULL::uuid, p_entity_na…)`

Writes permission audit log. actor_id is profiles.id (domain).

### `user_has_permission(p_user_id uuid, p_bu_id uuid, p_permission_key text)`

V2-Only permission check. Legacy wrapper - use has_permission() for new code.

### `user_has_permission_ctx(p_user_id uuid, p_bu_id uuid, p_permission_key text, p_ctx jsonb DEFAULT '{}'::jsonb)`

Verifies if user has permission with contextual scope validation. Refactored to use helper functions for modularity. TCR v2.64.0 compliant.

---

## Perfis / Identidade

### `add_user_bu_access(target_user_id uuid, target_bu_id uuid, p_role_in_bu text DEFAULT 'collaborator'::text, p_is_default boolean DEFAULT fal…)`

_Sem descrição._

### `assert_profile_identity(p_profile_id uuid)`

Runtime guard: validates that a profile_id exists.

### `audit_profile_changes()`

_Sem descrição._

### `count_user_calls_today(p_user_id uuid, p_bu_id uuid)`

_Sem descrição._

### `current_profile_id()`

[SECURITY DEFINER] [CORE] Retorna profiles.id do usuário autenticado.

### `get_auth_user_id(p_profile_id uuid)`

Converte profiles.id (profile_id) para auth.users.id (user_id)

### `get_bu_users_by_membership(p_bu_id uuid, p_search text DEFAULT NULL::text, p_team_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'active'::text,…)`

_Sem descrição._

### `get_global_users_admin(p_search text DEFAULT NULL::text, p_bu_id uuid DEFAULT NULL::uuid, p_onboarding_status text DEFAULT NULL::text, p_user_t…)`

_Sem descrição._

### `get_global_users_admin(p_search text DEFAULT NULL::text, p_bu_id uuid DEFAULT NULL::uuid, p_onboarding_status text DEFAULT NULL::text, p_user_t…)`

_Sem descrição._

### `get_global_users_admin(p_search text DEFAULT NULL::text, p_bu_id uuid DEFAULT NULL::uuid, p_onboarding_status text DEFAULT NULL::text, p_user_t…)`

_Sem descrição._

### `get_global_users_admin(p_search text DEFAULT NULL::text, p_bu_id uuid DEFAULT NULL::uuid, p_onboarding_status text DEFAULT NULL::text, p_user_t…)`

_Sem descrição._

### `get_profile_bus(p_profile_id uuid)`

Retorna todas as BUs de um profile com role e default.

### `get_profile_default_bu(p_profile_id uuid)`

[IDENTITY v3.0] Profile-first equivalent of get_user_default_bu. Returns default BU for profile.

### `get_profile_id(p_user_id uuid)`

ALIAS for profile_id_from_user_id(). Maintained for backward compatibility.

### `get_profile_with_privacy(p_profile_id uuid)`

Returns profile data with field-level privacy controls.

### `get_user_bus(p_user_id uuid)`

[DEPRECATED] Legacy function with canary. Use get_profile_bus(profile_id) instead.

### `get_user_default_bu(p_user_id uuid)`

[DEPRECATED] Legacy function with canary. Use get_profile_default_bu(profile_id) instead.

### `get_user_job_title_in_bu(p_profile_id uuid, p_bu_id uuid)`

Retorna o cargo efetivo de um usuário em uma BU. Prioriza cargo da membership, fallback para cargo do profile.

### `get_user_partner_contact_id(p_user_id uuid)`

Retorna o partner_contact_id para um auth.users.id. Prioriza o contactId com associação ativa na BU atual (via current_bu_id()). Fallback para qualquer contactId ativo se não houver BU no contexto.

### `get_user_role_for_impersonation(p_target_profile_id uuid, p_bu_id uuid)`

_Sem descrição._

### `handle_new_user()`

Wave 5: Cria profile e membership com profile_id na criação de novo usuário.

### `is_team_leader_by_profile(p_profile_id uuid, p_team_id uuid)`

Verifica se um profile é líder de um time.

### `is_user_leader(p_user_id uuid DEFAULT NULL::uuid)`

Returns true if user is a leader of at least one team in the current BU

### `mark_user_migrated(p_bu_id uuid, p_user_id uuid, p_v1_snapshot jsonb DEFAULT '[]'::jsonb, p_v2_templates jsonb DEFAULT '[]'::jsonb, p_notes…)`

_Sem descrição._

### `my_profile_id()`

CANONICAL: Returns the profile.id for the currently authenticated user. Primary identity function for RLS policies.

### `my_profile_id_strict()`

Strict version of my_profile_id() that raises exception if no profile exists.

### `profile_has_bu_access(p_profile_id uuid, p_bu_id uuid)`

[IDENTITY v3.0] Profile-first equivalent of user_has_bu_access. Checks if profile has active membership in BU.

### `profile_id_from_user_id(p_user_id uuid)`

CANONICAL: Converts auth.users.id to profiles.id. Use this when you have user_id and need profile_id.

### `reactivate_user(target_profile_id uuid)`

_Sem descrição._

### `remove_user_bu_access(target_user_id uuid, target_bu_id uuid)`

_Sem descrição._

### `reset_user_onboarding(target_profile_id uuid)`

_Sem descrição._

### `resolve_participant_identity(p_participant_id uuid, p_bu_id uuid DEFAULT NULL::uuid)`

_Sem descrição._

### `sync_profile_bu_to_default_membership(p_user_id uuid)`

_Sem descrição._

### `trg_protect_profile_critical_fields()`

Protege campos críticos do profile:

### `trg_sync_profile_bu_on_membership_change()`

_Sem descrição._

### `update_user_global_role(target_user_id uuid, new_role text)`

_Sem descrição._

### `user_can_manage_team(p_user_id uuid, p_team_id uuid)`

[SECURITY DEFINER] [HIERARCHY] Verifica gestão de time.

### `user_has_bu_access(p_user_id uuid, p_bu_id uuid)`

[SECURITY DEFINER] [AUTHZ] Verifica se usuário tem acesso a uma BU.

### `user_id_from_profile_id(p_profile_id uuid)`

Converte profiles.id para auth.users.id.

### `verify_user_migration(p_bu_id uuid, p_user_id uuid, p_notes text DEFAULT NULL::text)`

_Sem descrição._

---

## Business Units

### `assert_bu_scope(p_bu_id uuid)`

_Sem descrição._

### `count_bu_calls_today(p_bu_id uuid)`

_Sem descrição._

### `create_bu_template(p_bu_id uuid, p_event_slug text, p_channel text, p_subject text, p_body text, p_reason text DEFAULT 'Criação inicial'::t…)`

_Sem descrição._

### `current_bu_id()`

[SECURITY DEFINER] [CORE] Retorna bu_id do contexto atual.

### `enforce_bu_scope()`

_Sem descrição._

### `enforce_squad_membership_bu_scope()`

_Sem descrição._

### `get_bu_by_email_domain(p_email text)`

_Sem descrição._

### `get_bu_migration_status(p_bu_id uuid)`

_Sem descrição._

### `set_squad_membership_bu_id()`

_Sem descrição._

### `trg_bu_locations_audit()`

_Sem descrição._

### `trg_bu_locations_ensure_single_default()`

_Sem descrição._

### `trg_bu_locations_updated_at()`

_Sem descrição._

---

## OKRs

### `auto_transition_cycle_statuses()`

_Sem descrição._

### `calculate_objective_health(p_bu_id uuid, p_objective_type text, p_objective_id uuid)`

_Sem descrição._

### `can_manage_team_okr(p_user_id uuid, p_team_id uuid)`

Verifica se usuário pode criar/editar OKRs para um time específico. Usa get_okr_manageable_team_ids internamente.

### `can_manage_team_okr_by_profile(p_profile_id uuid, p_team_id uuid)`

Wrapper de can_manage_team_okr para uso em RLS policies. Aceita profile_id como primeiro parâmetro (compatível com my_profile_id()) e converte internamente para auth.users.id.

### `cascade_objective_cancellation()`

Cascateia cancelamento de objetivo de time para suas KRs e iniciativas

### `cascade_org_objective_cancellation()`

Cascateia cancelamento de objetivo organizacional para suas KRs

### `generate_okr_insights_for_objective(p_bu_id uuid, p_objective_type text, p_objective_id uuid)`

_Sem descrição._

### `get_cycle_checkins(p_cycle_id uuid, p_filters jsonb DEFAULT '{}'::jsonb)`

_Sem descrição._

### `get_okr_manageable_team_ids(p_user_id uuid DEFAULT NULL::uuid, p_bu_id uuid DEFAULT NULL::uuid)`

[SECURITY DEFINER] [HIERARCHY] Lista times gerenciáveis para OKRs.

### `get_okr_manageable_team_ids_for_impersonation(p_target_profile_id uuid, p_bu_id uuid)`

_Sem descrição._

### `okr_audit_trigger()`

_Sem descrição._

### `refresh_objective_health(p_bu_id uuid, p_objective_type text, p_objective_id uuid)`

_Sem descrição._

### `rpc_okr_dashboard_data(p_bu_id uuid, p_year integer, p_view text DEFAULT 'company'::text, p_team_id uuid DEFAULT NULL::uuid)`

RPC agregada do dashboard OKR. Filtra status cancelled E discarded (TCR §2.2 v2.75.0)

### `set_okr_wizard_session_bu_id()`

_Sem descrição._

### `update_objective_kr_count()`

_Sem descrição._

### `update_okr_checkins_updated_at()`

_Sem descrição._

### `validate_max_kr_per_objective()`

_Sem descrição._

### `validate_max_team_objectives()`

_Sem descrição._

### `validate_okr_contribution()`

_Sem descrição._

### `validate_single_active_cycle()`

_Sem descrição._

### `validate_team_objectives_limit()`

_Sem descrição._

---

## Rituais

### `count_collaborator_checkin_expected(p_bu_id uuid, p_team_id uuid, p_cycle_id uuid)`

_Sem descrição._

### `fn_validate_qbr_status_transition()`

_Sem descrição._

### `mark_missed_ritual_occurrences()`

Marca ocorrências passadas sem sessão como missed — chamada pelo cron-dispatcher

### `update_kr_last_checkin()`

_Sem descrição._

### `update_kr_on_checkin()`

_Sem descrição._

---

## KPIs / Métricas

### `collect_perf_metrics()`

P4: Coleta métricas de performance com threshold de rows para evitar falsos positivos em tabelas pequenas

### `fn_kpi_target_history_trigger()`

_Sem descrição._

### `kpi_audit_trigger()`

_Sem descrição._

### `kpi_calculate_period(p_reference_date date, p_frequency kpi_frequency, OUT p_start date, OUT p_end date, OUT p_label text)`

_Sem descrição._

### `kpi_calculate_rag(p_value numeric, p_target numeric, p_direction kpi_direction)`

_Sem descrição._

### `kpi_metrics_governance_validate()`

_Sem descrição._

### `kpi_validate_value_insert()`

_Sem descrição._

### `rpc_kpi_dashboard_summary(p_team_id uuid DEFAULT NULL::uuid, p_scope text DEFAULT 'leader'::text)`

Returns KPI summary for dashboard cards. Supports admin/leader/collaborator scopes with RAG counters, pending updates, and top critical KPIs.

### `sync_org_kr_from_primary_kpi()`

_Sem descrição._

### `validate_kr_primary_metric()`

_Sem descrição._

---

## Projetos

### `calculate_project_health(p_project_id uuid)`

_Sem descrição._

### `is_leader_of_project_owner(p_leader_profile_id uuid, p_owner_profile_id uuid, p_bu_id uuid)`

_Sem descrição._

### `milestone_status_label(p_status text)`

_Sem descrição._

### `notify_milestone_status_changed()`

_Sem descrição._

### `notify_project_status_changed()`

_Sem descrição._

### `project_status_label(p_status text)`

_Sem descrição._

---

## Tickets / Menções

### `apply_ticket_assignment()`

_Sem descrição._

### `auto_add_mention_as_participant()`

Trigger: Auto-adds mentioned users as ticket participants when entity_type=ticket_message. Resolves ticket_id from the message.

### `can_pin_ticket_message(p_ticket_id uuid, p_profile_id uuid)`

Verifica se um usuário pode fixar mensagens em um ticket (deve ser criador, owner ou assignee externo)

### `can_update_ticket_status(p_ticket_id uuid, p_profile_id uuid)`

Checks if a profile can update ticket status. Only creator, owner (responsible), assigned contact, or admins can change status.

### `can_view_ticket(p_ticket_id uuid, p_profile_id uuid DEFAULT NULL::uuid)`

Verifica se um usuário pode visualizar um ticket.

### `debug_rls_ticket_insert(p_created_by_user_id uuid, p_bu_id uuid)`

Debug function to understand RLS context during ticket insert. Logs to app_error_logs and returns current auth context.

### `get_partner_contact_ticket_stats(p_contact_id uuid)`

Returns ticket statistics for a partner contact.

### `get_ticket_for_impersonation(p_ticket_id uuid, p_impersonated_profile_id uuid)`

_Sem descrição._

### `get_visible_ticket_ids_for_impersonation(p_profile_id uuid)`

Retorna IDs de tickets visíveis para impersonation. user_team_memberships: existence = active.

### `is_ticket_contact_participant(p_contact_id uuid, p_ticket_id uuid)`

_Sem descrição._

### `is_ticket_participant(p_user_id uuid, p_ticket_id uuid)`

Checks if profile_id is an active participant in ticket. p_user_id is actually profile_id (legacy naming).

### `notify_project_mention()`

_Sem descrição._

### `notify_ticket_assigned()`

v2: Notifies owner when ticket is assigned. Fixed to use owner_user_id instead of non-existent assignee_id.

### `notify_ticket_created()`

Notifies owner AND assigned external contact when ticket is created. v2: Now includes assigned_contact_id.

### `notify_ticket_mention()`

Trigger function to send notifications when a user is mentioned in a ticket message.

### `notify_ticket_message_created()`

Notifies ALL participants (internal + external watchers) when message is added. v2: Now includes partner_contact participants.

### `notify_ticket_status_changed()`

Notifies ALL participants (internal + external watchers) when status changes. v2: Now includes partner_contact participants.

### `resolve_ticket_assignee(p_bu_id uuid, p_external_company_id uuid, p_category_id uuid, p_subcategory_id uuid DEFAULT NULL::uuid)`

Resolves ticket assignee based on contact capabilities. Uses external_company_id (unified model v2.73+).

### `rpc_tickets_summary(p_bu_id uuid, p_team_id uuid DEFAULT NULL::uuid)`

Aggregated tickets summary for dashboard - consolidates multiple queries into one

### `search_bu_users_for_mention(p_bu_id uuid, p_search_term text DEFAULT NULL::text, p_limit integer DEFAULT 8)`

_Sem descrição._

### `search_mention_candidates(p_bu_id uuid, p_search_term text DEFAULT NULL::text, p_external_company_id uuid DEFAULT NULL::uuid, p_limit integer DEFA…)`

_Sem descrição._

### `set_mentions_bu_id()`

_Sem descrição._

### `ticket_status_label(p_status text)`

_Sem descrição._

### `tickets_updated_at()`

_Sem descrição._

### `trg_add_supervisors_to_new_ticket()`

_Sem descrição._

### `trg_notify_external_contact_on_ticket_assignment()`

Notifies external contact when assigned to ticket. Uses /go/ticket/ for multi-BU context resolution.

### `validate_external_ticket_partner_service()`

_Sem descrição._

---

## Notificações

### `acknowledge_health_alert(p_alert_id uuid, p_notes text DEFAULT NULL::text)`

_Sem descrição._

### `create_mention_notification(p_mentioned_user_id uuid, p_author_id uuid, p_bu_id uuid, p_context_type text, p_context_id uuid, p_parent_type text, p_…)`

_Sem descrição._

### `emit_notification_event(p_event_slug text, p_bu_id uuid, p_recipient_user_ids uuid[], p_actor_id uuid DEFAULT NULL::uuid, p_title text DEFAULT N…)`

v2.1.0 - Fixed external user detection to use pc.user_id instead of pc.profile_user_id

### `evaluate_notification_health()`

_Sem descrição._

### `get_user_notification_settings(p_user_id uuid, p_bu_id uuid)`

_Sem descrição._

### `mark_all_notifications_read()`

_Sem descrição._

### `mark_notification_read(p_notification_id uuid)`

_Sem descrição._

### `process_recommendation_expiry_notifications()`

Processa notificações de vencimento de recomendações de equipamentos.

### `resolve_health_alert(p_alert_id uuid, p_notes text DEFAULT NULL::text)`

_Sem descrição._

### `resolve_notification_recipient(p_auth_user_id uuid)`

Resolves notification recipient info. Handles both auth.users.id and legacy profiles.id inputs for backward compatibility.

### `resolve_notification_template(p_event_slug text, p_channel text, p_bu_id uuid DEFAULT NULL::uuid)`

_Sem descrição._

### `send_test_notification(p_bu_id uuid, p_target_user_id uuid, p_channels text[] DEFAULT ARRAY['in_app'::text, 'email'::text])`

@deprecated Use send_test_notification_v2 instead. This function expects auth.users.id as p_target_user_id, which is error-prone. The v2 function accepts profiles.id and resolves auth_user_id internally.

### `send_test_notification_v2(p_bu_id uuid, p_target_profile_id uuid, p_channels text[] DEFAULT ARRAY['in_app'::text, 'email'::text])`

Send test notification to a profile. Accepts profile_id (profiles.id) and resolves auth_user_id internally. Returns error if profile has no auth user (never logged in).

### `set_user_notification_preference(p_user_id uuid, p_bu_id uuid, p_event_slug text, p_channel_slug text, p_enabled boolean)`

_Sem descrição._

### `update_notifications_updated_at()`

_Sem descrição._

### `validate_bu_notification_event_setting()`

_Sem descrição._

---

## Times / Áreas

### `audit_team_membership_changes()`

_Sem descrição._

### `get_descendant_team_ids(p_team_id uuid)`

Retorna array de IDs do time + todos os seus descendentes na hierarquia (recursivo).

### `get_leader_teams(p_bu_id uuid DEFAULT NULL::uuid)`

Returns teams where user is leader. member_count uses existence-based rule for user_team_memberships.

### `get_leader_teams_for_impersonation(p_target_profile_id uuid, p_bu_id uuid)`

_Sem descrição._

### `get_manageable_teams(p_user_id uuid DEFAULT NULL::uuid, p_bu_id uuid DEFAULT NULL::uuid)`

_Sem descrição._

### `get_team_member_ids(p_team_id uuid, p_include_subtree boolean DEFAULT false)`

Returns user IDs of team members. user_team_memberships uses existence-based active rule (no soft delete).

### `is_team_leader(p_user_id uuid, p_team_id uuid)`

Verifica se um usuário é líder de um time.

### `notify_team_membership_changed()`

Notifies users when added/removed from teams. Uses /go/team/ for multi-BU context resolution.

### `sync_manager_from_team_leader()`

_Sem descrição._

### `team_is_ancestor(p_ancestor_team_id uuid, p_team_id uuid)`

[SECURITY DEFINER] [HIERARCHY] Verifica se time é ancestral.

### `team_is_descendant(p_team_id uuid, p_ancestor_team_id uuid)`

_Sem descrição._

### `update_team_member_count()`

_Sem descrição._

### `validate_team_kr_limit()`

_Sem descrição._

---

## Assets / Chaves / Brindes

### `can_manage_asset_inventory(p_user_id uuid, p_bu_id uuid)`

_Sem descrição._

### `can_manage_gifts(p_user_id uuid, p_bu_id uuid)`

_Sem descrição._

### `can_manage_keys(p_user_id uuid, p_bu_id uuid)`

_Sem descrição._

### `fn_audit_asset_inventory()`

_Sem descrição._

### `fn_audit_asset_keyrings()`

_Sem descrição._

### `fn_audit_asset_phone_lines()`

_Sem descrição._

### `get_asset_kit(p_asset_id uuid)`

_Sem descrição._

### `normalize_asset_code(code_text text)`

_Sem descrição._

### `notify_asset_checkout()`

Notifies users when an asset is checked out to them. Uses /go/asset/ for multi-BU context resolution.

### `resolve_asset_by_code_for_bu(p_bu_id uuid, code_text text)`

_Sem descrição._

### `resolve_asset_by_code_global(code_text text)`

_Sem descrição._

### `sync_asset_group_primary_from_item()`

_Sem descrição._

### `update_asset_categories_updated_at()`

_Sem descrição._

### `update_asset_phone_lines_updated_at()`

_Sem descrição._

### `update_asset_updated_at()`

_Sem descrição._

### `update_gift_stock_on_movement()`

_Sem descrição._

### `update_keyring_on_movement()`

_Sem descrição._

### `validate_asset_group_primary()`

_Sem descrição._

---

## Parceiros / Externos

### `find_partner_by_document(p_document text)`

_Sem descrição._

### `get_partner_categories(p_external_company_id uuid)`

Busca categorias atendidas por uma empresa parceira. Parâmetro renomeado de p_partner_company_id para p_external_company_id em v2.76.0

### `get_partner_company_with_privacy(p_company_id uuid)`

Returns partner company data with field-level privacy controls.

### `get_partner_subcategories(p_external_company_id uuid, p_category_id uuid)`

Busca subcategorias atendidas por uma empresa parceira para uma categoria. Parâmetros atualizados em v2.76.0

### `is_allowed_partner_email(p_email text)`

_Sem descrição._

### `list_partner_companies_with_privacy(p_bu_id uuid)`

Returns list of partner companies for a BU with field-level privacy controls.

### `update_partner_service_mappings_updated_at()`

_Sem descrição._

---

## Análises / Relatórios

### `validate_analysis_feedback_rating()`

_Sem descrição._

---

## IA / Agentes

### `is_agent_enabled_for_bu(p_bu_id uuid, p_agent_id uuid)`

_Sem descrição._

---

## Cron / Jobs

### `job_title_belongs_to_bu(p_job_title_id uuid, p_bu_id uuid)`

_Sem descrição._

---

## Auditoria / Logs

### `cleanup_old_audit_logs(p_retention_days integer DEFAULT 90)`

Limpa registros de audit_logs e ai_agent_logs mais antigos que p_retention_days (default: 90).

### `cleanup_old_logs(p_agent_logs_days integer DEFAULT 14, p_perf_days integer DEFAULT 14, p_cron_days integer DEFAULT 7, p_wizard_days integ…)`

Função centralizada de cleanup de logs.

### `log_audit_event(p_action text, p_entity_type text, p_entity_id uuid DEFAULT NULL::uuid, p_old_values jsonb DEFAULT NULL::jsonb, p_new_va…)`

_Sem descrição._

---

## Triggers / Helpers internos

### `update_updated_at_column()`

_Sem descrição._

---

## Outros / Utilitários

### `activate_template_version(p_template_id uuid, p_version_id uuid, p_reason text DEFAULT NULL::text)`

_Sem descrição._

### `calculate_kr_progress(p_baseline numeric, p_current numeric, p_target numeric, p_direction okr_direction)`

_Sem descrição._

### `can_manage_inventory(p_user_id uuid, p_bu_id uuid)`

_Sem descrição._

### `cascade_kr_cancellation()`

Cascateia cancelamento de KR de time para suas iniciativas

### `check_scope_access(p_user_id uuid, p_scope text, p_ctx jsonb DEFAULT NULL::jsonb)`

Checks scope-based access. team/team_tree uses existence-based rule, squad uses deleted_at IS NULL.

### `cleanup_orphan_memberships()`

_Sem descrição._

### `count_collaborator_sessions_by_date(p_bu_id uuid, p_team_id uuid, p_start_date date, p_end_date date)`

_Sem descrição._

### `create_template_version(p_template_id uuid, p_subject text, p_body text, p_reason text DEFAULT NULL::text)`

_Sem descrição._

### `ensure_default_v2_template_for_membership(p_auth_user_id uuid, p_bu_id uuid, p_role_in_bu text DEFAULT NULL::text)`

Auto-assigns base V2 permission template when user gains BU membership.

### `ensure_single_favorite_link()`

_Sem descrição._

### `f_unaccent(text)`

Wrapper for unaccent that uses the extensions schema where the extension is installed

### `get_enabled_modules_for_bu(p_bu_id uuid)`

_Sem descrição._

### `get_integration_config_for_bu(p_bu_id uuid, p_integration_key text)`

_Sem descrição._

### `get_kit_required_accessories(p_asset_id uuid)`

_Sem descrição._

### `get_system_setting(p_key text)`

Retorna valor de configuração global do sistema.

### `get_vacuum_instructions()`

_Sem descrição._

### `initialize_counting_columns()`

Recalcula contagens - executar via Dashboard SQL

### `is_current_bu(p_bu_id uuid)`

_Sem descrição._

### `is_email_domain_allowed(p_email text)`

_Sem descrição._

### `is_ia_enabled_for_bu(p_bu_id uuid)`

_Sem descrição._

### `is_module_enabled_for_bu(p_bu_id uuid, p_module_slug text)`

_Sem descrição._

### `is_super_admin(_user_id uuid)`

_Sem descrição._

### `propagate_leader_change_to_members()`

_Sem descrição._

### `resolve_work_email(p_auth_user_id uuid)`

Canonical resolver for notification email. Returns profiles.work_email with fallback to auth.users.email.

### `rpc_home_dashboard_data(p_bu_id uuid, p_user_id uuid)`

_Sem descrição._

### `rpc_leader_dashboard_focus(p_team_id uuid)`

Returns top 3 focus items for a team leader

### `rpc_leader_dashboard_summary(p_team_id uuid)`

Returns aggregated dashboard data for a team leader including real KPI data

### `trg_handle_membership_created_assign_v2()`

Trigger function: assigns base V2 template on bu_user_memberships INSERT.

### `update_inventory_on_movement()`

_Sem descrição._

### `validate_message_pin()`

_Sem descrição._

### `validate_org_kr_limit()`

_Sem descrição._

### `validate_phone_line_loan()`

_Sem descrição._

### `validate_template_variables(p_event_slug text, p_body text, p_subject text DEFAULT NULL::text)`

_Sem descrição._

---


## KPI Frequency Split — v3.0.0

### `kpi_frequency_to_days(f kpi_frequency_value) → int`
Helper IMMUTABLE. Mapeia enum para dias: `daily=1, weekly=7, biweekly=14, monthly=30, quarterly=90, semiannual=180, annual=365`.

### `validate_kpi_frequency_relationship() → trigger`
Trigger `kpi_frequency_validation` (BEFORE INSERT/UPDATE em `kpi_metrics`). Garante `update_frequency ≤ consolidation_frequency` em dias.

### `derive_kpi_value_confidence() → trigger`
Trigger `trg_kpi_value_derive_confidence` (BEFORE INSERT em `kpi_values`). Quando `confidence='medium'` (default não-informado) e `input_type='consolidated'`, deriva `confidence='high'`. Inputs `partial` mantêm `confidence='medium'` (default). Override explícito do usuário sempre prevalece.

### `kpi_calculate_period_v2(reference_date date, freq kpi_frequency_value) → (period_start, period_end, period_label)`
Overload coexistente da `kpi_calculate_period` legada. Semântica formal:
- `daily` → dia.
- `weekly` → segunda-domingo (ISO).
- `biweekly` → janela de 14 dias ancorada na primeira segunda-feira do ano.
- `monthly` → mês calendário.
- `quarterly` → Q1/Q2/Q3/Q4 calendário.
- `semiannual` → H1=jan-jun, H2=jul-dez.
- `annual` → ano calendário.

A função antiga foi preservada sem mudanças para não quebrar callsites.

---

---

## 🔄 Auto-Generated Reference (do banco)

<!-- @generated:db-functions:start -->

<!-- Gerado automaticamente por scripts/generate-db-functions-index.ts — NÃO EDITAR -->
> **Gerado em:** 2026-05-16T21:56:24.154Z
> **Total:** 293 funções no schema `public`

| Função | Argumentos | Retorno | Security | Volatility |
|--------|------------|---------|----------|------------|
| `_milestone_email_metadata` | `p_milestone_id uuid` | `jsonb` | DEFINER | stable |
| `_project_email_metadata` | `p_project_id uuid` | `jsonb` | DEFINER | stable |
| `_ticket_email_metadata` | `p_ticket_id uuid` | `jsonb` | DEFINER | stable |
| `acknowledge_health_alert` | `p_alert_id uuid, p_notes text` | `boolean` | DEFINER | volatile |
| `activate_template_version` | `p_template_id uuid, p_version_id uuid, p_reason text` | `boolean` | DEFINER | volatile |
| `add_user_bu_access` | `target_user_id uuid, target_bu_id uuid, p_role_in_bu text, p_is_default boolean` | `void` | DEFINER | volatile |
| `apply_ticket_assignment` | — | `trigger` | DEFINER | volatile |
| `archive_milestone_v2` | `p_milestone_id uuid` | `jsonb` | DEFINER | volatile |
| `archive_project_v2` | `p_project_id uuid` | `jsonb` | DEFINER | volatile |
| `assert_bu_scope` | `p_bu_id uuid` | `boolean` | DEFINER | stable |
| `assert_profile_identity` | `p_profile_id uuid` | `boolean` | DEFINER | stable |
| `assessment_category_validate_name_length` | — | `trigger` | INVOKER | volatile |
| `assessment_link_profile_by_cpf` | — | `trigger` | DEFINER | volatile |
| `assessment_set_bu_id` | — | `trigger` | DEFINER | volatile |
| `assessment_subcategory_validate_bu` | — | `trigger` | DEFINER | volatile |
| `assessment_validate_category_subcategory` | — | `trigger` | DEFINER | volatile |
| `audit_profile_changes` | — | `trigger` | DEFINER | volatile |
| `audit_team_membership_changes` | — | `trigger` | DEFINER | volatile |
| `auto_add_mention_as_participant` | — | `trigger` | DEFINER | volatile |
| `auto_assign_leader_permissions` | — | `trigger` | DEFINER | volatile |
| `auto_transition_cycle_statuses` | — | `jsonb` | DEFINER | volatile |
| `calculate_kr_progress` | `p_baseline numeric, p_current numeric, p_target numeric, p_direction okr_direction` | `numeric` | INVOKER | immutable |
| `calculate_objective_health` | `p_bu_id uuid, p_objective_type text, p_objective_id uuid` | `jsonb` | DEFINER | volatile |
| `calculate_project_health` | `p_project_id uuid` | `text` | DEFINER | stable |
| `can_create_shared_team_kr_by_profile` | `p_profile_id uuid, p_bu_id uuid, p_objective_id uuid, p_kr_team_id uuid` | `boolean` | DEFINER | stable |
| `can_manage_asset_inventory` | `p_user_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `can_manage_gifts` | `p_user_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `can_manage_inventory` | `p_user_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `can_manage_keys` | `p_user_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `can_manage_team_okr` | `p_user_id uuid, p_team_id uuid` | `boolean` | DEFINER | stable |
| `can_manage_team_okr_by_profile` | `p_profile_id uuid, p_team_id uuid` | `boolean` | DEFINER | stable |
| `can_pin_ticket_message` | `p_ticket_id uuid, p_profile_id uuid` | `boolean` | DEFINER | stable |
| `can_update_ticket_status` | `p_ticket_id uuid, p_profile_id uuid` | `boolean` | DEFINER | stable |
| `can_view_ticket` | `p_ticket_id uuid, p_profile_id uuid` | `boolean` | DEFINER | stable |
| `cascade_kr_cancellation` | — | `trigger` | DEFINER | volatile |
| `cascade_objective_cancellation` | — | `trigger` | DEFINER | volatile |
| `cascade_org_objective_cancellation` | — | `trigger` | DEFINER | volatile |
| `check_permission_scope_access` | `p_user_id uuid, p_bu_id uuid, p_scope permission_scope, p_ctx jsonb` | `boolean` | DEFINER | stable |
| `check_scope_access` | `p_user_id uuid, p_scope text, p_ctx jsonb` | `boolean` | DEFINER | volatile |
| `cleanup_old_audit_logs` | `p_retention_days integer` | `TABLE(deleted_count bigint, table_name text)` | DEFINER | volatile |
| `cleanup_old_logs` | `p_agent_logs_days integer, p_perf_days integer, p_cron_days integer, p_wizard_days integer, p_audit_logs_days integer` | `void` | DEFINER | volatile |
| `cleanup_orphan_memberships` | — | `jsonb` | DEFINER | volatile |
| `close_ritual_evaluation` | `p_session_id uuid` | `jsonb` | DEFINER | volatile |
| `collect_perf_metrics` | — | `jsonb` | DEFINER | volatile |
| `count_bu_calls_today` | `p_bu_id uuid` | `integer` | DEFINER | stable |
| `count_collaborator_checkin_expected` | `p_bu_id uuid, p_team_id uuid, p_cycle_id uuid` | `integer` | INVOKER | stable |
| `count_collaborator_sessions_by_date` | `p_bu_id uuid, p_team_id uuid, p_start_date date, p_end_date date` | `TABLE(session_date date, completed_count integer)` | INVOKER | stable |
| `count_user_calls_today` | `p_user_id uuid, p_bu_id uuid` | `integer` | DEFINER | stable |
| `create_bu_template` | `p_bu_id uuid, p_event_slug text, p_channel text, p_subject text, p_body text, p_reason text` | `uuid` | DEFINER | volatile |
| `create_mention_notification` | `p_mentioned_user_id uuid, p_author_id uuid, p_bu_id uuid, p_context_type text, p_context_id uuid, p_parent_type text, p_parent_id uuid, p_context_url text, p_author_name text` | `uuid` | DEFINER | volatile |
| `create_template_version` | `p_template_id uuid, p_subject text, p_body text, p_reason text` | `uuid` | DEFINER | volatile |
| `current_bu_id` | — | `uuid` | DEFINER | stable |
| `current_profile_id` | — | `uuid` | DEFINER | stable |
| `debug_rls_ticket_insert` | `p_created_by_user_id uuid, p_bu_id uuid` | `jsonb` | DEFINER | volatile |
| `emit_notification_event` | `p_event_slug text, p_bu_id uuid, p_recipient_user_ids uuid[], p_actor_id uuid, p_title text, p_message text, p_context_type text, p_context_id uuid, p_context_url text, p_metadata jsonb` | `SETOF uuid` | DEFINER | volatile |
| `enforce_bu_scope` | — | `trigger` | DEFINER | volatile |
| `enforce_metric_scope_team` | — | `trigger` | INVOKER | volatile |
| `enforce_milestone_soft_delete_authority` | — | `trigger` | DEFINER | volatile |
| `enforce_one_kr_link_xor` | — | `trigger` | INVOKER | volatile |
| `enforce_squad_membership_bu_scope` | — | `trigger` | INVOKER | volatile |
| `ensure_default_v2_template_for_membership` | `p_auth_user_id uuid, p_bu_id uuid, p_role_in_bu text` | `void` | DEFINER | volatile |
| `ensure_single_favorite_link` | — | `trigger` | DEFINER | volatile |
| `evaluate_notification_health` | — | `TABLE(alerts_created integer, alerts_resolved integer, details jsonb)` | DEFINER | volatile |
| `explain_permission` | `p_user_id uuid, p_bu_id uuid, p_permission_key text` | `TABLE(source_type text, source_id uuid, source_name text, granted_at timestamp with time zone, granted_by uuid, granted_by_name text, is_auto_assigned boolean)` | DEFINER | volatile |
| `f_unaccent` | `text` | `text` | INVOKER | immutable |
| `find_partner_by_document` | `p_document text` | `TABLE(id uuid, name text, legal_name text, person_type text, document text, document_type text, status text, allowed_domains text[], notes text)` | DEFINER | stable |
| `fn_attendance_block_after_completed` | — | `trigger` | DEFINER | volatile |
| `fn_attendance_touch_modified` | — | `trigger` | INVOKER | volatile |
| `fn_audit_asset_inventory` | — | `trigger` | DEFINER | volatile |
| `fn_audit_asset_keyrings` | — | `trigger` | DEFINER | volatile |
| `fn_audit_asset_phone_lines` | — | `trigger` | DEFINER | volatile |
| `fn_kpi_target_history_trigger` | — | `trigger` | DEFINER | volatile |
| `fn_validate_qbr_status_transition` | — | `trigger` | INVOKER | volatile |
| `fn_validate_ritual_evaluation_response` | — | `trigger` | DEFINER | volatile |
| `generate_okr_insights_for_objective` | `p_bu_id uuid, p_objective_type text, p_objective_id uuid` | `integer` | DEFINER | volatile |
| `generate_ritual_short_code` | — | `text` | DEFINER | volatile |
| `get_archived_project_v2` | `p_project_id uuid` | `jsonb` | DEFINER | stable |
| `get_asset_kit` | `p_asset_id uuid` | `TABLE(group_id uuid, group_name text, group_type text, is_primary boolean, primary_asset_id uuid, primary_asset_name text)` | DEFINER | stable |
| `get_auth_user_id` | `p_profile_id uuid` | `uuid` | DEFINER | stable |
| `get_bu_by_email_domain` | `p_email text` | `uuid` | DEFINER | stable |
| `get_bu_migration_status` | `p_bu_id uuid` | `TABLE(total_users bigint, migrated_users bigint, verified_users bigint, not_started_users bigint, migration_percentage numeric)` | DEFINER | volatile |
| `get_bu_users_by_membership` | `p_bu_id uuid, p_search text, p_team_id uuid, p_status text, p_limit integer, p_offset integer` | `TABLE(profile_id uuid, user_id uuid, first_name text, last_name text, display_name text, work_email text, photo_url text, city text, state text, work_mode text, employment_status text, job_title_id uuid, job_title_name text, team_id uuid, team_name text, manager_user_id uuid, role_in_bu text, is_default_bu boolean, total_count bigint)` | INVOKER | stable |
| `get_cycle_checkins` | `p_cycle_id uuid, p_filters jsonb` | `jsonb` | DEFINER | volatile |
| `get_descendant_team_ids` | `p_team_id uuid` | `uuid[]` | DEFINER | stable |
| `get_effective_permissions_v2` | `p_user_id uuid, p_bu_id uuid` | `TABLE(permission_key text, permission_id uuid, user_id uuid, bu_id uuid, module text, resource text, action text, scope text, source text, source_name text)` | DEFINER | volatile |
| `get_enabled_modules_for_bu` | `p_bu_id uuid` | `TABLE(id uuid, name text, slug text, description text, icon text, route text, type module_type, display_order integer, is_enabled boolean)` | DEFINER | stable |
| `get_global_users_admin` | `p_search text, p_bu_id uuid, p_onboarding_status text, p_user_type text` | `TABLE(profile_id uuid, user_id uuid, display_name text, work_email text, user_type text, onboarding_completed boolean, primary_bu_id uuid, primary_bu_name text, last_sign_in_at timestamp with time zone, global_role text, bu_accesses jsonb)` | DEFINER | stable |
| `get_global_users_admin` | `p_search text, p_bu_id uuid, p_onboarding_status text, p_user_type text, p_include_terminated boolean` | `TABLE(profile_id uuid, user_id uuid, display_name text, work_email text, user_type text, onboarding_completed boolean, primary_bu_id uuid, primary_bu_name text, last_sign_in_at timestamp with time zone, global_role text, bu_accesses jsonb, employment_status text, deleted_at timestamp with time zone)` | DEFINER | volatile |
| `get_integration_config_for_bu` | `p_bu_id uuid, p_integration_key text` | `jsonb` | DEFINER | volatile |
| `get_kit_required_accessories` | `p_asset_id uuid` | `TABLE(asset_id uuid, asset_name text, internal_code text, status text, current_holder_type text, current_user_id uuid, current_location_id uuid, is_available boolean)` | DEFINER | stable |
| `get_leader_teams` | `p_bu_id uuid` | `TABLE(team_id uuid, team_name text, team_description text, parent_team_id uuid, member_count bigint)` | DEFINER | volatile |
| `get_leader_teams_for_impersonation` | `p_target_profile_id uuid, p_bu_id uuid` | `TABLE(team_id uuid, team_name text, member_count bigint)` | DEFINER | volatile |
| `get_manageable_teams` | `p_user_id uuid, p_bu_id uuid` | `TABLE(team_id uuid, team_name text, can_manage boolean)` | DEFINER | stable |
| `get_my_permissions` | `p_bu_id uuid` | `text[]` | DEFINER | volatile |
| `get_okr_manageable_team_ids` | `p_user_id uuid, p_bu_id uuid` | `uuid[]` | DEFINER | stable |
| `get_okr_manageable_team_ids_for_impersonation` | `p_target_profile_id uuid, p_bu_id uuid` | `text[]` | DEFINER | volatile |
| `get_partner_categories` | `p_external_company_id uuid` | `TABLE(category_id uuid, category_name text, is_generalist boolean, subcategory_count bigint)` | INVOKER | stable |
| `get_partner_company_with_privacy` | `p_company_id uuid` | `TABLE(id uuid, bu_id uuid, name text, legal_name text, document text, document_type text, person_type text, allowed_domains text[], status text, notes text, created_at timestamp with time zone, created_by uuid, updated_at timestamp with time zone)` | DEFINER | stable |
| `get_partner_contact_ticket_stats` | `p_contact_id uuid` | `jsonb` | DEFINER | volatile |
| `get_partner_contact_ticket_stats` | `p_contact_id uuid, p_bu_id uuid` | `jsonb` | DEFINER | volatile |
| `get_partner_subcategories` | `p_external_company_id uuid, p_category_id uuid` | `TABLE(subcategory_id uuid, subcategory_name text)` | INVOKER | stable |
| `get_permission_diff` | `p_user_id uuid, p_bu_id uuid, p_new_template_ids uuid[]` | `TABLE(permission_key text, change_type text, source_name text)` | DEFINER | volatile |
| `get_permission_scope` | `p_permission_key text` | `permission_scope` | DEFINER | stable |
| `get_profile_bus` | `p_profile_id uuid` | `TABLE(bu_id uuid, bu_name text, role_in_bu text, is_default boolean)` | DEFINER | stable |
| `get_profile_default_bu` | `p_profile_id uuid` | `uuid` | DEFINER | stable |
| `get_profile_id` | `p_user_id uuid` | `uuid` | DEFINER | stable |
| `get_profile_with_privacy` | `p_profile_id uuid` | `TABLE(id uuid, user_id uuid, first_name text, last_name text, display_name text, work_email text, job_title_id uuid, photo_url text, city text, state text, work_mode text, employment_status text, start_date date, team_id uuid, bu_id uuid, manager_user_id uuid, birth_day integer, birth_month integer, whatsapp_personal text, instagram_id text, discord_id text)` | DEFINER | stable |
| `get_public_ritual_evaluation_form` | `p_short_code text` | `TABLE(session_id uuid, ritual_label text, wizard_type text, show_what_worked boolean, is_open boolean, dimensions text[])` | DEFINER | stable |
| `get_ritual_evaluation_live_count` | `p_session_id uuid` | `jsonb` | DEFINER | stable |
| `get_ritual_evaluation_open_answers` | `p_session_id uuid` | `TABLE(change_one_thing text, what_worked text, submitted_at timestamp with time zone)` | DEFINER | stable |
| `get_ritual_evaluation_summary` | `p_session_id uuid` | `TABLE(session_id uuid, bu_id uuid, wizard_type text, team_id uuid, cycle_id uuid, evaluation_short_code text, evaluation_open_at timestamp with time zone, evaluation_closed_at timestamp with time zone, completed_at timestamp with time zone, response_count bigint, avg_value numeric, avg_quality numeric, avg_decisions numeric, avg_time numeric, expected_count bigint)` | DEFINER | stable |
| `get_system_setting` | `p_key text` | `jsonb` | DEFINER | stable |
| `get_team_kr_creation_context` | `p_objective_id uuid, p_contributor_team_id uuid` | `TABLE(id uuid, title text, description text, team_id uuid, org_objective_id uuid, cycle_id uuid, is_shared boolean, responsibility_model text, bu_id uuid, team_name text, org_objective_title text, cycle_name text, cycle_year integer, contribution_authorized boolean)` | DEFINER | stable |
| `get_team_member_ids` | `p_team_id uuid, p_include_subtree boolean` | `uuid[]` | DEFINER | volatile |
| `get_ticket_for_impersonation` | `p_ticket_id uuid, p_impersonated_profile_id uuid` | `TABLE(id uuid, bu_id uuid, type text, title text, status text, expected_due_at timestamp with time zone, visibility text, created_by_user_id uuid, owner_user_id uuid, assigned_contact_id uuid, external_company_id uuid, category_id uuid, subcategory_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, can_view boolean)` | DEFINER | volatile |
| `get_user_bus` | `p_user_id uuid` | `SETOF uuid` | DEFINER | stable |
| `get_user_default_bu` | `p_user_id uuid` | `uuid` | DEFINER | stable |
| `get_user_job_title_in_bu` | `p_profile_id uuid, p_bu_id uuid` | `TABLE(job_title_id uuid, job_title_name text)` | DEFINER | stable |
| `get_user_notification_settings` | `p_user_id uuid, p_bu_id uuid` | `TABLE(event_slug text, event_name text, event_description text, event_module text, event_severity notification_severity, is_mandatory boolean, channel_slug text, channel_name text, enabled boolean)` | DEFINER | stable |
| `get_user_partner_contact_id` | `p_user_id uuid` | `uuid` | DEFINER | stable |
| `get_user_permissions_for_impersonation` | `p_target_profile_id uuid, p_bu_id uuid` | `text[]` | DEFINER | volatile |
| `get_user_role_for_impersonation` | `p_target_profile_id uuid, p_bu_id uuid` | `text` | DEFINER | volatile |
| `get_vacuum_instructions` | — | `text` | DEFINER | volatile |
| `get_visible_ticket_ids_for_impersonation` | `p_profile_id uuid` | `uuid[]` | DEFINER | volatile |
| `handle_new_user` | — | `trigger` | DEFINER | volatile |
| `has_any_asset_permission` | `p_user_id uuid` | `boolean` | DEFINER | stable |
| `has_assessment_permission` | `_user_id uuid, _bu_id uuid, _key text` | `boolean` | DEFINER | stable |
| `has_asset_permission` | `p_user_id uuid, p_bu_id uuid, p_roles asset_permission_role[]` | `boolean` | DEFINER | stable |
| `has_permission` | `p_user_id uuid, p_bu_id uuid, p_permission_key text` | `boolean` | DEFINER | stable |
| `has_permission_key` | `p_user_id uuid, p_bu_id uuid, p_permission_key text` | `boolean` | DEFINER | stable |
| `has_role` | `_user_id uuid, _role app_role` | `boolean` | DEFINER | stable |
| `initialize_counting_columns` | — | `TABLE(objectives_updated integer, teams_updated integer)` | DEFINER | volatile |
| `is_agent_enabled_for_bu` | `p_bu_id uuid, p_agent_id uuid` | `boolean` | DEFINER | stable |
| `is_allowed_partner_email` | `p_email text` | `boolean` | DEFINER | volatile |
| `is_bu_admin` | `p_user_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `is_bu_member` | `p_user_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `is_current_bu` | `p_bu_id uuid` | `boolean` | DEFINER | stable |
| `is_email_domain_allowed` | `p_email text` | `boolean` | DEFINER | stable |
| `is_ia_enabled_for_bu` | `p_bu_id uuid` | `boolean` | DEFINER | stable |
| `is_leader_of_project_owner` | `p_leader_profile_id uuid, p_owner_profile_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `is_module_enabled_for_bu` | `p_bu_id uuid, p_module_slug text` | `boolean` | DEFINER | stable |
| `is_platform_admin` | `_user_id uuid` | `boolean` | DEFINER | stable |
| `is_profile_bu_admin` | `p_profile_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `is_profile_bu_member` | `p_profile_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `is_profile_bu_member_or_primary` | `p_profile_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `is_super_admin` | `_user_id uuid` | `boolean` | DEFINER | stable |
| `is_team_leader` | `p_user_id uuid, p_team_id uuid` | `boolean` | DEFINER | stable |
| `is_team_leader_by_profile` | `p_profile_id uuid, p_team_id uuid` | `boolean` | DEFINER | stable |
| `is_ticket_contact_participant` | `p_contact_id uuid, p_ticket_id uuid` | `boolean` | DEFINER | stable |
| `is_ticket_participant` | `p_user_id uuid, p_ticket_id uuid` | `boolean` | DEFINER | stable |
| `is_user_leader` | `p_user_id uuid` | `boolean` | DEFINER | stable |
| `is_valid_cpf` | `p_cpf text` | `boolean` | INVOKER | immutable |
| `job_title_belongs_to_bu` | `p_job_title_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `kpi_audit_trigger` | — | `trigger` | DEFINER | volatile |
| `kpi_calculate_period` | `p_reference_date date, p_frequency kpi_frequency, OUT p_start date, OUT p_end date, OUT p_label text` | `record` | INVOKER | immutable |
| `kpi_calculate_period_v2` | `p_reference_date date, p_frequency kpi_frequency_value, OUT p_start date, OUT p_end date, OUT p_label text` | `record` | INVOKER | immutable |
| `kpi_calculate_rag` | `p_value numeric, p_target numeric, p_direction kpi_direction` | `kpi_rag_status` | INVOKER | immutable |
| `kpi_frequency_to_days` | `f kpi_frequency_value` | `integer` | INVOKER | immutable |
| `kpi_metrics_governance_validate` | — | `trigger` | INVOKER | volatile |
| `kpi_metrics_sync_status_lifecycle` | — | `trigger` | DEFINER | volatile |
| `kpi_validate_value_insert` | — | `trigger` | INVOKER | volatile |
| `list_archived_projects` | — | `jsonb` | DEFINER | stable |
| `list_partner_companies_with_privacy` | `p_bu_id uuid` | `TABLE(id uuid, bu_id uuid, name text, legal_name text, document text, document_type text, person_type text, allowed_domains text[], status text, notes text, created_at timestamp with time zone, created_by uuid, updated_at timestamp with time zone)` | DEFINER | stable |
| `log_audit_event` | `p_action text, p_entity_type text, p_entity_id uuid, p_old_values jsonb, p_new_values jsonb` | `void` | DEFINER | volatile |
| `log_permission_change` | `p_bu_id uuid, p_target_user_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_entity_name text, p_before_state jsonb, p_after_state jsonb, p_reason text` | `uuid` | DEFINER | volatile |
| `mark_all_notifications_read` | — | `integer` | DEFINER | volatile |
| `mark_missed_ritual_occurrences` | — | `integer` | DEFINER | volatile |
| `mark_notification_read` | `p_notification_id uuid` | `boolean` | DEFINER | volatile |
| `mark_user_migrated` | `p_bu_id uuid, p_user_id uuid, p_v1_snapshot jsonb, p_v2_templates jsonb, p_notes text` | `uuid` | DEFINER | volatile |
| `milestone_status_label` | `p_status text` | `text` | INVOKER | immutable |
| `my_profile_id` | — | `uuid` | DEFINER | stable |
| `my_profile_id_strict` | — | `uuid` | DEFINER | stable |
| `normalize_asset_code` | `code_text text` | `text` | INVOKER | immutable |
| `notify_asset_checkout` | — | `trigger` | DEFINER | volatile |
| `notify_milestone_status_changed` | — | `trigger` | DEFINER | volatile |
| `notify_project_mention` | — | `trigger` | DEFINER | volatile |
| `notify_project_status_changed` | — | `trigger` | DEFINER | volatile |
| `notify_team_membership_changed` | — | `trigger` | DEFINER | volatile |
| `notify_ticket_assigned` | — | `trigger` | DEFINER | volatile |
| `notify_ticket_created` | — | `trigger` | DEFINER | volatile |
| `notify_ticket_mention` | — | `trigger` | DEFINER | volatile |
| `notify_ticket_message_created` | — | `trigger` | DEFINER | volatile |
| `notify_ticket_status_changed` | — | `trigger` | DEFINER | volatile |
| `okr_audit_trigger` | — | `trigger` | DEFINER | volatile |
| `open_ritual_evaluation` | `p_session_id uuid` | `jsonb` | DEFINER | volatile |
| `process_recommendation_expiry_notifications` | — | `TABLE(notifications_sent integer, recommendations_checked integer)` | DEFINER | volatile |
| `profile_has_bu_access` | `p_profile_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `profile_id_from_user_id` | `p_user_id uuid` | `uuid` | DEFINER | stable |
| `project_status_label` | `p_status text` | `text` | INVOKER | immutable |
| `propagate_leader_change_to_members` | — | `trigger` | DEFINER | volatile |
| `reactivate_user` | `target_profile_id uuid` | `void` | DEFINER | volatile |
| `refresh_objective_health` | `p_bu_id uuid, p_objective_type text, p_objective_id uuid` | `void` | DEFINER | volatile |
| `remove_user_bu_access` | `target_user_id uuid, target_bu_id uuid` | `void` | DEFINER | volatile |
| `reset_user_onboarding` | `target_profile_id uuid` | `void` | DEFINER | volatile |
| `resolve_asset_by_code_for_bu` | `p_bu_id uuid, code_text text` | `uuid` | DEFINER | stable |
| `resolve_asset_by_code_global` | `code_text text` | `TABLE(asset_id uuid, bu_id uuid)` | DEFINER | stable |
| `resolve_health_alert` | `p_alert_id uuid, p_notes text` | `boolean` | DEFINER | volatile |
| `resolve_notification_recipient` | `p_auth_user_id uuid` | `jsonb` | DEFINER | volatile |
| `resolve_notification_template` | `p_event_slug text, p_channel text, p_bu_id uuid` | `TABLE(template_id uuid, version_id uuid, subject text, body text, variables_used text[], is_bu_override boolean)` | DEFINER | volatile |
| `resolve_participant_identity` | `p_participant_id uuid, p_bu_id uuid` | `TABLE(participant_type text, id uuid, user_id uuid, display_name text, email text, photo_url text, external_company_id uuid, external_company_name text, team_name text, job_title text)` | DEFINER | volatile |
| `resolve_ticket_assignee` | `p_bu_id uuid, p_external_company_id uuid, p_category_id uuid, p_subcategory_id uuid` | `uuid` | DEFINER | volatile |
| `resolve_ticket_bu_for_user` | `p_ticket_id uuid` | `uuid` | DEFINER | stable |
| `resolve_work_email` | `p_auth_user_id uuid` | `text` | DEFINER | volatile |
| `restore_project_v2` | `p_project_id uuid` | `jsonb` | DEFINER | volatile |
| `rpc_assessment_answer_upsert` | `p_run_id uuid, p_question_id uuid, p_answer_text text, p_answer_options jsonb, p_time_spent_seconds integer, p_paste_detected boolean, p_signals jsonb` | `jsonb` | DEFINER | volatile |
| `rpc_assessment_invite_lookup` | `p_token text` | `jsonb` | DEFINER | volatile |
| `rpc_assessment_preview_lookup` | `p_assessment_id uuid` | `jsonb` | DEFINER | volatile |
| `rpc_assessment_run_start` | `p_token text, p_cpf text, p_name text, p_client_meta jsonb` | `jsonb` | DEFINER | volatile |
| `rpc_assessment_run_submit` | `p_run_id uuid` | `jsonb` | DEFINER | volatile |
| `rpc_assessment_run_telemetry` | `p_run_id uuid, p_tab_switch_inc integer, p_paste_inc integer, p_copy_inc integer, p_visibility_loss_inc integer, p_signals jsonb` | `jsonb` | DEFINER | volatile |
| `rpc_decisions_inbox` | `p_bu_id uuid, p_user_profile_id uuid, p_scope text, p_team_ids uuid[], p_area_ids uuid[], p_filters jsonb, p_limit integer, p_offset integer` | `TABLE(decision jsonb, session_id uuid, wizard_type text, structure_version text, completed_at timestamp with time zone, team_id uuid, team_name text, cycle_id uuid, started_by uuid, total_count bigint)` | INVOKER | stable |
| `rpc_home_dashboard_data` | `p_bu_id uuid, p_user_id uuid` | `jsonb` | INVOKER | volatile |
| `rpc_kpi_dashboard_summary` | `p_team_id uuid, p_scope text` | `jsonb` | DEFINER | stable |
| `rpc_leader_dashboard_focus` | `p_team_id uuid` | `jsonb` | DEFINER | stable |
| `rpc_leader_dashboard_summary` | `p_team_id uuid` | `jsonb` | DEFINER | stable |
| `rpc_okr_dashboard_data` | `p_bu_id uuid, p_year integer, p_view text, p_team_id uuid` | `jsonb` | DEFINER | volatile |
| `rpc_tickets_summary` | `p_bu_id uuid, p_team_id uuid` | `jsonb` | DEFINER | volatile |
| `search_bu_users_for_mention` | `p_bu_id uuid, p_search_term text, p_limit integer` | `TABLE(id uuid, user_id uuid, display_name text, email text, photo_url text, team_name text, user_type text)` | DEFINER | stable |
| `search_mention_candidates` | `p_bu_id uuid, p_search_term text, p_external_company_id uuid, p_limit integer` | `TABLE(id uuid, entity_id uuid, entity_type text, display_name text, email text, photo_url text, team_name text, external_company_name text)` | INVOKER | volatile |
| `send_test_notification` | `p_bu_id uuid, p_target_user_id uuid, p_channels text[]` | `TABLE(notification_id uuid, outbox_id uuid, channel text, status text)` | DEFINER | volatile |
| `send_test_notification_v2` | `p_bu_id uuid, p_target_profile_id uuid, p_channels text[]` | `TABLE(notification_id uuid, outbox_id uuid, channel text, status text, error_message text)` | DEFINER | volatile |
| `set_mentions_bu_id` | — | `trigger` | DEFINER | volatile |
| `set_okr_wizard_session_bu_id` | — | `trigger` | DEFINER | volatile |
| `set_squad_membership_bu_id` | — | `trigger` | INVOKER | volatile |
| `set_user_notification_preference` | `p_user_id uuid, p_bu_id uuid, p_event_slug text, p_channel_slug text, p_enabled boolean` | `boolean` | DEFINER | volatile |
| `soft_delete_assessment` | `p_assessment_id uuid` | `void` | DEFINER | volatile |
| `soft_delete_assessment_form` | `p_form_id uuid` | `void` | DEFINER | volatile |
| `soft_delete_assessment_form_question` | `p_question_id uuid, p_version_id uuid` | `void` | DEFINER | volatile |
| `submit_ritual_evaluation` | `p_short_code text, p_score_value integer, p_score_quality integer, p_score_decisions integer, p_score_time integer, p_change_one_thing text, p_what_worked text, p_client_fingerprint text` | `jsonb` | DEFINER | volatile |
| `sync_asset_group_primary_from_item` | — | `trigger` | DEFINER | volatile |
| `sync_manager_from_team_leader` | — | `trigger` | DEFINER | volatile |
| `sync_org_kr_from_primary_kpi` | — | `trigger` | DEFINER | volatile |
| `sync_profile_bu_to_default_membership` | `p_user_id uuid` | `void` | DEFINER | volatile |
| `team_is_ancestor` | `p_ancestor_team_id uuid, p_team_id uuid` | `boolean` | DEFINER | stable |
| `team_is_descendant` | `p_team_id uuid, p_ancestor_team_id uuid` | `boolean` | DEFINER | stable |
| `ticket_status_label` | `p_status text` | `text` | INVOKER | immutable |
| `tickets_updated_at` | — | `trigger` | INVOKER | volatile |
| `trg_add_supervisors_to_new_ticket` | — | `trigger` | DEFINER | volatile |
| `trg_bu_locations_audit` | — | `trigger` | DEFINER | volatile |
| `trg_bu_locations_ensure_single_default` | — | `trigger` | INVOKER | volatile |
| `trg_bu_locations_updated_at` | — | `trigger` | INVOKER | volatile |
| `trg_handle_membership_created_assign_v2` | — | `trigger` | DEFINER | volatile |
| `trg_notify_external_contact_on_ticket_assignment` | — | `trigger` | DEFINER | volatile |
| `trg_protect_profile_critical_fields` | — | `trigger` | DEFINER | volatile |
| `trg_sync_profile_bu_on_membership_change` | — | `trigger` | DEFINER | volatile |
| `update_asset_categories_updated_at` | — | `trigger` | INVOKER | volatile |
| `update_asset_phone_lines_updated_at` | — | `trigger` | INVOKER | volatile |
| `update_asset_updated_at` | — | `trigger` | INVOKER | volatile |
| `update_gift_stock_on_movement` | — | `trigger` | INVOKER | volatile |
| `update_inventory_on_movement` | — | `trigger` | INVOKER | volatile |
| `update_keyring_on_movement` | — | `trigger` | INVOKER | volatile |
| `update_kr_last_checkin` | — | `trigger` | DEFINER | volatile |
| `update_kr_on_checkin` | — | `trigger` | DEFINER | volatile |
| `update_notifications_updated_at` | — | `trigger` | INVOKER | volatile |
| `update_objective_kr_count` | — | `trigger` | DEFINER | volatile |
| `update_okr_checkins_updated_at` | — | `trigger` | INVOKER | volatile |
| `update_partner_service_mappings_updated_at` | — | `trigger` | INVOKER | volatile |
| `update_project_v2` | `p_project_id uuid, p_payload jsonb` | `jsonb` | DEFINER | volatile |
| `update_team_member_count` | — | `trigger` | DEFINER | volatile |
| `update_updated_at_column` | — | `trigger` | INVOKER | volatile |
| `update_user_global_role` | `target_user_id uuid, new_role text` | `void` | DEFINER | volatile |
| `user_can_create_kpi` | `p_profile_id uuid, p_bu_id uuid, p_scope kpi_scope, p_area_id uuid, p_team_id uuid, p_indicator_type kpi_indicator_type` | `boolean` | DEFINER | stable |
| `user_can_manage_kpi` | `p_profile_id uuid, p_kpi_id uuid` | `boolean` | DEFINER | stable |
| `user_can_manage_team` | `p_user_id uuid, p_team_id uuid` | `boolean` | DEFINER | stable |
| `user_has_bu_access` | `p_user_id uuid, p_bu_id uuid` | `boolean` | DEFINER | stable |
| `user_has_permission` | `p_user_id uuid, p_bu_id uuid, p_permission_key text` | `boolean` | DEFINER | stable |
| `user_has_permission_ctx` | `p_user_id uuid, p_bu_id uuid, p_permission_key text, p_ctx jsonb` | `boolean` | DEFINER | volatile |
| `user_id_from_profile_id` | `p_profile_id uuid` | `uuid` | DEFINER | stable |
| `validate_analysis_feedback_rating` | — | `trigger` | INVOKER | volatile |
| `validate_asset_group_primary` | — | `trigger` | DEFINER | volatile |
| `validate_bu_notification_event_setting` | — | `trigger` | DEFINER | volatile |
| `validate_external_ticket_partner_service` | — | `trigger` | DEFINER | volatile |
| `validate_initiative_name_length` | — | `trigger` | INVOKER | volatile |
| `validate_kpi_frequency_relationship` | — | `trigger` | INVOKER | volatile |
| `validate_kr_primary_metric` | — | `trigger` | DEFINER | volatile |
| `validate_kr_title_length` | — | `trigger` | INVOKER | volatile |
| `validate_max_kr_per_objective` | — | `trigger` | DEFINER | volatile |
| `validate_max_team_objectives` | — | `trigger` | DEFINER | volatile |
| `validate_message_pin` | — | `trigger` | DEFINER | volatile |
| `validate_milestone_name_length` | — | `trigger` | INVOKER | volatile |
| `validate_okr_contribution` | — | `trigger` | DEFINER | volatile |
| `validate_org_kr_limit` | — | `trigger` | DEFINER | volatile |
| `validate_org_objective_title_length` | — | `trigger` | INVOKER | volatile |
| `validate_phone_line_loan` | — | `trigger` | INVOKER | volatile |
| `validate_profile_cpf` | — | `trigger` | INVOKER | volatile |
| `validate_project_milestone_dates` | — | `trigger` | INVOKER | volatile |
| `validate_project_name_length` | — | `trigger` | INVOKER | volatile |
| `validate_single_active_cycle` | — | `trigger` | INVOKER | volatile |
| `validate_team_kr_limit` | — | `trigger` | DEFINER | volatile |
| `validate_team_objective_title_length` | — | `trigger` | INVOKER | volatile |
| `validate_team_objectives_limit` | — | `trigger` | INVOKER | volatile |
| `validate_template_variables` | `p_event_slug text, p_body text, p_subject text` | `TABLE(is_valid boolean, invalid_variables text[], missing_required text[])` | DEFINER | volatile |
| `verify_user_migration` | `p_bu_id uuid, p_user_id uuid, p_notes text` | `boolean` | DEFINER | volatile |

<!-- @generated:db-functions:end -->
