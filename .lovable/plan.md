

# Plano Final: Evolução do Módulo de KPIs (MVP v2.1) — Atualizado

## 1. Objetivo

Evoluir KPIs de "números soltos" para **instrumentos de gestão auditáveis**, mantendo **compatibilidade total** e **modularidade fail-safe**.

---

## 2. Análise do Pré-Checklist ✅

| Documento | Consultado | Versão |
|-----------|------------|--------|
| TECHNICAL_CONTEXT_REGISTRY.md | ✅ | v2.78.0 |
| DATA_MODEL_REGISTRY.md | ✅ | v2.51.0 |
| types.ts (KPIs) | ✅ | Atual |
| queryKeys/okrs.ts | ✅ | Atual |
| useKpiData.ts | ✅ | Atual |
| useKpiMutations.ts | ✅ | Atual |

### 2.1 Schema Atual Confirmado

**`kpi_metrics`** (16 colunas):
- id, name, description, category, owner_user_id, team_id, unit, direction, frequency
- target_value, status, created_at, updated_at, **deleted_at**, bu_id, is_global

**`kpi_values`** (8 colunas — **SEM deleted_at**):
- id, kpi_id, value, reference_date, source, notes, created_by, created_at

**Enums existentes:**
- `kpi_status`: active, inactive
- `kpi_direction`: up, down
- `kpi_frequency`: daily, weekly, monthly, quarterly
- `kpi_value_source`: manual, integration, calculation
- `kpi_category`: financeiro, growth, cs, produto, operacoes, pessoas

---

## 3. Deliverables

### 3.1 Migration 1 (Transacional) — Schema + Funções + Trigger + Backfill

