
ALTER TABLE partner_contact_capabilities
  DROP CONSTRAINT IF EXISTS partner_contact_capabilities_created_by_fkey;

ALTER TABLE partner_contact_capabilities DISABLE TRIGGER USER;

UPDATE partner_contact_capabilities pcc
SET created_by = p.id
FROM profiles p
WHERE pcc.created_by IS NOT NULL
  AND p.user_id = pcc.created_by;

ALTER TABLE partner_contact_capabilities ENABLE TRIGGER USER;

ALTER TABLE partner_contact_capabilities
  ADD CONSTRAINT partner_contact_capabilities_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN partner_contact_capabilities.created_by IS
  'profiles.id do criador (IDENTITY_CONVENTION §1.3). Migrado de auth.users.id em 2026-05.';
