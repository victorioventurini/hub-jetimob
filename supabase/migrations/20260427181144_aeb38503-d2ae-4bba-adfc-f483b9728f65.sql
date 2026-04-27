-- =====================================================================
-- Milestone soft-delete authority
-- ---------------------------------------------------------------------
-- Garante que apenas project owner / bu admin / líder do project owner /
-- portador de 'projects.milestone.delete:bu' possa marcar deleted_at.
-- O milestone owner continua podendo editar TUDO (exceto deleted_at).
-- Implementado via trigger BEFORE UPDATE (sem CHECK constraint, conforme
-- mem://standards/database/check-constraint-prohibition).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.enforce_milestone_soft_delete_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_profile_id uuid;
  v_project          RECORD;
  v_authorized       boolean := false;
BEGIN
  -- Só age quando deleted_at muda (set ou unset)
  IF OLD.deleted_at IS NOT DISTINCT FROM NEW.deleted_at THEN
    RETURN NEW;
  END IF;

  -- Plataforma admin sempre passa
  IF is_platform_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  v_actor_profile_id := my_profile_id();

  SELECT p.id, p.owner_id, p.bu_id
    INTO v_project
    FROM public.projects p
   WHERE p.id = NEW.project_id;

  IF v_project IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_PRIVILEGE: parent project not found'
      USING ERRCODE = '42501';
  END IF;

  -- Caminhos autorizados (espelham project_milestones_delete policy)
  IF v_project.owner_id = v_actor_profile_id THEN
    v_authorized := true;
  ELSIF is_bu_admin(auth.uid(), v_project.bu_id) THEN
    v_authorized := true;
  ELSIF is_leader_of_project_owner(v_actor_profile_id, v_project.owner_id, v_project.bu_id) THEN
    v_authorized := true;
  ELSIF has_permission(v_actor_profile_id, v_project.bu_id, 'projects.milestone.delete:bu'::text) THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'INSUFFICIENT_PRIVILEGE: only the project owner can remove milestones'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_milestone_soft_delete_authority
  ON public.project_milestones;

CREATE TRIGGER trg_enforce_milestone_soft_delete_authority
  BEFORE UPDATE OF deleted_at ON public.project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_milestone_soft_delete_authority();

COMMENT ON FUNCTION public.enforce_milestone_soft_delete_authority() IS
  'Bloqueia milestone owner de soft-deletar marcos. Apenas project owner / bu admin / líder / projects.milestone.delete:bu podem alterar deleted_at. Ver mem://features/projects/milestone-permissions-row-aware.';