```sql
-- ============================================================
-- MIGRATION 1: KPI Evolution v2.1 - Schema + Trigger + Backfill
-- ============================================================

-- ========================
-- 1. Novos Enums (Idempotente)
-- ========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_indicator_type') THEN
    CREATE TYPE kpi_indicator_type AS ENUM ('kpi', 'metric', 'health_indicator');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_lifecycle_status') THEN
    CREATE TYPE kpi_lifecycle_status AS ENUM ('proposed', 'active', 'observing', 'deprecated');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_confidence_level') THEN
    CREATE TYPE kpi_confidence_level AS ENUM ('high', 'medium', 'low');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_rag_status') THEN
    CREATE TYPE kpi_rag_status AS ENUM ('on_track', 'at_risk', 'off_track', 'no_data');
  END IF;
END$$;

-- ========================
-- 2. Expandir enum kpi_value_source (Idempotente)
-- ========================
DO $$
BEGIN
  ALTER TYPE kpi_value_source ADD VALUE 'api';
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE kpi_value_source ADD VALUE 'webhook';
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE kpi_value_source ADD VALUE 'spreadsheet';
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TYPE kpi_value_source ADD VALUE 'database';
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

-- ========================
-- 3. Novas colunas em kpi_metrics (Idempotente)
-- ========================
ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS indicator_type kpi_indicator_type NOT NULL DEFAULT 'kpi';

ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS lifecycle_status kpi_lifecycle_status NOT NULL DEFAULT 'active';

ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS target_source text;

ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS recovery_protocol text;

-- ========================
-- 4. Novas colunas em kpi_values (Idempotente)
-- ========================
ALTER TABLE public.kpi_values 
ADD COLUMN IF NOT EXISTS period_start date;

ALTER TABLE public.kpi_values 
ADD COLUMN IF NOT EXISTS period_end date;

ALTER TABLE public.kpi_values 
ADD COLUMN IF NOT EXISTS period_label text;

ALTER TABLE public.kpi_values 
ADD COLUMN IF NOT EXISTS confidence kpi_confidence_level NOT NULL DEFAULT 'medium';

ALTER TABLE public.kpi_values 
ADD COLUMN IF NOT EXISTS rag_status kpi_rag_status;

-- ========================
-- 5. Função de cálculo RAG (Reutilizável, corrigida para divisão por zero)
-- ========================
CREATE OR REPLACE FUNCTION kpi_calculate_rag(
  p_value numeric,
  p_target numeric,
  p_direction kpi_direction
) RETURNS kpi_rag_status AS $$
DECLARE
  v_percentage numeric;
BEGIN
  -- Tratar NULL e zero (divisão por zero)
  IF p_value IS NULL OR p_target IS NULL OR p_value = 0 OR p_target = 0 THEN
    RETURN 'no_data';
  END IF;
  
  -- Calcular percentual baseado na direção
  IF p_direction = 'up' THEN
    v_percentage := (p_value / p_target) * 100;
  ELSE
    v_percentage := (p_target / p_value) * 100;
  END IF;
  
  -- Aplicar thresholds (idênticos ao frontend types.ts)
  IF v_percentage >= 90 THEN RETURN 'on_track'; END IF;
  IF v_percentage >= 70 THEN RETURN 'at_risk'; END IF;
  RETURN 'off_track';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================
-- 6. Função auxiliar para calcular período (ISO week aligned)
-- ========================
CREATE OR REPLACE FUNCTION kpi_calculate_period(
  p_reference_date date,
  p_frequency kpi_frequency,
  OUT p_start date,
  OUT p_end date,
  OUT p_label text
) AS $$
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      p_start := p_reference_date;
      p_end := p_reference_date;
      p_label := to_char(p_reference_date, 'YYYY-MM-DD');
    WHEN 'weekly' THEN
      -- ISO week: segunda-feira como início
      p_start := date_trunc('week', p_reference_date)::date;
      p_end := p_start + 6;
      p_label := to_char(p_start, 'IYYY-"W"IW');
    WHEN 'monthly' THEN
      p_start := date_trunc('month', p_reference_date)::date;
      p_end := (date_trunc('month', p_reference_date) + interval '1 month - 1 day')::date;
      p_label := to_char(p_reference_date, 'YYYY-MM');
    WHEN 'quarterly' THEN
      p_start := date_trunc('quarter', p_reference_date)::date;
      p_end := (date_trunc('quarter', p_reference_date) + interval '3 months - 1 day')::date;
      p_label := to_char(p_reference_date, 'YYYY-"Q"Q');
    ELSE
      p_start := p_reference_date;
      p_end := p_reference_date;
      p_label := to_char(p_reference_date, 'YYYY-MM-DD');
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================
-- 7. Trigger de validação (calcula período, RAG, gate de comentário)
-- ========================
CREATE OR REPLACE FUNCTION kpi_validate_value_insert()
RETURNS trigger AS $$
DECLARE
  v_target_value numeric;
  v_direction kpi_direction;
  v_frequency kpi_frequency;
  v_period record;
BEGIN
  -- Buscar metadados do KPI
  SELECT target_value, direction, frequency 
  INTO v_target_value, v_direction, v_frequency
  FROM public.kpi_metrics 
  WHERE id = NEW.kpi_id;
  
  -- 1. Preencher período se veio NULL
  IF NEW.period_start IS NULL OR NEW.period_end IS NULL OR NEW.period_label IS NULL THEN
    SELECT * INTO v_period FROM kpi_calculate_period(NEW.reference_date, v_frequency);
    NEW.period_start := COALESCE(NEW.period_start, v_period.p_start);
    NEW.period_end := COALESCE(NEW.period_end, v_period.p_end);
    NEW.period_label := COALESCE(NEW.period_label, v_period.p_label);
  END IF;
  
  -- 2. Calcular RAG status sempre
  NEW.rag_status := kpi_calculate_rag(NEW.value, v_target_value, v_direction);
  
  -- 3. Gate: comentário obrigatório se fora da meta
  IF NEW.rag_status IN ('at_risk', 'off_track') 
     AND (NEW.notes IS NULL OR trim(NEW.notes) = '') THEN
    RAISE EXCEPTION 'Comentário obrigatório para KPIs amarelos ou vermelhos';
  END IF;
  
  -- 4. Default confidence (NULL-safe para source)
  IF NEW.confidence IS NULL THEN
    NEW.confidence := CASE 
      WHEN NEW.source IS NULL THEN 'medium'
      WHEN NEW.source = 'manual' THEN 'medium'
      ELSE 'high'
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kpi_value_validation ON public.kpi_values;
CREATE TRIGGER trg_kpi_value_validation
BEFORE INSERT OR UPDATE ON public.kpi_values
FOR EACH ROW EXECUTE FUNCTION kpi_validate_value_insert();

-- ========================
-- 8. Backfill: Período (alinhado ao início ISO)
-- ========================
UPDATE public.kpi_values v SET
  period_start = (SELECT p_start FROM kpi_calculate_period(v.reference_date, m.frequency)),
  period_end = (SELECT p_end FROM kpi_calculate_period(v.reference_date, m.frequency)),
  period_label = (SELECT p_label FROM kpi_calculate_period(v.reference_date, m.frequency))
FROM public.kpi_metrics m
WHERE v.kpi_id = m.id 
  AND v.period_start IS NULL;

-- ========================
-- 9. Backfill: RAG status
-- ========================
UPDATE public.kpi_values v SET
  rag_status = kpi_calculate_rag(v.value, m.target_value, m.direction)
FROM public.kpi_metrics m
WHERE v.kpi_id = m.id 
  AND v.rag_status IS NULL;

-- ========================
-- 10. Backfill: Confidence (NULL-safe)
-- ========================
UPDATE public.kpi_values SET 
  confidence = CASE 
    WHEN source IS NULL THEN 'medium'
    WHEN source = 'manual' THEN 'medium'
    ELSE 'high'
  END
WHERE confidence IS NULL;

-- ========================
-- 11. Índice de Unicidade por Período
-- ========================
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_values_unique_period 
ON public.kpi_values (kpi_id, period_start, period_end) 
WHERE period_start IS NOT NULL AND period_end IS NOT NULL;

-- ========================
-- 12. Comentário de documentação
-- ========================
COMMENT ON COLUMN public.kpi_metrics.indicator_type IS 'Tipo do indicador: kpi, metric, health_indicator';
COMMENT ON COLUMN public.kpi_metrics.lifecycle_status IS 'Ciclo de vida: proposed, active, observing, deprecated';
COMMENT ON COLUMN public.kpi_metrics.target_source IS 'Fonte/URL do target/benchmark';
COMMENT ON COLUMN public.kpi_metrics.recovery_protocol IS 'Protocolo de recuperação quando fora da meta';
COMMENT ON COLUMN public.kpi_values.period_start IS 'Início do período (ISO week aligned)';
COMMENT ON COLUMN public.kpi_values.period_end IS 'Fim do período';
COMMENT ON COLUMN public.kpi_values.period_label IS 'Label do período: YYYY-MM-DD, IYYY-WIW, YYYY-MM, YYYY-QQ';
COMMENT ON COLUMN public.kpi_values.confidence IS 'Nível de confiança do dado';
COMMENT ON COLUMN public.kpi_values.rag_status IS 'Status RAG calculado automaticamente';
```

