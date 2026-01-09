-- =====================================================
-- CORREÇÃO GLOBAL: PROFILE SELF-ACCESS + PREVENÇÃO
-- =====================================================

-- 1) POLÍTICAS RLS (profiles_select_own já existe, verificar update)
-- A policy profiles_update_own já existe, mas não tem WITH CHECK
-- Vamos recriar com proteção adequada

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2) FUNÇÃO DE SYNC: profiles.bu_id <- membership default
CREATE OR REPLACE FUNCTION public.sync_profile_bu_to_default_membership(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_bu_id uuid;
BEGIN
  -- Buscar BU default do membership
  SELECT bu_id INTO v_default_bu_id
  FROM bu_user_memberships
  WHERE user_id = p_user_id AND is_default = true
  LIMIT 1;
  
  -- Fallback: primeira membership por created_at
  IF v_default_bu_id IS NULL THEN
    SELECT bu_id INTO v_default_bu_id
    FROM bu_user_memberships
    WHERE user_id = p_user_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  -- Atualizar profile.bu_id se diferente
  IF v_default_bu_id IS NOT NULL THEN
    UPDATE profiles
    SET bu_id = v_default_bu_id, updated_at = now()
    WHERE user_id = p_user_id
      AND (bu_id IS DISTINCT FROM v_default_bu_id);
  END IF;
END;
$$;

-- 3) TRIGGER: Sincronizar profile.bu_id quando membership default mudar
CREATE OR REPLACE FUNCTION public.trg_sync_profile_bu_on_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só processar se is_default = true (novo ou alterado para true)
  IF TG_OP = 'INSERT' AND NEW.is_default = true THEN
    PERFORM sync_profile_bu_to_default_membership(NEW.user_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.is_default = true AND (OLD.is_default = false OR OLD.bu_id IS DISTINCT FROM NEW.bu_id) THEN
    PERFORM sync_profile_bu_to_default_membership(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_membership_sync_profile_bu ON bu_user_memberships;

CREATE TRIGGER trg_membership_sync_profile_bu
AFTER INSERT OR UPDATE ON bu_user_memberships
FOR EACH ROW
EXECUTE FUNCTION trg_sync_profile_bu_on_membership_change();

-- 4) TRIGGER: Proteger campos críticos do profile (user_id, bu_id)
CREATE OR REPLACE FUNCTION public.trg_protect_profile_critical_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Impedir alteração de user_id
  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Não é permitido alterar user_id do profile';
  END IF;
  
  -- Impedir alteração de bu_id por client (exceto se chamado por trigger/function interna)
  -- Verificar se é uma chamada normal (não de trigger interno)
  -- Usamos current_setting para detectar se é chamada interna
  IF OLD.bu_id IS DISTINCT FROM NEW.bu_id THEN
    -- Permitir apenas se for admin ou chamada interna
    IF NOT (is_platform_admin(auth.uid()) OR current_setting('app.internal_call', true) = 'true') THEN
      RAISE EXCEPTION 'Não é permitido alterar bu_id do profile diretamente. Use a gestão de BU.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_protect_critical ON profiles;

CREATE TRIGGER trg_profile_protect_critical
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION trg_protect_profile_critical_fields();

-- 5) Ajustar função sync para usar setting interno
CREATE OR REPLACE FUNCTION public.sync_profile_bu_to_default_membership(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_bu_id uuid;
BEGIN
  -- Marcar como chamada interna para bypass do trigger de proteção
  PERFORM set_config('app.internal_call', 'true', true);
  
  -- Buscar BU default do membership
  SELECT bu_id INTO v_default_bu_id
  FROM bu_user_memberships
  WHERE user_id = p_user_id AND is_default = true
  LIMIT 1;
  
  -- Fallback: primeira membership por created_at
  IF v_default_bu_id IS NULL THEN
    SELECT bu_id INTO v_default_bu_id
    FROM bu_user_memberships
    WHERE user_id = p_user_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  -- Atualizar profile.bu_id se diferente
  IF v_default_bu_id IS NOT NULL THEN
    UPDATE profiles
    SET bu_id = v_default_bu_id, updated_at = now()
    WHERE user_id = p_user_id
      AND (bu_id IS DISTINCT FROM v_default_bu_id);
  END IF;
  
  -- Limpar setting
  PERFORM set_config('app.internal_call', 'false', true);
END;
$$;