
# Plano: Remoção Completa do Tipo "Indicador de Saúde" (health_indicator)

## Resumo Executivo

Remover completamente o tipo `health_indicator` do módulo de KPIs, garantindo que o sistema trabalhe apenas com os tipos **KPI** e **Métrica**.

---

## Pré-checklist Consultado ✅

| Documento | Status | Observações |
|-----------|--------|-------------|
| `TECHNICAL_CONTEXT_REGISTRY.md` | ✅ Consultado | Linha 724: enum com 3 valores |
| `DATA_MODEL_REGISTRY.md` | ✅ Consultado | Gerado automaticamente (não editar manualmente) |
| `DEVELOPMENT_STANDARDS.md` | ✅ Consultado | Regras de enum e migrations |
| Verificação de dados existentes | ✅ Query executada | **0 registros** usam `health_indicator` |

---

## Análise de Impacto

### Estado Atual do Banco
```sql
SELECT count(*) FROM kpi_metrics WHERE indicator_type = 'health_indicator';
-- Resultado: 0 (nenhum registro)
```

### Arquivos Afetados (5 arquivos + 1 migration)

| Arquivo | Linhas | Tipo de Mudança |
|---------|--------|-----------------|
| `src/modules/kpis/types.ts` | 17, 153-157 | Union type + labels |
| `src/modules/kpis/components/CreateKpiDialog.tsx` | 64, 258 | Zod schema + tooltip |
| `src/modules/kpis/components/EditKpiDialog.tsx` | 63 | Zod schema |
| `src/modules/kpis/hooks/useKpiData.ts` | 212, 250 | Type castings |
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | 724, 2261 | Documentação |

### Arquivo NÃO Editável
- `src/integrations/supabase/types.ts` — Gerado automaticamente pelo Supabase. Será atualizado após migration.

---

## Etapas de Implementação

### FASE 1: Migração do Banco de Dados

**Objetivo:** Recriar o enum PostgreSQL sem o valor `health_indicator`.

**Estratégia:** PostgreSQL não permite remover valores de enum, então:
1. Converter registros existentes (precaução)
2. Criar novo enum apenas com valores válidos
3. Migrar coluna para novo enum
4. Dropar enum antigo e renomear

**SQL da Migration:**
```sql
-- 1. Converter registros existentes (se houver) — precaução
UPDATE kpi_metrics 
SET indicator_type = 'metric' 
WHERE indicator_type = 'health_indicator';

-- 2. Criar novo enum sem health_indicator
CREATE TYPE kpi_indicator_type_new AS ENUM ('kpi', 'metric');

-- 3. Alterar coluna para usar novo enum
ALTER TABLE kpi_metrics 
ALTER COLUMN indicator_type TYPE kpi_indicator_type_new 
USING indicator_type::text::kpi_indicator_type_new;

-- 4. Remover enum antigo e renomear novo
DROP TYPE kpi_indicator_type;
ALTER TYPE kpi_indicator_type_new RENAME TO kpi_indicator_type;
```

---

### FASE 2: Atualização do TypeScript

#### 2.1 `src/modules/kpis/types.ts` (fonte primária)

**Linha 17 — Union Type:**
```typescript
// ANTES
export type KpiIndicatorType = 'kpi' | 'metric' | 'health_indicator';

// DEPOIS
export type KpiIndicatorType = 'kpi' | 'metric';
```

**Linhas 153-157 — Labels:**
```typescript
// ANTES
export const INDICATOR_TYPE_LABELS: Record<KpiIndicatorType, string> = {
  kpi: 'KPI',
  metric: 'Métrica',
  health_indicator: 'Indicador de Saúde',
};

// DEPOIS
export const INDICATOR_TYPE_LABELS: Record<KpiIndicatorType, string> = {
  kpi: 'KPI',
  metric: 'Métrica',
};
```

---

#### 2.2 `src/modules/kpis/components/CreateKpiDialog.tsx`

**Linha 64 — Zod Schema:**
```typescript
// ANTES
indicator_type: z.enum(["kpi", "metric", "health_indicator"]),

// DEPOIS
indicator_type: z.enum(["kpi", "metric"]),
```

