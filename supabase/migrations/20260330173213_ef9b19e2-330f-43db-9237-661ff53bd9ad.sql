
-- ============================================================
-- Calendário de Ritos: ritual_cadences + ritual_occurrences
-- ============================================================

-- 1. ritual_cadences — configuração de cadência por rito e time
CREATE TABLE public.ritual_cadences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  wizard_type text NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month int CHECK (day_of_month BETWEEN 1 AND 28),
  month_week_ordinal int CHECK (month_week_ordinal BETWEEN 1 AND 4),
  start_date date NOT NULL,
  end_date date,
  responsible_profile_id uuid REFERENCES public.profiles(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. ritual_occurrences — cada data planejada
CREATE TABLE public.ritual_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  cadence_id uuid REFERENCES public.ritual_cadences(id) ON DELETE CASCADE,
  wizard_type text NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  planned_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed_on_time', 'completed_late', 'missed', 'rescheduled')),
  actual_date date,
  rescheduled_from date,
  rescheduled_to date,
  session_id uuid REFERENCES public.okr_wizard_sessions(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_ritual_cadences_bu_active ON public.ritual_cadences (bu_id, is_active);
CREATE INDEX idx_ritual_occurrences_lookup ON public.ritual_occurrences (bu_id, wizard_type, team_id, planned_date);
CREATE INDEX idx_ritual_occurrences_cadence_status ON public.ritual_occurrences (cadence_id, status);
CREATE INDEX idx_ritual_occurrences_session ON public.ritual_occurrences (session_id) WHERE session_id IS NOT NULL;

-- 4. Updated_at trigger
CREATE TRIGGER update_ritual_cadences_updated_at
  BEFORE UPDATE ON public.ritual_cadences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ritual_occurrences_updated_at
  BEFORE UPDATE ON public.ritual_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE public.ritual_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_occurrences ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies — ritual_cadences

-- Admin BU: CRUD completo
CREATE POLICY "bu_admin_cadences_all" ON public.ritual_cadences
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.is_bu_admin(auth.uid(), bu_id)
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.is_bu_admin(auth.uid(), bu_id)
  );

-- Membros da BU: leitura
CREATE POLICY "bu_members_cadences_select" ON public.ritual_cadences
  FOR SELECT
  TO authenticated
  USING (
    public.is_profile_bu_member(public.my_profile_id(), bu_id)
  );

-- 7. RLS Policies — ritual_occurrences

-- Admin BU: CRUD completo
CREATE POLICY "bu_admin_occurrences_all" ON public.ritual_occurrences
  FOR ALL
  TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.is_bu_admin(auth.uid(), bu_id)
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.is_bu_admin(auth.uid(), bu_id)
  );

-- Membros da BU: leitura
CREATE POLICY "bu_members_occurrences_select" ON public.ritual_occurrences
  FOR SELECT
  TO authenticated
  USING (
    public.is_profile_bu_member(public.my_profile_id(), bu_id)
  );

-- 8. Função SQL para marcar ocorrências missed (chamada pelo cron)
CREATE OR REPLACE FUNCTION public.mark_missed_ritual_occurrences()
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH updated AS (
    UPDATE public.ritual_occurrences
    SET status = 'missed', updated_at = now()
    WHERE status = 'scheduled'
      AND planned_date < CURRENT_DATE - 1
      AND session_id IS NULL
    RETURNING id
  )
  SELECT count(*)::int FROM updated;
$$;

COMMENT ON TABLE public.ritual_cadences IS 'Configurações de cadência de rituais por BU/time';
COMMENT ON TABLE public.ritual_occurrences IS 'Ocorrências planejadas de rituais geradas a partir de cadências';
COMMENT ON FUNCTION public.mark_missed_ritual_occurrences IS 'Marca ocorrências passadas sem sessão como missed — chamada pelo cron-dispatcher';