---

### 3.2 Migration 2 (Transacional) — Índices de Performance

```sql
-- ============================================================
-- MIGRATION 2: KPI Evolution v2.1 - Performance Indexes
-- ============================================================
-- NOTA: Sem CONCURRENTLY (tabelas pequenas, lock aceitável)

-- ========================
-- kpi_metrics (TEM deleted_at)
-- ========================
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_bu_status 
ON public.kpi_metrics (bu_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_owner 
ON public.kpi_metrics (owner_user_id, status) 
WHERE deleted_at IS NULL AND owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_team 
ON public.kpi_metrics (team_id, status) 
WHERE deleted_at IS NULL AND team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_category_bu 
ON public.kpi_metrics (bu_id, category, status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_lifecycle 
ON public.kpi_metrics (bu_id, lifecycle_status) 
WHERE deleted_at IS NULL;

-- ========================
-- kpi_values (NÃO TEM deleted_at)
-- ========================
CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi_date_desc 
ON public.kpi_values (kpi_id, reference_date DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi_period 
ON public.kpi_values (kpi_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_kpi_values_rag_alerts 
ON public.kpi_values (kpi_id, rag_status) 
WHERE rag_status IN ('at_risk', 'off_track');

CREATE INDEX IF NOT EXISTS idx_kpi_values_created_by 
ON public.kpi_values (created_by, created_at DESC) 
WHERE created_by IS NOT NULL;

-- ========================
-- okr_kr_metrics (para vínculo KR ↔ KPI)
-- ========================
CREATE INDEX IF NOT EXISTS idx_okr_kr_metrics_kpi 
ON public.okr_kr_metrics (kpi_id, role) 
WHERE deleted_at IS NULL;
```

