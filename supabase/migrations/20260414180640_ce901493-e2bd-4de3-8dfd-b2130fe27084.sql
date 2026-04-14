
DROP POLICY IF EXISTS profiles_select_bu_v2 ON profiles;

CREATE POLICY profiles_select_bu_v2 ON profiles
  FOR SELECT TO authenticated
  USING (
    -- Original: viewer é membro da BU primária do perfil
    is_profile_bu_member(my_profile_id(), bu_id)
    OR
    -- Novo: viewer e perfil compartilham qualquer BU via memberships
    EXISTS (
      SELECT 1
      FROM bu_user_memberships my_m
      JOIN bu_user_memberships their_m 
        ON their_m.bu_id = my_m.bu_id
      WHERE my_m.profile_id = my_profile_id()
        AND their_m.profile_id = profiles.id
        AND my_m.deleted_at IS NULL
        AND their_m.deleted_at IS NULL
    )
  );
