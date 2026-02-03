-- ============================================================
-- Migration: Remove health_indicator from kpi_indicator_type enum
-- Ticket: Remoção completa do tipo "Indicador de Saúde"
-- ============================================================

-- 1. Converter registros existentes (precaução - já confirmado 0 registros)
UPDATE kpi_metrics 
SET indicator_type = 'metric' 
WHERE indicator_type = 'health_indicator';

-- 2. Criar novo enum sem health_indicator
CREATE TYPE kpi_indicator_type_new AS ENUM ('kpi', 'metric');

-- 3. Remover o DEFAULT antes de alterar o tipo
ALTER TABLE kpi_metrics 
ALTER COLUMN indicator_type DROP DEFAULT;

-- 4. Alterar coluna para usar novo enum
ALTER TABLE kpi_metrics 
ALTER COLUMN indicator_type TYPE kpi_indicator_type_new 
USING indicator_type::text::kpi_indicator_type_new;

-- 5. Restaurar o DEFAULT com o novo tipo
ALTER TABLE kpi_metrics 
ALTER COLUMN indicator_type SET DEFAULT 'kpi'::kpi_indicator_type_new;

-- 6. Remover enum antigo e renomear novo
DROP TYPE kpi_indicator_type;
ALTER TYPE kpi_indicator_type_new RENAME TO kpi_indicator_type;