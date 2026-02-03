-- v2.82.0: Evolução do Módulo de Indicadores
-- Tornar category nullable (soft deprecation) - ownership via area_id

-- Tornar category nullable
ALTER TABLE kpi_metrics ALTER COLUMN category DROP NOT NULL;

-- Adicionar comentário de deprecação
COMMENT ON COLUMN kpi_metrics.category IS 'DEPRECATED v2.82.0 - Use area_id para ownership organizacional. Mantido para compatibilidade e rollback.';