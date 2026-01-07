-- Add enforce_bu_scope trigger to okr_contributions table
CREATE TRIGGER trg_enforce_bu_scope_okr_contributions
  BEFORE INSERT OR UPDATE ON okr_contributions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_bu_scope();