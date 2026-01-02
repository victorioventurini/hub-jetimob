-- ========================
-- KPI MODULE - TABLES
-- ========================

-- Enum for KPI categories
CREATE TYPE public.kpi_category AS ENUM (
  'financeiro',
  'growth',
  'cs',
  'produto',
  'operacoes',
  'pessoas'
);

-- Enum for KPI direction
CREATE TYPE public.kpi_direction AS ENUM ('up', 'down');

-- Enum for KPI frequency
CREATE TYPE public.kpi_frequency AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'quarterly'
);

-- Enum for KPI status
CREATE TYPE public.kpi_status AS ENUM ('active', 'inactive');

-- Enum for value source
CREATE TYPE public.kpi_value_source AS ENUM ('manual', 'integration', 'calculation');

-- ========================
-- KPI Metrics Table
-- ========================
CREATE TABLE public.kpi_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category kpi_category NOT NULL,
  owner_user_id UUID REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.teams(id),
  unit TEXT NOT NULL DEFAULT '%',
  direction kpi_direction NOT NULL DEFAULT 'up',
  frequency kpi_frequency NOT NULL DEFAULT 'monthly',
  target_value NUMERIC,
  status kpi_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ========================
-- KPI Values Table
-- ========================
CREATE TABLE public.kpi_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID NOT NULL REFERENCES public.kpi_metrics(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  reference_date DATE NOT NULL,
  source kpi_value_source NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(kpi_id, reference_date)
);

-- ========================
-- Indexes
-- ========================
CREATE INDEX idx_kpi_metrics_category ON public.kpi_metrics(category);
CREATE INDEX idx_kpi_metrics_team ON public.kpi_metrics(team_id);
CREATE INDEX idx_kpi_metrics_status ON public.kpi_metrics(status);
CREATE INDEX idx_kpi_values_kpi_id ON public.kpi_values(kpi_id);
CREATE INDEX idx_kpi_values_reference_date ON public.kpi_values(reference_date);

-- ========================
-- RLS Policies
-- ========================
ALTER TABLE public.kpi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_values ENABLE ROW LEVEL SECURITY;

-- KPI Metrics Policies
CREATE POLICY "Users can view active KPIs"
ON public.kpi_metrics
FOR SELECT
USING (deleted_at IS NULL AND status = 'active');

CREATE POLICY "Admins can manage all KPIs"
ON public.kpi_metrics
FOR ALL
USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "Team leaders can manage their team KPIs"
ON public.kpi_metrics
FOR ALL
USING (
  team_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = kpi_metrics.team_id
    AND t.leader_user_id = auth.uid()
  )
);

-- KPI Values Policies
CREATE POLICY "Users can view KPI values"
ON public.kpi_values
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.kpi_metrics k
    WHERE k.id = kpi_values.kpi_id
    AND k.deleted_at IS NULL
    AND k.status = 'active'
  )
);

CREATE POLICY "Admins can manage all KPI values"
ON public.kpi_values
FOR ALL
USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "KPI owners can insert values"
ON public.kpi_values
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kpi_metrics k
    WHERE k.id = kpi_values.kpi_id
    AND (k.owner_user_id = auth.uid() OR is_admin_or_ceo(auth.uid()))
  )
);

-- ========================
-- Triggers
-- ========================
CREATE TRIGGER update_kpi_metrics_updated_at
BEFORE UPDATE ON public.kpi_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================
-- Audit Trigger for KPIs
-- ========================
CREATE OR REPLACE FUNCTION public.kpi_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'create', 'kpi_metric', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), 'update', 'kpi_metric', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values)
    VALUES (auth.uid(), 'delete', 'kpi_metric', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER kpi_metrics_audit
AFTER INSERT OR UPDATE OR DELETE ON public.kpi_metrics
FOR EACH ROW
EXECUTE FUNCTION public.kpi_audit_trigger();