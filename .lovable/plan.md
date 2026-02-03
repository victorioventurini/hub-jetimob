

# Plano: KPI Governance v2.2 — Escopo, Domínio e Integração KR↔KPI

## 1. Contexto e Análise da Proposta GPT

### 1.1 Pré-Checklist Consultado ✅

| Documento | Status | Versão |
|-----------|--------|--------|
| TECHNICAL_CONTEXT_REGISTRY.md | ✅ | v2.79.0 |
| DATA_MODEL_REGISTRY.md | ✅ | v2.51.0 |
| DEVELOPMENT_STANDARDS.md | ✅ | v1.17.0 |
| Schema kpi_metrics (atual) | ✅ | 20 colunas |
| Schema areas | ✅ | 12 colunas |
| Schema okr_kr_metrics | ✅ | 8 colunas |
| Componentes KPI existentes | ✅ | 10 componentes |

### 1.2 Estado Atual do Schema `kpi_metrics`

```
Colunas atuais: id, name, description, category, owner_user_id, team_id, 
unit, direction, frequency, target_value, status, created_at, updated_at, 
deleted_at, bu_id, is_global, indicator_type, lifecycle_status, target_source, 
recovery_protocol
```

**Observações:**
- `team_id` já existe (nullable)
- `owner_user_id` já existe (nullable)
- `bu_id` já existe (nullable)
- Campos v2.1 já implementados: `indicator_type`, `lifecycle_status`, `target_source`, `recovery_protocol`

### 1.3 Tabela `areas` (confirmada)

```
Colunas: id, bu_id, name, description, leader_user_id, co_leader_user_id, 
status, color, icon, created_at, updated_at, deleted_at
```

**Relacionamento:** `teams.area_id` → `areas.id` (já existe!)

### 1.4 Tabela `okr_kr_metrics` (confirmada)

```
Colunas: id, kr_id, kr_type, kpi_id, role (primary/guardrail), created_at, 
created_by, deleted_at
```

**Índices existentes:**
- Unique: `(kr_id, kr_type, kpi_id)` — evita duplicar mesmo KPI no mesmo KR
- ❌ **FALTA:** Unique parcial para garantir 1 primary por KR

---

## 2. Avaliação Crítica da Proposta GPT

### 2.1 Pontos Alinhados ✅

| Proposta | Análise | Veredicto |
|----------|---------|-----------|
| Adicionar `area_id` para domínio | Faz sentido — KPI precisa de "dona" estratégica | ✅ Aprovar |
| Adicionar `scope` (team/area/org) | Clarifica escopo sem usar `is_global` | ✅ Aprovar |
| Unique parcial em `okr_kr_metrics` (1 primary/KR) | Crítico para integridade | ✅ Aprovar |
| Trigger de governança | Valida regras de negócio no DB | ✅ Aprovar |

### 2.2 Pontos a Ajustar ⚠️

| Proposta GPT | Problema | Ajuste Necessário |
|--------------|----------|-------------------|
| `updater_user_id` obrigatório se source='manual' | Complexidade excessiva — manual já indica quem criou via `kpi_values.created_by` | ❌ **Remover** — usar `created_by` do valor |
| `default_value_source` em `kpi_metrics` | Redundante com `source` em `kpi_values` (cada valor tem sua fonte) | ❌ **Remover** — manter fonte por valor |
| `area_id` obrigatório sempre | Impede criar KPI sem área definida (migração dolorosa) | ⚠️ **Fase 1:** permitir NULL, trigger só valida em `lifecycle_status='active'` |
| Owner obrigatório quando `lifecycle_status='active'` | Correto, mas precisa de validação frontend clara | ✅ Ajustar UI para exigir |

### 2.3 Recomendação Final

**Escopo Reduzido (Governança Essencial):**

1. **Adicionar:** `area_id` (nullable, FK → areas)
2. **Adicionar:** `scope` enum ('team', 'area', 'org')
3. **Trigger:** Validar consistência scope/team_id e owner quando active
4. **Índice:** Unique parcial em `okr_kr_metrics` (1 primary por KR)
5. **UI:** Estender Create/Edit com campos de área e escopo

**NÃO implementar:**
- `updater_user_id` — usar `kpi_values.created_by`
- `default_value_source` — manter fonte por valor

---

## 3. Deliverables Aprovados

### 3.1 Migration 1: Schema + Trigger de Governança

