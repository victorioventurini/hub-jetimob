-- Trigger para criar perfil automaticamente ao fazer signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_display_name TEXT;
BEGIN
  v_email := NEW.email;
  
  -- Extrair nome do e-mail (antes do @)
  v_first_name := COALESCE(
    NEW.raw_user_meta_data ->> 'first_name',
    split_part(split_part(v_email, '@', 1), '.', 1)
  );
  v_first_name := INITCAP(v_first_name);
  
  v_last_name := COALESCE(
    NEW.raw_user_meta_data ->> 'last_name',
    CASE 
      WHEN position('.' in split_part(v_email, '@', 1)) > 0 
      THEN split_part(split_part(v_email, '@', 1), '.', 2)
      ELSE ''
    END
  );
  v_last_name := INITCAP(v_last_name);
  
  v_display_name := TRIM(v_first_name || ' ' || v_last_name);
  
  -- Criar perfil básico (campos obrigatórios com valores padrão)
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    display_name,
    work_email,
    job_title,
    work_mode,
    city,
    state,
    start_date,
    employment_status
  ) VALUES (
    NEW.id,
    v_first_name,
    COALESCE(NULLIF(v_last_name, ''), 'Jetimober'),
    v_display_name,
    v_email,
    'A definir',
    'hybrid',
    'Porto Alegre',
    'RS',
    CURRENT_DATE,
    'active'
  );
  
  -- Criar papel padrão (colaborador)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'collaborator');
  
  RETURN NEW;
END;
$$;

-- Trigger após criar usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();