

## Plano: Sincronizar valor de KR org com KPI primário vinculado — Abordagem Sistêmica

### Análise pré-checklist ✅
- **TCR v3.22.0** consultado — confirma padrão KPI-KR linking e `okr_kr_metrics` como tabela de vínculo
- **Memory `primary-kpi-single-source-truth`** — KPI primário é fonte única de verdade para progresso
- **Memory `kpi-kr-integration-standard-v1`** — sincronização automática e campo read-only
- **DATA_MODEL_REGISTRY** — tabelas `okr_kr_metrics`, `kpi_values`, `okr_org_key_results` confirmadas

### Problema
O `current_value` da tabela `okr_org_key_results` nunca é atualizado quando o KPI primário vinculado recebe novos valores. Atualmente, **6+ hooks/queries** leem `orgKr.current_value` diretamente do banco para calcular progresso:

1. `useAllOrgObjectivesView` (QBR, MBR, OrgView, C-Level)
2. `useOrgObjectiveView` (detalhe de objetivo org)
3. `useCompanyOkrs` (C-Level Checkin)
4. `useTeamContributionView` (visão de contribuição)
5. `useOrgOkrsForContext` (contexto de wizards)
6. `useOrgHealthReview` / `useOrgConstructionReview`

Corrigir cada hook individualmente seria frágil e repetitivo.

### Solução: Trigger no banco de dados (corrige TODOS os consumidores)

Criar um **trigger `AFTER INSERT ON kpi_values`** que automaticamente atualiza `okr_org_key_results.current_value` quando o KPI vinculado como primário recebe um novo valor.

### Migração SQL

```sql
-- Função que sincroniza current_value da org KR quando KPI primário recebe novo valor
CREATE OR REPLACE FUNCTION public.sync_org_kr_from_primary_kpi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualiza current_value de todas org KRs vinculadas a este KPI como primário
  UPDATE okr_org_key_results
  SET current_value = NEW.value,
      updated_at = now()
  WHERE id IN (
    SELECT kr_id FROM okr_kr_metrics
    WHERE kpi_id = NEW.kpi_id
      AND kr_type = 'org'
      AND role = 'primary'
      AND deleted_at IS NULL
  );
  
  -- Também sincroniza team KRs vinculadas
  UPDATE okr_team_key_results
  SET current_value = NEW.value,
      updated_at = now()
  WHERE id IN (
    SELECT kr_id FROM okr_kr_metrics
    WHERE kpi_id = NEW.kpi_id
      AND kr_type = 'team'
      AND role = 'primary'
      AND deleted_at IS NULL
  );
  
  RETURN NEW;
END;
$$;

-- Trigger na tabela kpi_values
CREATE TRIGGER trg_sync_kr_from_primary_kpi
  AFTER INSERT ON public.kpi_values
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_org_kr_from_primary_kpi();

-- Backfill: atualizar KRs existentes com o último valor do KPI primário
WITH latest_kpi AS (
  SELECT DISTINCT ON (km.kr_id)
    km.kr_id,
    km.kr_type,
    kv.value
  FROM okr_kr_metrics km
  JOIN kpi_values kv ON kv.kpi_id = km.kpi_id
  WHERE km.role = 'primary'
    AND km.deleted_at IS NULL
  ORDER BY km.kr_id, kv.reference_date DESC
)
UPDATE okr_org_key_results org
SET current_value = lk.value, updated_at = now()
FROM latest_kpi lk
WHERE lk.kr_id = org.id AND lk.kr_type = 'org';

WITH latest_kpi AS (
  SELECT DISTINCT ON (km.kr_id)
    km.kr_id,
    km.kr_type,
    kv.value
  FROM okr_kr_metrics km
  JOIN kpi_values kv ON kv.kpi_id = km.kpi_id
  WHERE km.role = 'primary'
    AND km.deleted_at IS NULL
  ORDER BY km.kr_id, kv.reference_date DESC
)
UPDATE okr_team_key_results tkr
SET current_value = lk.value, updated_at = now()
FROM latest_kpi lk
WHERE lk.kr_id = tkr.id AND lk.kr_type = 'team';
```

### Por que esta abordagem é superior

1. **Corrige TODOS os consumidores** — qualquer query que leia `current_value` passa a ter o valor correto, sem alterar nenhum hook
2. **Zero alteração no frontend** — nenhum arquivo `.ts/.tsx` precisa mudar
3. **Consistência** — alinhado com a memory `primary-kpi-single-source-truth` (KPI como fonte única)
4. **Backfill incluso** — a KR do EBITDA será corrigida imediatamente na migração
5. **Inclui team KRs** — mesma lógica para `okr_team_key_results`

### Resposta à pergunta 1
**Sim**, esta abordagem corrige em **todos** os locais onde KRs org/team são exibidas (QBR, MBR, OrgView, C-Level Checkin, dashboards, wizards), pois o valor é corrigido na fonte (banco de dados), não em cada hook individual.

### Documentação
Atualizar memory `kpi-kr-integration-standard-v1` com referência ao trigger de sincronização automática.