```sql
-- ============================================================
-- MIGRATION: KPI Governance v2.2 - Scope + Area + Validation
-- ============================================================

-- 1. Criar enum kpi_scope (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_scope') THEN
    CREATE TYPE kpi_scope AS ENUM ('team', 'area', 'org');
  END IF;
END$$;

-- 2. Adicionar colunas (idempotente)
ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.areas(id);

ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS scope kpi_scope NOT NULL DEFAULT 'team';

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_area 
ON public.kpi_metrics (area_id, lifecycle_status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_scope 
ON public.kpi_metrics (bu_id, scope, lifecycle_status) 
WHERE deleted_at IS NULL;

-- 4. Backfill: preencher area_id via team.area_id (se possível)
UPDATE public.kpi_metrics km SET
  area_id = t.area_id
FROM public.teams t
WHERE km.team_id = t.id 
  AND km.area_id IS NULL 
  AND t.area_id IS NOT NULL;

-- 5. Trigger de governança
CREATE OR REPLACE FUNCTION kpi_metrics_governance_validate()
RETURNS trigger AS $$
BEGIN
  -- Regra 1: Consistência scope ↔ team_id
  IF NEW.scope = 'team' AND NEW.team_id IS NULL THEN
    RAISE EXCEPTION 'KPI com escopo "time" requer team_id definido';
  END IF;
  
  IF NEW.scope IN ('area', 'org') AND NEW.team_id IS NOT NULL THEN
    RAISE EXCEPTION 'KPI com escopo "área" ou "org" não pode ter team_id';
  END IF;
  
  -- Regra 2: KPI ativo requer owner
  IF NEW.lifecycle_status = 'active' AND NEW.owner_user_id IS NULL THEN
    RAISE EXCEPTION 'KPI ativo requer um responsável (owner_user_id)';
  END IF;
  
  -- Regra 3: KPI ativo requer área definida (soft enforcement)
  IF NEW.lifecycle_status = 'active' AND NEW.area_id IS NULL THEN
    RAISE EXCEPTION 'KPI ativo requer uma área responsável (area_id)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kpi_metrics_governance ON public.kpi_metrics;
CREATE TRIGGER trg_kpi_metrics_governance
BEFORE INSERT OR UPDATE ON public.kpi_metrics
FOR EACH ROW EXECUTE FUNCTION kpi_metrics_governance_validate();

-- 6. Comentários
COMMENT ON COLUMN public.kpi_metrics.area_id IS 'Área dona/responsável pelo KPI';
COMMENT ON COLUMN public.kpi_metrics.scope IS 'Escopo: team (time específico), area (toda área), org (toda organização)';
```

### 3.2 Migration 2: Unique Parcial KR↔KPI (1 primary por KR)

```sql
-- ============================================================
-- MIGRATION: KR-KPI Unique Primary Constraint
-- ============================================================

-- Garantir no máximo 1 KPI primary por KR (kr_id + kr_type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_okr_kr_metrics_unique_primary 
ON public.okr_kr_metrics (kr_id, kr_type) 
WHERE role = 'primary' AND deleted_at IS NULL;

-- Comentário
COMMENT ON INDEX idx_okr_kr_metrics_unique_primary IS 
'Garante que cada KR tenha no máximo 1 KPI primário ativo';
```

### 3.3 Atualizações TypeScript

#### A) `src/modules/kpis/types.ts` — Adicionar tipos

```typescript
// === v2.2 Governance Types ===
export type KpiScope = 'team' | 'area' | 'org';

export const SCOPE_LABELS: Record<KpiScope, string> = {
  team: 'Time',
  area: 'Área',
  org: 'Organização (Global)',
};

// Atualizar interface KpiMetric
export interface KpiMetric {
  // ... campos existentes ...
  area_id: string | null;
  scope: KpiScope;
  // Relations (adicionar)
  area?: {
    id: string;
    name: string;
    color: string | null;
  };
}
```

#### B) `src/modules/kpis/hooks/useKpiData.ts` — Incluir novos campos

- Adicionar `area_id`, `scope` no select
- Adicionar join com `area:areas!kpi_metrics_area_id_fkey(id, name, color)`

#### C) `src/modules/kpis/hooks/useKpiMutations.ts` — Suportar novos campos

- Adicionar `area_id`, `scope` no UpdateKpiData

### 3.4 Atualizações de UI (Estender, NÃO Duplicar)

#### A) `CreateKpiDialog.tsx`