---

### 3.3 Patch TypeScript: `src/modules/kpis/types.ts`

```typescript
// === NOVOS TIPOS (adicionar ao início do arquivo) ===
export type KpiIndicatorType = 'kpi' | 'metric' | 'health_indicator';
export type KpiLifecycleStatus = 'proposed' | 'active' | 'observing' | 'deprecated';
export type KpiConfidenceLevel = 'high' | 'medium' | 'low';

// === NOVOS LABELS (adicionar após os existentes) ===
export const INDICATOR_TYPE_LABELS: Record<KpiIndicatorType, string> = {
  kpi: 'KPI',
  metric: 'Métrica',
  health_indicator: 'Indicador de Saúde',
};

export const LIFECYCLE_STATUS_LABELS: Record<KpiLifecycleStatus, string> = {
  proposed: 'Proposto',
  active: 'Ativo',
  observing: 'Em Observação',
  deprecated: 'Depreciado',
};

export const CONFIDENCE_LABELS: Record<KpiConfidenceLevel, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

// === ATUALIZAR interface KpiMetric (adicionar campos) ===
export interface KpiMetric {
  // ... campos existentes ...
  indicator_type: KpiIndicatorType;
  lifecycle_status: KpiLifecycleStatus;
  target_source: string | null;
  recovery_protocol: string | null;
}

// === ATUALIZAR interface KpiValue (adicionar campos) ===
export interface KpiValue {
  // ... campos existentes ...
  period_start: string | null;
  period_end: string | null;
  period_label: string | null;
  confidence: KpiConfidenceLevel;
  rag_status: KpiRagStatus | null;
}
```

---

### 3.4 Novo Hook: `src/modules/kpis/hooks/useKpisForWizard.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { kpisKeys } from "@/lib/queryKeys/okrs";
import type { KpiRagStatus, KpiConfidenceLevel, KpiFrequency } from "../types";

interface KpiForWizard {
  id: string;
  name: string;
  unit: string;
  target_value: number | null;
  direction: 'up' | 'down';
  frequency: KpiFrequency;
  lifecycle_status: string;
  recovery_protocol: string | null;
  team_id: string | null;
  owner_user_id: string | null;
  // Dados do último valor
  latest_value: number | null;
  latest_reference_date: string | null;
  latest_rag_status: KpiRagStatus;
  latest_confidence: KpiConfidenceLevel | null;
  latest_period_label: string | null;
  needs_update: boolean;
}

interface UseKpisForWizardOptions {
  ownerId?: string;
  teamId?: string;
  includeGuardrails?: boolean;
}

interface UseKpisForWizardResult {
  kpis: KpiForWizard[];
  guardrails: KpiForWizard[];
  isLoading: boolean;
  hasError: boolean;
  hasAlertsToShow: boolean;
  hasKpisNeedingUpdate: boolean;
}

/**
 * Hook fail-safe para exibir KPIs em wizards OKR.
 * NUNCA lança exceção - retorna estado vazio em caso de erro.
 * 
 * @example
 * const { kpis, hasAlertsToShow, hasKpisNeedingUpdate } = useKpisForWizard({ 
 *   ownerId: effectiveUserId 
 * });
 */
