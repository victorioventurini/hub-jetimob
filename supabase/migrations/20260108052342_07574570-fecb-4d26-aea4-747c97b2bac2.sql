
-- =====================================================
-- REMOVER team_leader DO ENUM app_role (COMPLETO)
-- =====================================================

-- PASSO 1: Dropar TODAS as policies do schema public
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- PASSO 2: Dropar a função has_role que depende do enum
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- PASSO 3: Remover defaults das colunas
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.bu_user_memberships ALTER COLUMN role_in_bu DROP DEFAULT;

-- PASSO 4: Alterar colunas para text
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text;
ALTER TABLE public.bu_user_memberships ALTER COLUMN role_in_bu TYPE text;

-- PASSO 5: Dropar enum antigo
DROP TYPE public.app_role;

-- PASSO 6: Criar novo enum sem team_leader
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'collaborator');

-- PASSO 7: Converter colunas de volta
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;
ALTER TABLE public.bu_user_memberships ALTER COLUMN role_in_bu TYPE public.app_role USING role_in_bu::public.app_role;

-- PASSO 8: Restaurar defaults
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'collaborator'::public.app_role;
ALTER TABLE public.bu_user_memberships ALTER COLUMN role_in_bu SET DEFAULT 'collaborator'::public.app_role;

-- PASSO 9: Recriar função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- PASSO 10: Comentário
COMMENT ON TYPE public.app_role IS 'Roles: super_admin (admin global), admin (admin de BU), collaborator (membro). Liderança de time usa teams.leader_user_id.';