1. Adicionar campo **Escopo** (Select: Time/Área/Org)
2. Adicionar campo **Área** (usar `AreaSelect` existente de `@/components/selects`)
3. Lógica condicional:
   - Se `scope='team'` → mostrar TeamSelect (obrigatório)
   - Se `scope='area'` ou `scope='org'` → esconder TeamSelect
4. Validação: se `lifecycle_status='active'` → owner obrigatório

#### B) `EditKpiDialog.tsx`

1. Adicionar os mesmos campos de escopo e área
2. Campos v2.1 (indicator_type, lifecycle_status, target_source, recovery_protocol) — **atualmente faltando**
3. Mesma lógica condicional do Create

#### C) `KpiDetailDialog.tsx`

1. Exibir **Área dona** (nome + cor)
2. Exibir **Escopo** (label)
3. Exibir campos v2.1 se preenchidos

#### D) `KpiDashboardFilters.tsx`

1. Adicionar filtro por **Área** (usar `AreaSelect` com `includeAll`)
2. Adicionar filtro por **Escopo** (Select simples)

### 3.5 Vínculo KR↔KPI — Validação UI

Na tela onde se vincula KPI a KR:
- Antes de setar `role='primary'`, verificar se já existe primary
- Se existir, mostrar erro: "Esta KR já possui um KPI primário. Remova o atual antes de adicionar outro."

---

## 4. Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migration 1 | **CRIAR** | Schema (area_id, scope) + trigger governança |
| Migration 2 | **CRIAR** | Unique parcial okr_kr_metrics |
| `src/modules/kpis/types.ts` | **MODIFICAR** | +KpiScope, +SCOPE_LABELS, +campos interface |
| `src/modules/kpis/hooks/useKpiData.ts` | **MODIFICAR** | +area_id, +scope no select |
| `src/modules/kpis/hooks/useKpiMutations.ts` | **MODIFICAR** | +area_id, +scope no update |
| `src/modules/kpis/components/CreateKpiDialog.tsx` | **MODIFICAR** | +AreaSelect, +ScopeSelect, lógica condicional |
| `src/modules/kpis/components/EditKpiDialog.tsx` | **MODIFICAR** | +AreaSelect, +ScopeSelect, +campos v2.1 |
| `src/modules/kpis/components/KpiDetailDialog.tsx` | **MODIFICAR** | +Área, +Escopo na exibição |
| `src/modules/kpis/components/KpiDashboardFilters.tsx` | **MODIFICAR** | +AreaSelect, +ScopeSelect filtros |

---

## 5. Regras Respeitadas

| Regra | Status |
|-------|--------|
| Usar componentes existentes (AreaSelect) | ✅ |
| Não duplicar componentes | ✅ |
| Campos explícitos (sem select *) | ✅ |
| Query keys centralizadas | ✅ |
| useOptionalBuScopedSupabase | ✅ |
| Idempotência em migrations | ✅ |
| Manter fail-safe (KPI nunca quebra OKR) | ✅ |
| Identity convention (profile_id) | ✅ |

---

## 6. Checklist de Validação Pós-Implementação

**Banco de Dados:**
- [ ] Enum `kpi_scope` criado
- [ ] `kpi_metrics.area_id` e `kpi_metrics.scope` adicionados
- [ ] Trigger `trg_kpi_metrics_governance` ativo
- [ ] Backfill executado (area_id via team)
- [ ] Índice unique `idx_okr_kr_metrics_unique_primary` criado

**Frontend:**
- [ ] CreateKpiDialog com Área + Escopo
- [ ] EditKpiDialog com Área + Escopo + campos v2.1
- [ ] KpiDetailDialog exibe Área e Escopo
- [ ] KpiDashboardFilters filtra por Área e Escopo
- [ ] Validação de 1 primary por KR na UI (se aplicável)

**Documentação:**
- [ ] TCR atualizado para v2.80.0
- [ ] DATA_MODEL_REGISTRY regenerado

---

## 7. O Que NÃO Será Implementado (Justificativa)

| Proposta GPT | Motivo da Exclusão |
|--------------|-------------------|
| `updater_user_id` | Redundante — `kpi_values.created_by` já registra quem atualizou |
| `default_value_source` | Redundante — cada valor tem seu `source`, não faz sentido default no KPI |
| CHECK constraints SQL | Trigger é mais flexível e mensagens de erro mais claras |

