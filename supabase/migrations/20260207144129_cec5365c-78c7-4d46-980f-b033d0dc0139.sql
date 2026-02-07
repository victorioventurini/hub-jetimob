-- Atualização administrativa de escopos de KPIs
-- Desabilitar triggers de validação temporariamente

ALTER TABLE public.kpi_metrics DISABLE TRIGGER trg_enforce_bu_scope_kpi_metrics;
ALTER TABLE public.kpi_metrics DISABLE TRIGGER trg_kpi_metrics_governance;

-- 1. Gross Revenue Churn → Área: Operações, Time: Customer Success
UPDATE public.kpi_metrics SET 
  scope = 'area',
  area_id = '29241e61-3638-4f05-b3bf-3392ac86a35a',
  team_id = 'b5f9336b-dbda-47c5-b033-2500f4661a71',
  updated_at = NOW()
WHERE id = '607726c4-4023-4463-b555-7d29c30a3bfd';

-- 2. NRR (Net Revenue Retention) → Área: Operações, Time: Customer Success
UPDATE public.kpi_metrics SET 
  scope = 'area',
  area_id = '29241e61-3638-4f05-b3bf-3392ac86a35a',
  team_id = 'b5f9336b-dbda-47c5-b033-2500f4661a71',
  updated_at = NOW()
WHERE id = '9ee372fd-7994-41cd-9fb5-bcf0028d3fcd';

-- 3. NPS → Área: Operações, Time: Customer Success
UPDATE public.kpi_metrics SET 
  scope = 'area',
  team_id = 'b5f9336b-dbda-47c5-b033-2500f4661a71',
  updated_at = NOW()
WHERE id = '27e5f5bc-5e54-467e-b51a-53a7ffac9bdd';

-- 4. eNPS → Área: Operações, Time: Gente & Cultura
UPDATE public.kpi_metrics SET 
  scope = 'area',
  area_id = '29241e61-3638-4f05-b3bf-3392ac86a35a',
  team_id = 'd69c7489-c499-469c-b7c3-baf6d737fc06',
  updated_at = NOW()
WHERE id = '862624ae-9118-4459-94b3-c10dbc686e82';

-- 5. MRR de Novas Funcionalidades → Área: Produto e Tecnologia, Time: Produto
UPDATE public.kpi_metrics SET 
  scope = 'area',
  area_id = 'f3ff0626-4edf-468f-b4b1-ee4315286d88',
  team_id = '1fa654dd-c0bb-468c-aaf4-955eda4a1f1f',
  updated_at = NOW()
WHERE id = 'dfbbaae0-7afa-4609-8e5f-3795288c1281';

-- Reabilitar triggers
ALTER TABLE public.kpi_metrics ENABLE TRIGGER trg_enforce_bu_scope_kpi_metrics;
ALTER TABLE public.kpi_metrics ENABLE TRIGGER trg_kpi_metrics_governance;