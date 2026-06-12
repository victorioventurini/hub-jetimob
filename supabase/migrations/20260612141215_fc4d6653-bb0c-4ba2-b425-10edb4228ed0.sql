
-- Threads do copiloto de análise
CREATE TABLE public.analysis_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  owner_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-pro',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analysis_threads_owner_bu ON public.analysis_threads(owner_profile_id, bu_id, last_message_at DESC);
CREATE INDEX idx_analysis_threads_bu ON public.analysis_threads(bu_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_threads TO authenticated;
GRANT ALL ON public.analysis_threads TO service_role;

ALTER TABLE public.analysis_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own analysis threads"
  ON public.analysis_threads FOR ALL TO authenticated
  USING (owner_profile_id = auth.uid())
  WITH CHECK (owner_profile_id = auth.uid());

-- Mensagens
CREATE TABLE public.analysis_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.analysis_threads(id) ON DELETE CASCADE,
  bu_id UUID NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_message_id TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analysis_messages_thread ON public.analysis_messages(thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_messages TO authenticated;
GRANT ALL ON public.analysis_messages TO service_role;

ALTER TABLE public.analysis_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read messages of own threads"
  ON public.analysis_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.analysis_threads t
    WHERE t.id = analysis_messages.thread_id AND t.owner_profile_id = auth.uid()
  ));

CREATE POLICY "Users insert messages on own threads"
  ON public.analysis_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.analysis_threads t
    WHERE t.id = analysis_messages.thread_id AND t.owner_profile_id = auth.uid()
  ));

CREATE POLICY "Users delete messages on own threads"
  ON public.analysis_messages FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.analysis_threads t
    WHERE t.id = analysis_messages.thread_id AND t.owner_profile_id = auth.uid()
  ));

-- updated_at trigger reutilizando função padrão
CREATE TRIGGER update_analysis_threads_updated_at
  BEFORE UPDATE ON public.analysis_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
