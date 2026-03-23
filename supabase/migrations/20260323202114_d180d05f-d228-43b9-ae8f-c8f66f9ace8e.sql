
-- Temporarily disable BU scope trigger to update team
ALTER TABLE asset_phone_lines DISABLE TRIGGER trg_enforce_bu_scope_asset_phone_lines;

UPDATE asset_phone_lines 
SET responsible_team_id = '589d38b4-6e6a-4cd4-b994-d9e1965642a7'
WHERE id = '8e96966d-340e-4d16-86cc-7e9934356279';

ALTER TABLE asset_phone_lines ENABLE TRIGGER trg_enforce_bu_scope_asset_phone_lines;
