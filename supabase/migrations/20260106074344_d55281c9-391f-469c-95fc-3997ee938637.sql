-- Performance indexes for frequently filtered columns
-- PR 6: Database Indexes

-- ai_agent_logs: filtered by bu_id and created_at for daily counts
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_bu_created 
ON public.ai_agent_logs(bu_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_user_bu_created 
ON public.ai_agent_logs(user_id, bu_id, created_at DESC);

-- profiles: filtered by bu_id, team_id, employment_status
CREATE INDEX IF NOT EXISTS idx_profiles_bu_id 
ON public.profiles(bu_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_team_id 
ON public.profiles(team_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_employment_status 
ON public.profiles(employment_status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_bu_employment 
ON public.profiles(bu_id, employment_status) WHERE deleted_at IS NULL;

-- teams: filtered by bu_id
CREATE INDEX IF NOT EXISTS idx_teams_bu_id 
ON public.teams(bu_id) WHERE deleted_at IS NULL;

-- okr_team_objectives: filtered by team_id, bu_id, status
CREATE INDEX IF NOT EXISTS idx_okr_team_objectives_team 
ON public.okr_team_objectives(team_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_okr_team_objectives_bu 
ON public.okr_team_objectives(bu_id) WHERE deleted_at IS NULL;

-- okr_team_key_results: filtered by team_objective_id
CREATE INDEX IF NOT EXISTS idx_okr_team_krs_objective 
ON public.okr_team_key_results(team_objective_id) WHERE deleted_at IS NULL;

-- okr_org_objectives: filtered by bu_id
CREATE INDEX IF NOT EXISTS idx_okr_org_objectives_bu 
ON public.okr_org_objectives(bu_id) WHERE deleted_at IS NULL;

-- okr_org_key_results: filtered by org_objective_id
CREATE INDEX IF NOT EXISTS idx_okr_org_krs_objective 
ON public.okr_org_key_results(org_objective_id) WHERE deleted_at IS NULL;

-- asset_inventory: filtered by bu_id, status, category_id
CREATE INDEX IF NOT EXISTS idx_asset_inventory_bu 
ON public.asset_inventory(bu_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_inventory_bu_status 
ON public.asset_inventory(bu_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_inventory_category 
ON public.asset_inventory(category_id) WHERE deleted_at IS NULL;

-- asset_movements: filtered by asset_id, occurred_at
CREATE INDEX IF NOT EXISTS idx_asset_movements_asset_occurred 
ON public.asset_movements(asset_id, occurred_at DESC);

-- asset_keyrings: filtered by bu_id, status
CREATE INDEX IF NOT EXISTS idx_asset_keyrings_bu 
ON public.asset_keyrings(bu_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_keyrings_bu_status 
ON public.asset_keyrings(bu_id, status) WHERE deleted_at IS NULL;

-- asset_gift_items: filtered by bu_id
CREATE INDEX IF NOT EXISTS idx_asset_gift_items_bu 
ON public.asset_gift_items(bu_id) WHERE deleted_at IS NULL;

-- tickets: filtered by bu_id, status, created_at
CREATE INDEX IF NOT EXISTS idx_tickets_bu 
ON public.tickets(bu_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_bu_status 
ON public.tickets(bu_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_bu_created 
ON public.tickets(bu_id, created_at DESC) WHERE deleted_at IS NULL;

-- notifications: filtered by user_id, is_read
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON public.notifications(user_id, created_at DESC);

-- bu_user_memberships: filtered by user_id, bu_id
CREATE INDEX IF NOT EXISTS idx_bu_memberships_user 
ON public.bu_user_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_bu_memberships_bu 
ON public.bu_user_memberships(bu_id);

-- user_team_memberships: filtered by user_id, team_id (without is_active filter)
CREATE INDEX IF NOT EXISTS idx_user_team_memberships_user 
ON public.user_team_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_user_team_memberships_team 
ON public.user_team_memberships(team_id);