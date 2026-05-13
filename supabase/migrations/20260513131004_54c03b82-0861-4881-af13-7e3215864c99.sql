
-- 1) Coluna
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT NULL;

COMMENT ON COLUMN public.profiles.cpf IS
  'CPF (somente dígitos, 11 chars). Apenas para user_type=internal. Único globalmente entre internos vivos.';

-- 2) Função de validação de CPF (algoritmo dos dígitos verificadores)
CREATE OR REPLACE FUNCTION public.is_valid_cpf(p_cpf TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
  v_sum INT;
  v_d1 INT;
  v_d2 INT;
  i INT;
BEGIN
  IF p_cpf IS NULL THEN RETURN FALSE; END IF;
  v_digits := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_digits) <> 11 THEN RETURN FALSE; END IF;
  -- rejeita sequências repetidas (00000000000, 11111111111, ...)
  IF v_digits ~ '^(\d)\1{10}$' THEN RETURN FALSE; END IF;

  -- dígito 1
  v_sum := 0;
  FOR i IN 1..9 LOOP
    v_sum := v_sum + substr(v_digits, i, 1)::INT * (11 - i);
  END LOOP;
  v_d1 := (v_sum * 10) % 11;
  IF v_d1 = 10 THEN v_d1 := 0; END IF;
  IF v_d1 <> substr(v_digits, 10, 1)::INT THEN RETURN FALSE; END IF;

  -- dígito 2
  v_sum := 0;
  FOR i IN 1..10 LOOP
    v_sum := v_sum + substr(v_digits, i, 1)::INT * (12 - i);
  END LOOP;
  v_d2 := (v_sum * 10) % 11;
  IF v_d2 = 10 THEN v_d2 := 0; END IF;
  IF v_d2 <> substr(v_digits, 11, 1)::INT THEN RETURN FALSE; END IF;

  RETURN TRUE;
END;
$$;

-- 3) Trigger BEFORE INSERT/UPDATE em profiles
CREATE OR REPLACE FUNCTION public.validate_profile_cpf()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Externos nunca têm CPF nessa estrutura
  IF NEW.user_type = 'external' THEN
    NEW.cpf := NULL;
    RETURN NEW;
  END IF;

  IF NEW.cpf IS NOT NULL THEN
    -- normaliza para somente dígitos
    NEW.cpf := regexp_replace(NEW.cpf, '\D', '', 'g');
    IF NEW.cpf = '' THEN
      NEW.cpf := NULL;
      RETURN NEW;
    END IF;
    IF NOT public.is_valid_cpf(NEW.cpf) THEN
      RAISE EXCEPTION 'CPF inválido: %', NEW.cpf
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_cpf ON public.profiles;
CREATE TRIGGER trg_validate_profile_cpf
  BEFORE INSERT OR UPDATE OF cpf, user_type ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_cpf();

-- 4) Índice único parcial: unicidade global entre internos vivos
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_internal_unique
  ON public.profiles (cpf)
  WHERE cpf IS NOT NULL
    AND user_type = 'internal'
    AND deleted_at IS NULL;