**Linhas 255-259 — Tooltip (remover linha do health_indicator):**
```typescript
// ANTES
<p><strong>KPI:</strong> Indicador-chave de performance vinculado a objetivos estratégicos.</p>
<p><strong>Métrica:</strong> Medição operacional usada para monitoramento contínuo.</p>
<p><strong>Indicador de Saúde:</strong> Sinal de alerta que indica riscos ou anomalias.</p>

// DEPOIS
<p><strong>KPI:</strong> Indicador-chave de performance vinculado a objetivos estratégicos.</p>
<p><strong>Métrica:</strong> Medição operacional usada para monitoramento contínuo.</p>
```

**Componente reutilizado:** `HelpTooltip` de `@/components/ui/help-tooltip` — não duplicar.

---

#### 2.3 `src/modules/kpis/components/EditKpiDialog.tsx`

**Linha 63 — Zod Schema:**
```typescript
// ANTES
indicator_type: z.enum(["kpi", "metric", "health_indicator"]),

// DEPOIS
indicator_type: z.enum(["kpi", "metric"]),
```

---

#### 2.4 `src/modules/kpis/hooks/useKpiData.ts`

**Linha 212 — Type Casting:**
```typescript
// ANTES
indicator_type: (kpi.indicator_type || 'kpi') as 'kpi' | 'metric' | 'health_indicator',

// DEPOIS
indicator_type: (kpi.indicator_type || 'kpi') as KpiIndicatorType,
```

**Linha 250 — Interface do createKpi:**
```typescript
// ANTES
indicator_type?: 'kpi' | 'metric' | 'health_indicator';

// DEPOIS
indicator_type?: KpiIndicatorType;
```

**Nota:** Usar o type importado `KpiIndicatorType` em vez de inline literal para manter DRY.

---

### FASE 3: Atualização da Documentação

#### 3.1 `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`

**Linha 724 — Tabela de campos:**
```markdown
| **indicator_type** | enum | `kpi`, `metric` |
```

**Changelog — Adicionar entrada v2.81.0:**
```markdown
### v2.81.0 — Remoção de health_indicator
- **Enum `kpi_indicator_type` simplificado** — Removido tipo `health_indicator`
- Sistema agora opera apenas com: `kpi` (indicador estratégico) e `metric` (medição operacional)
- Zero registros afetados (nenhum dado usava o tipo removido)
```

#### 3.2 `docs/canonical/DATA_MODEL_REGISTRY.md`

**Ação:** Regenerar automaticamente via script após migration.
```bash
npx tsx scripts/generate-data-model-registry.ts
```

---

## Checklist de Validação

| Item | Verificação |
|------|-------------|
| ✅ Enum PostgreSQL contém apenas `('kpi', 'metric')` | Migration executada |
| ✅ Nenhum registro com `health_indicator` no banco | Query confirmou 0 registros |
| ✅ `KpiIndicatorType` tem apenas 2 valores | Compilação TypeScript |
| ✅ UI não oferece opção "Indicador de Saúde" | Select renderiza apenas KPI/Métrica |
| ✅ Tooltip atualizado | Sem menção a "Indicador de Saúde" |
| ✅ Documentação alinhada | TCR v2.81.0 atualizado |

---

## Ordem de Execução

1. **Migration do banco** (Fase 1)
2. **Atualizar `types.ts`** — fonte primária dos tipos
3. **Atualizar Dialogs** — `CreateKpiDialog` e `EditKpiDialog`
4. **Atualizar Hook** — `useKpiData.ts`
5. **Atualizar TCR** — versão 2.81.0
6. **Regenerar DATA_MODEL_REGISTRY** — automático via script

---

## Risco

**BAIXO** — Nenhum dado existente usa `health_indicator`, e a mudança é retroativamente compatível para registros `kpi` e `metric` já existentes.

---

## Princípios Seguidos

- ✅ **Não duplicar componentes** — Reutiliza `HelpTooltip` existente
- ✅ **Preferir estender/compor** — Apenas remove valor do enum, não cria novos tipos
- ✅ **Componentes centralizados** — Usa `KpiIndicatorType` importado em vez de literals inline
- ✅ **Documentação canônica** — Atualiza TCR como fonte de verdade
