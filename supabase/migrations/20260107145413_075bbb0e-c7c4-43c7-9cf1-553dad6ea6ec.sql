-- DT-002: Enforce bu_id NOT NULL on critical tables

-- Step 1: Temporarily disable enforce_bu_scope trigger on cycles
ALTER TABLE cycles DISABLE TRIGGER trg_enforce_bu_scope_cycles;

-- Step 2: Fix orphan cycles by assigning to Jetimob BU
UPDATE cycles 
SET bu_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE bu_id IS NULL;

-- Step 3: Re-enable the trigger
ALTER TABLE cycles ENABLE TRIGGER trg_enforce_bu_scope_cycles;

-- Step 4: Make bu_id NOT NULL on OKR tables
ALTER TABLE okr_org_objectives 
  ALTER COLUMN bu_id SET NOT NULL;

ALTER TABLE okr_org_key_results 
  ALTER COLUMN bu_id SET NOT NULL;

ALTER TABLE okr_team_objectives 
  ALTER COLUMN bu_id SET NOT NULL;

ALTER TABLE okr_team_key_results 
  ALTER COLUMN bu_id SET NOT NULL;

ALTER TABLE okr_initiatives 
  ALTER COLUMN bu_id SET NOT NULL;

ALTER TABLE okr_checkins 
  ALTER COLUMN bu_id SET NOT NULL;

ALTER TABLE okr_contributions 
  ALTER COLUMN bu_id SET NOT NULL;

-- Step 5: Make bu_id NOT NULL on Teams and Cycles
ALTER TABLE teams 
  ALTER COLUMN bu_id SET NOT NULL;

ALTER TABLE cycles 
  ALTER COLUMN bu_id SET NOT NULL;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN okr_org_objectives.bu_id IS 'Required: Business Unit scope for multi-tenancy';
COMMENT ON COLUMN teams.bu_id IS 'Required: Business Unit scope for multi-tenancy';
COMMENT ON COLUMN cycles.bu_id IS 'Required: Business Unit scope for multi-tenancy';