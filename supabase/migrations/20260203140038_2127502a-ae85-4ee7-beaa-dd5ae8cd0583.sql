-- =============================================================
-- v2.83.0: KPI Data Contributors Table
-- Separates data entry responsibility from ownership accountability
-- =============================================================

-- Create contributor roles enum for future extensibility
CREATE TYPE public.kpi_contributor_role AS ENUM ('data_entry', 'reviewer');

-- Table for KPI data contributors (explicit attribution)
CREATE TABLE public.kpi_data_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.kpi_metrics(id) ON DELETE CASCADE,
  contributor_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.kpi_contributor_role NOT NULL DEFAULT 'data_entry',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id),
  deleted_at timestamptz,
  
  -- Unique constraint: one user per KPI per active status
  CONSTRAINT uq_kpi_contributor UNIQUE NULLS NOT DISTINCT (kpi_id, contributor_user_id, deleted_at)
);

-- Enable RLS
ALTER TABLE public.kpi_data_contributors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "kpi_contributors_select" 
  ON public.kpi_data_contributors 
  FOR SELECT 
  USING (is_profile_bu_member(my_profile_id(), bu_id));

CREATE POLICY "kpi_contributors_insert" 
  ON public.kpi_data_contributors 
  FOR INSERT 
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'kpis.metric.update:bu')
    OR (
      -- Owner can also manage contributors of their own KPIs
      EXISTS (
        SELECT 1 FROM public.kpi_metrics km
        WHERE km.id = kpi_id 
        AND km.owner_user_id = my_profile_id()
        AND km.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "kpi_contributors_update" 
  ON public.kpi_data_contributors 
  FOR UPDATE 
  USING (
    has_permission(my_profile_id(), bu_id, 'kpis.metric.update:bu')
    OR (
      EXISTS (
        SELECT 1 FROM public.kpi_metrics km
        WHERE km.id = kpi_id 
        AND km.owner_user_id = my_profile_id()
        AND km.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "kpi_contributors_delete" 
  ON public.kpi_data_contributors 
  FOR DELETE 
  USING (
    has_permission(my_profile_id(), bu_id, 'kpis.metric.update:bu')
    OR (
      EXISTS (
        SELECT 1 FROM public.kpi_metrics km
        WHERE km.id = kpi_id 
        AND km.owner_user_id = my_profile_id()
        AND km.deleted_at IS NULL
      )
    )
  );

-- Performance Indexes
CREATE INDEX idx_kpi_contributors_user_active 
  ON public.kpi_data_contributors(contributor_user_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_kpi_contributors_kpi_active 
  ON public.kpi_data_contributors(kpi_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_kpi_contributors_bu 
  ON public.kpi_data_contributors(bu_id);

-- Comments for documentation
COMMENT ON TABLE public.kpi_data_contributors IS 
  'v2.83.0: Manages who can contribute data to a KPI, separate from ownership accountability';

COMMENT ON COLUMN public.kpi_data_contributors.role IS 
  'data_entry: Can add values; reviewer: Can validate entries (future use)';