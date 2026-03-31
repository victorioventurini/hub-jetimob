
-- Move BizOps OKRs from Q1 (2026-Q1) to Q2 (2026-Q2) as draft

ALTER TABLE okr_team_objectives DISABLE TRIGGER trg_enforce_bu_scope_okr_team_objectives;
ALTER TABLE okr_team_objectives DISABLE TRIGGER enforce_team_objectives_limit;

UPDATE okr_team_objectives 
SET cycle_id = '8fd8d5fa-6145-4c13-8c22-5b45e5eb03c3', 
    status = 'draft', 
    updated_at = now()
WHERE id IN (
  '19b2b75e-5943-4e88-8788-e407ea88c959', 
  '5bb9d96a-35ac-4f94-ad81-1b6715de55a6'
);

ALTER TABLE okr_team_objectives ENABLE TRIGGER trg_enforce_bu_scope_okr_team_objectives;
ALTER TABLE okr_team_objectives ENABLE TRIGGER enforce_team_objectives_limit;
