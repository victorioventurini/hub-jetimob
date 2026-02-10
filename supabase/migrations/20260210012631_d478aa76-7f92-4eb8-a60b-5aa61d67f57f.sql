CREATE OR REPLACE VIEW public.v_all_participants
WITH (security_invoker = true)
AS
SELECT 'internal'::text AS user_type,
    p.id AS participant_id,
    p.user_id AS auth_user_id,
    p.display_name,
    p.work_email AS email,
    p.photo_url,
    p.bu_id,
    NULL::uuid AS company_id,
    NULL::text AS company_name,
    t.name AS team_name,
    jt.name AS job_title,
    (p.employment_status)::text AS status
   FROM profiles p
     LEFT JOIN teams t ON p.team_id = t.id
     LEFT JOIN job_titles jt ON p.job_title_id = jt.id
  WHERE p.deleted_at IS NULL 
    AND p.employment_status <> 'terminated'::employment_status
    AND p.user_type = 'internal'
UNION ALL
 SELECT 'external'::text AS user_type,
    pc.id AS participant_id,
    pc.user_id AS auth_user_id,
    pc.name AS display_name,
    pc.email,
    NULL::text AS photo_url,
    pca.bu_id,
    pc.external_company_id AS company_id,
    pco.name AS company_name,
    NULL::text AS team_name,
    NULL::text AS job_title,
    (pc.status)::text AS status
   FROM partner_contacts pc
     JOIN partner_contact_bu_associations pca ON pc.id = pca.partner_contact_id AND pca.is_active = true AND pca.deleted_at IS NULL
     JOIN external_companies pco ON pc.external_company_id = pco.id
  WHERE pc.deleted_at IS NULL AND pc.status = 'active'::partner_contact_status;