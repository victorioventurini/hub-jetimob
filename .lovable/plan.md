## Problema

Hoje o `kpi_values` só tem `UNIQUE (kpi_id, reference_date)`. Isso permite **dois lançamentos consolidados no mesmo período** (ex.: Abril/2026) com `reference_date` diferentes (ex.: 2026-04-26 e 2026-04-30). Já existem 2 KPIs nessa situação.

Regra desejada: **um KPI não pode ter mais de um valor `consolidated` no mesmo período** (`period_start`/`period_end`).

---

## Plano

### 1. Limpeza dos duplicados existentes (data fix)
Para cada par `(kpi_id, period_start, input_type='consolidated')` com mais de 1 registro, manter o **mais recente por `created_at`** e **soft-deletar** os anteriores convertendo para `partial` + anotando origem (`notes` apensado com prefixo `[auto-migrated:duplicate-consolidated]`).
- Não excluímos fisicamente para preservar histórico/auditoria e não quebrar `sync_org_kr_from_primary_kpi`.
- KPIs afetados (já mapeados): `c6d1834b-…` e `e0d15aca-…` em Abril/2026.

> Alternativa rejeitada: hard delete. Mantemos como `partial` para preservar a trilha.

### 2. Constraint no banco
Criar **índice único parcial**:
```sql
CREATE UNIQUE INDEX kpi_values_one_consolidated_per_period
  ON public.kpi_values (kpi_id, period_start)
  WHERE input_type = 'consolidated';
```
- Só vale para `consolidated`. `partial` continua livre (vários ao longo do mês).
- `period_start` é populado pelo trigger `kpi_validate_value_insert` antes do insert, então o índice fecha a brecha antes de qualquer escrita.
- Sem CHECK constraint (em respeito ao canon "no CHECK constraints").

### 3. Atualizar mensagem de erro do banco (opcional, mas recomendado)
Estender o trigger `kpi_validate_value_insert` para checar explicitamente e levantar erro com **mensagem amigável em PT-BR** com `ERRCODE='23505'` (já é o code do unique violation) e detail estruturado, para o frontend conseguir interpretar:
- Se já existir consolidado no mesmo período (excluindo o próprio id em UPDATE), `RAISE EXCEPTION USING ERRCODE='23505', MESSAGE='Já existe um valor consolidado para este período.', HINT='kpi_consolidated_period_conflict'`.

### 4. UX de substituição (frontend)
Em `KpiValueEntryForm` / `AddKpiValueDialog`:
- Antes do submit, quando `input_type='consolidated'`, consultar `kpi_values` por `kpi_id` + período da `reference_date` (já temos `kpi_calculate_period` no DB; no client, derivar via `monthBoundsDate`/`useKpiData` evolução já carregada) para detectar conflito.
- Se houver, abrir `AlertDialog` "Já existe um consolidado para Abril/2026 com valor X (lançado em DD/MM por Fulano). Substituir?".
  - **Confirmar** → `updateKpiValue` no registro existente (mantém `id`, atualiza `value`, `reference_date`, `notes`).
  - **Cancelar** → fecha modal, nada é salvo.
- Capturar `error.code === '23505'` ou `hint==='kpi_consolidated_period_conflict'` em `addKpiValue` como rede de proteção e disparar o mesmo modal.

### 5. Invalidações
Sem mudanças — `updateKpiValue` já invalida `kpis.values`, `evolutionList`, `okrs.krPrimaryKpi*`.

### 6. Memória
Adicionar regra ao `mem://features/kpis/kpis-master-standard`: "1 consolidado por período por KPI; substituição via modal de confirmação".

---

## Arquivos afetados

**Migração (DB)**
- Soft-migrar duplicados existentes (`UPDATE kpi_values SET input_type='partial', notes=...`).
- Criar índice único parcial `kpi_values_one_consolidated_per_period`.
- Atualizar `kpi_validate_value_insert` para erro amigável.

**Frontend**
- `src/modules/kpis/components/shared/KpiValueEntryForm.tsx` — detectar conflito antes do submit.
- `src/modules/kpis/components/AddKpiValueDialog.tsx` — `AlertDialog` de substituição + chamada a `updateKpiValue` quando confirmado.
- `src/modules/kpis/hooks/useKpiData.ts` — `addKpiValue.onError` interpretando `23505/hint` para sinalizar conflito.

**Memória**
- `mem://features/kpis/kpis-master-standard` (append da regra).

---

## Fora de escopo
- Mudanças em `period_start`/`period_end`/`reference_date` semantics.
- Backfill histórico de outros períodos sem duplicação detectada.
- UI de "ver histórico de valores do mesmo período".
