-- Otimização de Banco de Dados: Criar índices faltantes em bu_id
-- Impacto: Melhoria de performance em queries RLS para tabelas com bu_id sem índice

-- 1. okr_checkins - tabela crítica para OKRs
CREATE INDEX IF NOT EXISTS idx_okr_checkins_bu_id 
  ON public.okr_checkins(bu_id);

-- 2. cycles - tabela de ciclos OKR
CREATE INDEX IF NOT EXISTS idx_cycles_bu_id 
  ON public.cycles(bu_id);

-- 3. kpi_target_history - histórico de targets KPI
CREATE INDEX IF NOT EXISTS idx_kpi_target_history_bu_id 
  ON public.kpi_target_history(bu_id);

-- 4. ai_agents - índice parcial (poucos registros, apenas quando bu_id não é null)
CREATE INDEX IF NOT EXISTS idx_ai_agents_bu_id 
  ON public.ai_agents(bu_id) 
  WHERE bu_id IS NOT NULL;

-- Comentário de auditoria
COMMENT ON INDEX idx_okr_checkins_bu_id IS 'Índice para RLS performance - criado 2026-02-07';
COMMENT ON INDEX idx_cycles_bu_id IS 'Índice para RLS performance - criado 2026-02-07';
COMMENT ON INDEX idx_kpi_target_history_bu_id IS 'Índice para RLS performance - criado 2026-02-07';
COMMENT ON INDEX idx_ai_agents_bu_id IS 'Índice parcial para RLS performance - criado 2026-02-07';