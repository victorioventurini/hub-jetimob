-- ============================================================
-- OKR WIZARD SESSIONS - Persistência de sessões de wizard
-- ============================================================

-- Main sessions table
CREATE TABLE public.okr_wizard_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  wizard_type TEXT NOT NULL CHECK (wizard_type IN ('collaborator', 'leader-prep', 'team-checkin', 'managers-checkin', 'clevel-checkin')),
  started_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  -- JSONB for flexible data storage
  decisions JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  ai_insights_shown JSONB DEFAULT '[]'::jsonb,
  reflection_data JSONB DEFAULT '{}'::jsonb,
  meeting_notes TEXT,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- KR-specific actions taken during wizard
CREATE TABLE public.okr_wizard_kr_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.okr_wizard_sessions(id) ON DELETE CASCADE,
  kr_id UUID NOT NULL REFERENCES public.okr_team_key_results(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('discuss_group', 'followup_1on1', 'at_risk', 'needs_attention', 'checked_in', 'skipped')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_okr_wizard_sessions_bu_id ON public.okr_wizard_sessions(bu_id);
CREATE INDEX idx_okr_wizard_sessions_started_by ON public.okr_wizard_sessions(started_by);
CREATE INDEX idx_okr_wizard_sessions_team_id ON public.okr_wizard_sessions(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_okr_wizard_sessions_status ON public.okr_wizard_sessions(status) WHERE status = 'in_progress';
CREATE INDEX idx_okr_wizard_sessions_wizard_type ON public.okr_wizard_sessions(wizard_type);
CREATE INDEX idx_okr_wizard_kr_actions_session_id ON public.okr_wizard_kr_actions(session_id);
CREATE INDEX idx_okr_wizard_kr_actions_kr_id ON public.okr_wizard_kr_actions(kr_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.okr_wizard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_wizard_kr_actions ENABLE ROW LEVEL SECURITY;

-- Sessions: Users can view their own sessions
CREATE POLICY "Users can view own wizard sessions"
ON public.okr_wizard_sessions
FOR SELECT
USING (started_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Sessions: Users can insert their own sessions
CREATE POLICY "Users can create own wizard sessions"
ON public.okr_wizard_sessions
FOR INSERT
WITH CHECK (started_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Sessions: Users can update their own sessions
CREATE POLICY "Users can update own wizard sessions"
ON public.okr_wizard_sessions
FOR UPDATE
USING (started_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- KR Actions: Users can view actions from their sessions
CREATE POLICY "Users can view kr actions from own sessions"
ON public.okr_wizard_kr_actions
FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public.okr_wizard_sessions 
    WHERE started_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- KR Actions: Users can insert actions in their sessions
CREATE POLICY "Users can create kr actions in own sessions"
ON public.okr_wizard_kr_actions
FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT id FROM public.okr_wizard_sessions 
    WHERE started_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE TRIGGER update_okr_wizard_sessions_updated_at
BEFORE UPDATE ON public.okr_wizard_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set bu_id from profile context
CREATE OR REPLACE FUNCTION public.set_okr_wizard_session_bu_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bu_id IS NULL THEN
    SELECT bu_id INTO NEW.bu_id
    FROM public.profiles
    WHERE id = NEW.started_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_okr_wizard_session_bu_id_trigger
BEFORE INSERT ON public.okr_wizard_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_okr_wizard_session_bu_id();