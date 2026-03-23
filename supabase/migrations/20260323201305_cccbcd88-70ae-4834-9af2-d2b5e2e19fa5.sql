-- Backfill: sync responsible_user_id from current_user_id where missing
ALTER TABLE asset_phone_lines DISABLE TRIGGER trg_enforce_bu_scope_asset_phone_lines;

UPDATE asset_phone_lines
SET responsible_user_id = current_user_id
WHERE current_user_id IS NOT NULL
  AND responsible_user_id IS NULL
  AND deleted_at IS NULL;

ALTER TABLE asset_phone_lines ENABLE TRIGGER trg_enforce_bu_scope_asset_phone_lines;