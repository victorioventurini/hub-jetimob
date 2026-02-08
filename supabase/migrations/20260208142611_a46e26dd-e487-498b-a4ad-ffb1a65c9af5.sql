
-- Correção de dados de KPIs importados com inconsistências de governança
-- Opção B: Mudar para scope='team', mantendo team_id e limpando area_id (será inferida)

-- Temporariamente desabilitar triggers que podem bloquear a correção
ALTER TABLE kpi_metrics DISABLE TRIGGER trg_enforce_bu_scope_kpi_metrics;
ALTER TABLE kpi_metrics DISABLE TRIGGER trg_kpi_metrics_governance;

-- Corrigir KPIs com scope='area' que têm team_id (mudar para scope='team')
UPDATE kpi_metrics
SET 
  scope = 'team',
  area_id = NULL
WHERE scope = 'area' 
  AND team_id IS NOT NULL 
  AND deleted_at IS NULL;

-- Corrigir KPIs com scope='org' que têm area_id (limpeza semântica)
UPDATE kpi_metrics
SET area_id = NULL
WHERE scope = 'org' 
  AND area_id IS NOT NULL 
  AND deleted_at IS NULL;

-- Reabilitar triggers
ALTER TABLE kpi_metrics ENABLE TRIGGER trg_enforce_bu_scope_kpi_metrics;
ALTER TABLE kpi_metrics ENABLE TRIGGER trg_kpi_metrics_governance;
