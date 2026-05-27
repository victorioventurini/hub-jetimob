
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' from regexp_replace(
    regexp_replace(
      lower(translate(
        coalesce(input, ''),
        'áàâãäåāăąçćčďéèêëēĕėęěğíìîïĩīĭįıłńñňóòôõöøōŏőřśşšťúùûüũūŭůűųýÿžźżÁÀÂÃÄÅĀĂĄÇĆČĎÉÈÊËĒĔĖĘĚĞÍÌÎÏĨĪĬĮİŁŃÑŇÓÒÔÕÖØŌŎŐŘŚŞŠŤÚÙÛÜŨŪŬŮŰŲÝŸŽŹŻ',
        'aaaaaaaaacccdeeeeeeeeegiiiiiiiiilnnnoooooooooorssstuuuuuuuuuuyyzzzAAAAAAAAACCCDEEEEEEEEEGIIIIIIIIILNNNOOOOOOOOOORSSSTUUUUUUUUUUYYZZZ'
      )),
      '[^a-z0-9]+', '-', 'g'
    ),
    '-+', '-', 'g'
  ));
$$;

-- bu_units.slug
ALTER TABLE public.bu_units ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.bu_units DISABLE TRIGGER USER;
DO $$
DECLARE rec record; base_slug text; candidate text; counter int;
BEGIN
  FOR rec IN SELECT id, name FROM public.bu_units WHERE slug IS NULL LOOP
    base_slug := public.slugify(rec.name);
    IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'bu'; END IF;
    candidate := base_slug; counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.bu_units WHERE slug = candidate) LOOP
      counter := counter + 1; candidate := base_slug || '-' || counter;
    END LOOP;
    UPDATE public.bu_units SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;
ALTER TABLE public.bu_units ENABLE TRIGGER USER;
ALTER TABLE public.bu_units ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bu_units_slug_unique ON public.bu_units(slug);

CREATE OR REPLACE FUNCTION public.bu_units_autoslug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base_slug text; candidate text; counter int;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.slugify(NEW.name);
    IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'bu'; END IF;
    candidate := base_slug; counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.bu_units WHERE slug = candidate AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      counter := counter + 1; candidate := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bu_units_autoslug_trigger ON public.bu_units;
CREATE TRIGGER bu_units_autoslug_trigger
BEFORE INSERT OR UPDATE OF name, slug ON public.bu_units
FOR EACH ROW EXECUTE FUNCTION public.bu_units_autoslug();

-- areas.slug
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.areas DISABLE TRIGGER USER;
DO $$
DECLARE rec record; base_slug text; candidate text; counter int;
BEGIN
  FOR rec IN SELECT id, name, bu_id FROM public.areas WHERE slug IS NULL LOOP
    base_slug := public.slugify(rec.name);
    IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'area'; END IF;
    candidate := base_slug; counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.areas WHERE slug = candidate AND bu_id = rec.bu_id) LOOP
      counter := counter + 1; candidate := base_slug || '-' || counter;
    END LOOP;
    UPDATE public.areas SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;
ALTER TABLE public.areas ENABLE TRIGGER USER;
ALTER TABLE public.areas ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS areas_bu_slug_unique ON public.areas(bu_id, slug);

CREATE OR REPLACE FUNCTION public.areas_autoslug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base_slug text; candidate text; counter int;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.slugify(NEW.name);
    IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'area'; END IF;
    candidate := base_slug; counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.areas WHERE slug = candidate AND bu_id = NEW.bu_id AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      counter := counter + 1; candidate := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS areas_autoslug_trigger ON public.areas;
CREATE TRIGGER areas_autoslug_trigger
BEFORE INSERT OR UPDATE OF name, slug ON public.areas
FOR EACH ROW EXECUTE FUNCTION public.areas_autoslug();

-- teams.slug
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.teams DISABLE TRIGGER USER;
DO $$
DECLARE rec record; base_slug text; candidate text; counter int;
BEGIN
  FOR rec IN SELECT id, name, bu_id FROM public.teams WHERE slug IS NULL LOOP
    base_slug := public.slugify(rec.name);
    IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'team'; END IF;
    candidate := base_slug; counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.teams WHERE slug = candidate AND bu_id = rec.bu_id) LOOP
      counter := counter + 1; candidate := base_slug || '-' || counter;
    END LOOP;
    UPDATE public.teams SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;
ALTER TABLE public.teams ENABLE TRIGGER USER;
ALTER TABLE public.teams ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS teams_bu_slug_unique ON public.teams(bu_id, slug);

CREATE OR REPLACE FUNCTION public.teams_autoslug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base_slug text; candidate text; counter int;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.slugify(NEW.name);
    IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'team'; END IF;
    candidate := base_slug; counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.teams WHERE slug = candidate AND bu_id = NEW.bu_id AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      counter := counter + 1; candidate := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS teams_autoslug_trigger ON public.teams;
CREATE TRIGGER teams_autoslug_trigger
BEFORE INSERT OR UPDATE OF name, slug ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.teams_autoslug();

-- internal_api_tokens
CREATE TABLE IF NOT EXISTS public.internal_api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  allowed_system text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  scopes text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT ON public.internal_api_tokens TO authenticated;
GRANT ALL ON public.internal_api_tokens TO service_role;

ALTER TABLE public.internal_api_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internal_api_tokens_select_admin ON public.internal_api_tokens;
CREATE POLICY internal_api_tokens_select_admin
ON public.internal_api_tokens FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.internal_api_tokens_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('active','inactive','revoked','expired') THEN
    RAISE EXCEPTION 'internal_api_tokens.status invalido: %', NEW.status;
  END IF;
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= NEW.created_at THEN
    RAISE EXCEPTION 'internal_api_tokens.expires_at deve ser maior que created_at';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS internal_api_tokens_validate_trigger ON public.internal_api_tokens;
CREATE TRIGGER internal_api_tokens_validate_trigger
BEFORE INSERT OR UPDATE ON public.internal_api_tokens
FOR EACH ROW EXECUTE FUNCTION public.internal_api_tokens_validate();

DROP TRIGGER IF EXISTS update_internal_api_tokens_updated_at ON public.internal_api_tokens;
CREATE TRIGGER update_internal_api_tokens_updated_at
BEFORE UPDATE ON public.internal_api_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
