-- =====================================================
-- IDENTITY CONVENTION: Comentários em colunas legadas
-- Colunas com nome *_user_id que armazenam profiles.id
-- =====================================================

-- TICKET MODULE
COMMENT ON COLUMN public.tickets.owner_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: tickets_owner_profile_fkey';
COMMENT ON COLUMN public.tickets.created_by_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: tickets_created_by_profile_fkey';
COMMENT ON COLUMN public.ticket_messages.author_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: ticket_messages_author_profile_fkey';
COMMENT ON COLUMN public.ticket_messages.pinned_by_user_id IS 'Armazena profiles.id. FK: ticket_messages_pinned_by_user_id_fkey';
COMMENT ON COLUMN public.ticket_participants.user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: ticket_participants_profile_fkey. Use com JOIN profiles p ON p.id = tp.user_id';
COMMENT ON COLUMN public.ticket_attachments.uploaded_by_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id)';

-- OKR MODULE
COMMENT ON COLUMN public.okr_org_objectives.owner_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: okr_org_objectives_owner_profile_fkey';
COMMENT ON COLUMN public.okr_org_key_results.owner_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: okr_org_key_results_owner_profile_fkey';
COMMENT ON COLUMN public.okr_team_objectives.owner_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: okr_team_objectives_owner_profile_fkey';
COMMENT ON COLUMN public.okr_team_key_results.owner_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: okr_team_key_results_owner_profile_fkey';
COMMENT ON COLUMN public.okr_checkins.user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: okr_checkins_author_profile_fkey';
COMMENT ON COLUMN public.okr_initiatives.owner_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: okr_initiatives_owner_user_id_fkey';

-- ASSETS MODULE
COMMENT ON COLUMN public.asset_inventory.current_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: asset_inventory_current_user_profile_fkey';
COMMENT ON COLUMN public.asset_movements.from_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: asset_movements_from_user_profile_fkey';
COMMENT ON COLUMN public.asset_movements.to_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: asset_movements_to_user_profile_fkey';
COMMENT ON COLUMN public.asset_movements.performed_by_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: asset_movements_performed_by_profile_fkey';
COMMENT ON COLUMN public.asset_movements.authorized_by_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id). FK: asset_movements_authorized_by_profile_fkey';

-- TEAMS MODULE
COMMENT ON COLUMN public.teams.leader_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id)';
COMMENT ON COLUMN public.user_team_memberships.user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id)';
COMMENT ON COLUMN public.squad_memberships.user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id)';

-- KPIs MODULE
COMMENT ON COLUMN public.kpi_metrics.owner_user_id IS 'LEGACY: Armazena profiles.id (não auth.users.id)';

-- MENTIONS
COMMENT ON COLUMN public.mentions.mentioned_user_id IS 'Armazena profiles.id (não auth.users.id)';
COMMENT ON COLUMN public.mentions.created_by IS 'Armazena profiles.id (não auth.users.id)';

-- USER PREFERENCES
COMMENT ON COLUMN public.user_saved_links.user_id IS 'Armazena profiles.id (não auth.users.id)';

-- COLUNAS QUE REALMENTE USAM auth.users.id (para clareza)
COMMENT ON COLUMN public.bu_user_memberships.user_id IS 'Armazena auth.users.id. Membership entre auth user e BU.';
COMMENT ON COLUMN public.profiles.user_id IS 'FK para auth.users.id. Link entre profile e auth user.';
COMMENT ON COLUMN public.user_roles.user_id IS 'Armazena auth.users.id. Roles globais do usuário.';
COMMENT ON COLUMN public.notifications.user_id IS 'Armazena auth.users.id. Destinatário da notificação.';
COMMENT ON COLUMN public.notification_outbox.user_id IS 'Armazena auth.users.id. Destinatário da notificação.';
COMMENT ON COLUMN public.partner_contacts.user_id IS 'Armazena auth.users.id. Link para login do contato externo.';