
-- Fix search_path on helper functions
CREATE OR REPLACE FUNCTION public.project_status_label(p_status TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_status
    WHEN 'planned'     THEN 'Planejado'
    WHEN 'in_progress' THEN 'Em andamento'
    WHEN 'paused'      THEN 'Pausado'
    WHEN 'done'        THEN 'Concluído'
    WHEN 'cancelled'   THEN 'Cancelado'
    ELSE p_status
  END;
$$;

CREATE OR REPLACE FUNCTION public.milestone_status_label(p_status TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_status
    WHEN 'todo'        THEN 'A fazer'
    WHEN 'in_progress' THEN 'Em andamento'
    WHEN 'done'        THEN 'Concluído'
    ELSE p_status
  END;
$$;