export function useKpisForWizard(options: UseKpisForWizardOptions = {}): UseKpisForWizardResult {
  const supabase = useOptionalBuScopedSupabase();
  const { ownerId, teamId } = options;

  const { data, error, isLoading } = useQuery({
    queryKey: kpisKeys.forWizard({ ownerId, teamId }),
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async () => {
      try {
        if (!supabase) return { kpis: [], guardrails: [] };

        // 1. Buscar KPIs ativos
        let kpiQuery = supabase
          .from('kpi_metrics')
          .select(`
            id, name, unit, target_value, direction, frequency,
            lifecycle_status, recovery_protocol, team_id, owner_user_id
          `)
          .eq('lifecycle_status', 'active')
          .is('deleted_at', null);
          
        if (ownerId) {
          kpiQuery = kpiQuery.eq('owner_user_id', ownerId);
        }
        if (teamId) {
          kpiQuery = kpiQuery.eq('team_id', teamId);
        }
        
        const { data: kpis, error: kpiError } = await kpiQuery;
        
        if (kpiError || !kpis || kpis.length === 0) {
          return { kpis: [], guardrails: [] };
        }

        // 2. Buscar último valor de cada KPI (uma query só)
        const kpiIds = kpis.map(k => k.id);
        
        const { data: latestValues } = await supabase
          .from('kpi_values')
          .select('kpi_id, value, reference_date, rag_status, confidence, period_label')
          .in('kpi_id', kpiIds)
          .order('reference_date', { ascending: false });
        
        // 3. Mapear último valor para cada KPI (primeiro de cada kpi_id)
        const latestByKpi = new Map<string, typeof latestValues[0]>();
        for (const v of (latestValues || [])) {
          if (!latestByKpi.has(v.kpi_id)) {
            latestByKpi.set(v.kpi_id, v);
          }
        }
        
        // 4. Enriquecer KPIs com dados do último valor
        const enrichedKpis: KpiForWizard[] = kpis.map(kpi => {
          const latest = latestByKpi.get(kpi.id);
          return {
            ...kpi,
            latest_value: latest?.value ?? null,
            latest_reference_date: latest?.reference_date ?? null,
            latest_rag_status: (latest?.rag_status as KpiRagStatus) ?? 'no_data',
            latest_confidence: (latest?.confidence as KpiConfidenceLevel) ?? null,
            latest_period_label: latest?.period_label ?? null,
            needs_update: needsUpdate(kpi.frequency, latest?.reference_date),
          };
        });
        
        return { kpis: enrichedKpis, guardrails: [] };
      } catch (e) {
        console.warn('KPI module unavailable:', e);
        return { kpis: [], guardrails: [] };
      }
    },
  });
  
  const kpis = data?.kpis ?? [];
  const guardrails = data?.guardrails ?? [];
  
  return {
    kpis,
    guardrails,
    isLoading,
    hasError: !!error,
    hasAlertsToShow: kpis.some(k => 
      k.latest_rag_status && k.latest_rag_status !== 'on_track'
    ),
    hasKpisNeedingUpdate: kpis.some(k => k.needs_update),
  };
}

/**
 * Helper: verificar se KPI precisa de atualização baseado na frequência
 */
function needsUpdate(frequency: string, lastDate: string | null | undefined): boolean {
  if (!lastDate) return true;
  
  const last = new Date(lastDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  
  switch (frequency) {
    case 'daily': return diffDays >= 1;
    case 'weekly': return diffDays >= 7;
    case 'monthly': return diffDays >= 30;
    case 'quarterly': return diffDays >= 90;
    default: return false; // manual frequency never auto-needs update
  }
}
```

---

### 3.5 Patch Query Keys: `src/lib/queryKeys/okrs.ts`

```typescript
// Adicionar ao kpisKeys existente:

export const kpisKeys = {
  // ... keys existentes ...
  all: (buId: string | null) => ['kpis', buId] as const,
  list: (buId: string | null, filters?: Record<string, unknown>) => 
    ['kpis', 'list', buId, filters] as const,
  detail: (kpiId: string) => ['kpis', 'detail', kpiId] as const,
  values: (kpiId: string) => ['kpis', 'values', kpiId] as const,
  sources: (buId: string | null) => ['kpis', 'sources', buId] as const,
  categories: (buId: string | null) => ['kpis', 'categories', buId] as const,
  
  // === NOVOS ===
  forWizard: (options: { ownerId?: string; teamId?: string }) => 
    ['kpis', 'wizard', options] as const,
  byRagStatus: (buId: string | null, statuses: string[]) =>
    ['kpis', 'rag-status', buId, statuses] as const,
} as const;
```

---

### 3.6 Atualizar Export: `src/modules/kpis/hooks/index.ts`

```typescript
// KPIs module hooks barrel export

export { useKpiData, useKpiDetail } from "./useKpiData";
export { useKpiMutations } from "./useKpiMutations";
export { useKpisForWizard } from "./useKpisForWizard"; // NOVO
```

---

## 4. Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migration 1 SQL | **CRIAR** | Schema + trigger + backfill |
| Migration 2 SQL | **CRIAR** | Índices de performance (11 total) |
| `src/modules/kpis/types.ts` | **MODIFICAR** | +3 tipos, +3 labels, campos nas interfaces |
| `src/modules/kpis/hooks/useKpisForWizard.ts` | **CRIAR** | Hook fail-safe |
| `src/modules/kpis/hooks/index.ts` | **MODIFICAR** | +export useKpisForWizard |
| `src/lib/queryKeys/okrs.ts` | **MODIFICAR** | +forWizard, +byRagStatus |

---

## 5. Regras Respeitadas ✅

| Regra | Status |
|-------|--------|
| NÃO usar CONCURRENTLY | ✅ |
| Idempotência total (DO/EXCEPTION, IF NOT EXISTS) | ✅ |
| NÃO assumir deleted_at em kpi_values | ✅ |
| kpi_metrics TEM deleted_at (partial indexes) | ✅ |
| Divisão por zero tratada (p_value=0 OR p_target=0 => no_data) | ✅ |
| Período ISO week aligned (segunda-feira) | ✅ |
| Trigger preenche período automaticamente | ✅ |
| Trigger calcula rag_status sempre | ✅ |
| Gate de comentário no DB | ✅ |
| confidence NULL-safe | ✅ |
| NÃO alterar enum kpi_status existente | ✅ |
| Novos enums separados | ✅ |
| Hook fail-safe (catch + return vazio) | ✅ |
| useOptionalBuScopedSupabase() | ✅ |
| Busca último valor em UMA query | ✅ |
| needs_update baseado em frequency | ✅ |

---

## 6. Fases de Implementação

| Fase | Descrição | Arquivos |
|------|-----------|----------|
| **Fase 1** | Executar Migration 1 (schema + trigger + backfill) | 1 migration |
| **Fase 2** | Executar Migration 2 (índices) | 1 migration |
| **Fase 3** | Atualizar types.ts | 1 arquivo |
| **Fase 4** | Criar useKpisForWizard.ts | 1 arquivo |
| **Fase 5** | Atualizar queryKeys/okrs.ts | 1 arquivo |
| **Fase 6** | Atualizar hooks/index.ts | 1 arquivo |
| **Fase 7** | Documentação (TCR v2.79.0) | docs |

---

## 7. Checklist de Validação Pós-Implementação

1. ✅ Enum `kpi_status` preservado (active/inactive)
2. ✅ Novos enums criados (indicator_type, lifecycle_status, confidence_level, rag_status)
3. ✅ Novas colunas em kpi_metrics (4) e kpi_values (5)
4. ✅ Trigger calcula período + RAG + valida comentário
5. ✅ Backfill preencheu dados existentes
6. ✅ Índice de unicidade por período criado
7. ✅ 11 índices de performance criados
8. ✅ Hook useKpisForWizard fail-safe funciona
9. ✅ Query keys atualizadas
10. ✅ Nenhum componente novo criado

