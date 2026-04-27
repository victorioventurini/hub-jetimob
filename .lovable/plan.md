# Refatoração de Frequência, Confidence e Ordenação no KPI Gate (v2)

> Revisão crítica aplicada sobre o prompt original. Ajusta UX/escalabilidade e remove dívida técnica prematura.

## Princípios

- Conformidade total com docs canônicos: `TECHNICAL_CONTEXT_REGISTRY.md`, `DATA_MODEL_REGISTRY.md`, `PERMISSIONS_AND_RBAC_MODEL.md`, `SCHEMA_QUICK_REFERENCE.md`, `DEVELOPMENT_STANDARDS.md`.
- Standards aplicados: ENUMs + triggers (não CHECK), sem `select('*')`, `kpisKeys.*` para invalidação, `prevIdRef` em reset de form, BU isolation, soft-delete, RBAC via permission keys.
- Nenhuma dívida técnica prematura: o que não tem entrega imediata não aparece na UI.

## Ajustes vs. plano v1

1. `update_mode` **fica fora do formulário** (banco preparado, UI fixa em `manual`).
2. UI captura **apenas `input_type`**; `confidence` é derivado por trigger DB com possibilidade de override em campo "Avançado" colapsado.
3. **Banner global no Dashboard** + banner discreto por KPI (não banner por KPI em massa).
4. Semântica de `biweekly`/`semiannual` formalmente definida.
5. Decisões disparadas pelo KPI Gate gravam `kpi_input_type`/`kpi_confidence` em metadata (auditoria).
6. `kpi_calculate_period` antiga preservada; cria-se overload `kpi_calculate_period_v2` coexistente.
7. Toggle "apenas consolidados" via **URL state** (`useUrlState`).

---

## Fase 1 — Schema DB

### 1.1 ENUMs

```sql
CREATE TYPE kpi_frequency_value AS ENUM
  ('daily','weekly','biweekly','monthly','quarterly','semiannual','annual');
CREATE TYPE kpi_update_mode AS ENUM ('manual','automatic');
CREATE TYPE kpi_input_type  AS ENUM ('projection','consolidated');
```

### 1.2 Colunas em `kpi_metrics`

```sql
ALTER TABLE kpi_metrics
  ADD COLUMN consolidation_frequency kpi_frequency_value,
  ADD COLUMN update_frequency        kpi_frequency_value,
  ADD COLUMN update_mode             kpi_update_mode NOT NULL DEFAULT 'manual',
  ADD COLUMN frequency_migration_reviewed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN kpi_metrics.frequency IS
  'DEPRECATED v3.0: use consolidation_frequency + update_frequency. Removido em fase futura.';
```

### 1.3 Coluna em `kpi_values`

```sql
ALTER TABLE kpi_values
  ADD COLUMN input_type kpi_input_type NOT NULL DEFAULT 'consolidated';
```

### 1.4 Helpers e validação cruzada (sem CHECK)

```sql
CREATE OR REPLACE FUNCTION public.kpi_frequency_to_days(f kpi_frequency_value)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE f
    WHEN 'daily' THEN 1 WHEN 'weekly' THEN 7 WHEN 'biweekly' THEN 14
    WHEN 'monthly' THEN 30 WHEN 'quarterly' THEN 90
    WHEN 'semiannual' THEN 180 WHEN 'annual' THEN 365 END;
$$;

CREATE OR REPLACE FUNCTION public.validate_kpi_frequency_relationship()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.consolidation_frequency IS NOT NULL AND NEW.update_frequency IS NOT NULL
     AND public.kpi_frequency_to_days(NEW.update_frequency)
       > public.kpi_frequency_to_days(NEW.consolidation_frequency) THEN
    RAISE EXCEPTION 'update_frequency cannot be less frequent than consolidation_frequency';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER kpi_frequency_validation
BEFORE INSERT OR UPDATE ON kpi_metrics
FOR EACH ROW EXECUTE FUNCTION public.validate_kpi_frequency_relationship();
```

### 1.5 `kpi_calculate_period_v2` (overload coexistente)

Função nova aceita `kpi_frequency_value` (7 valores) e devolve `(p_start, p_end, p_label)`. **Antiga preservada** sem modificações para não quebrar callsites.

**Semântica formal:**
- `daily` → dia.
- `weekly` → segunda-domingo (ISO).
- `biweekly` → janela de 14 dias **ancorada na primeira segunda-feira do ano** (cálculo determinístico, mesmo resultado para qualquer usuário).
- `monthly` → mês calendário.
- `quarterly` → Q1/Q2/Q3/Q4 calendário.
- `semiannual` → **H1 = jan-jun, H2 = jul-dez** (fixo).
- `annual` → ano calendário.

Documentar em `docs/canonical/DB_FUNCTIONS_INDEX.md`.

### 1.6 Trigger `trg_kpi_value_validation` (atualização)

Passa a usar `kpi_calculate_period_v2(NEW.reference_date, COALESCE(m.consolidation_frequency, m.frequency::text::kpi_frequency_value))` com fallback ao enum legado por cast. RAG continua sendo calculado e gravado **no momento da escrita** (lógica preservada).

### 1.7 Trigger de derivação de `confidence`

```sql
CREATE OR REPLACE FUNCTION public.derive_kpi_value_confidence()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Só derivar se o usuário NÃO informou confidence explicitamente
  -- (default da coluna é 'medium'; tratamos como "não informado" se input_type já foi escolhido)
  IF TG_OP = 'INSERT' AND NEW.confidence = 'medium' THEN
    NEW.confidence := CASE NEW.input_type
      WHEN 'consolidated' THEN 'high'::kpi_confidence_level
      WHEN 'projection'   THEN 'medium'::kpi_confidence_level
    END;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_kpi_value_derive_confidence
BEFORE INSERT ON kpi_values
FOR EACH ROW EXECUTE FUNCTION public.derive_kpi_value_confidence();
```

> O usuário **pode** sobrescrever via campo "Avançado". Quando a UI envia explicitamente `confidence`, o valor enviado prevalece.

### 1.8 Backfill

```sql
UPDATE kpi_metrics SET
  consolidation_frequency = CASE frequency
    WHEN 'daily' THEN 'daily'::kpi_frequency_value
    WHEN 'weekly' THEN 'weekly' WHEN 'monthly' THEN 'monthly'
    WHEN 'quarterly' THEN 'quarterly' ELSE NULL END,
  update_frequency = CASE frequency
    WHEN 'daily' THEN 'daily'::kpi_frequency_value
    WHEN 'weekly' THEN 'weekly' WHEN 'monthly' THEN 'monthly'
    WHEN 'quarterly' THEN 'quarterly' ELSE NULL END,
  update_mode = 'manual',
  frequency_migration_reviewed = false;

UPDATE kpi_values SET input_type = 'consolidated' WHERE input_type IS NULL;
```

### 1.9 RLS

Sem mudança. Colunas novas herdam policies existentes.

---

## Fase 2 — Tipos e utilitários

### 2.1 `src/modules/kpis/types.ts`

- `KpiFrequency` marcado `@deprecated`.
- Novos: `KpiFrequencyValue`, `KpiUpdateMode`, `KpiInputType`.
- `KpiMetric` ganha `consolidation_frequency`, `update_frequency`, `update_mode`, `frequency_migration_reviewed`.
- `KpiValue` ganha `input_type`.
- `KpiForWizardV2` ganha `update_frequency`, `consolidation_frequency`, `last_input_type`, `last_confidence`, `deviation_pct` (calculado **uma vez** no enriquecimento).

### 2.2 `src/modules/kpis/utils/frequency.ts`

- `FREQUENCY_DAYS` (7 valores).
- `isUpdateFrequencyValid(consolidation, update)`.
- `getFrequencyLabel(value)` pt-BR.
- `suggestInputType(kpi, inputDate)` — espelhando regra do trigger DB.
- `getConsolidationPeriod(freq, date)` com `date-fns` (`startOfWeek`/`startOfMonth`/`startOfQuarter` + cálculo manual de biweekly/semiannual respeitando semântica da Fase 1.5).
- `UPDATE_OVERDUE_THRESHOLDS` (igual a `FREQUENCY_DAYS`).

### 2.3 Testes

`utils/__tests__/frequency.test.ts` — cobertura completa, incluindo casos MRR (mensal × semanal) e edge cases de biweekly/semiannual.

---

## Fase 3 — Formulário de KPI ✅

### 3.1 `editKpiSchema.ts` + `formSchema` (CreateKpiDialog)

- Substituiu `frequency` por `consolidation_frequency` + `update_frequency` (enums de 7 valores).
- `superRefine` aplica `isUpdateFrequencyValid` em ambos os schemas.
- `DbKpiFrequency` marcado `@deprecated`; mantido para escrita-espelho.

### 3.2 `EditKpiBasicFields.tsx` / `CreateKpiDialog.tsx`

- Dois selects dependentes lado-a-lado: **Frequência de consolidação** + **Frequência de atualização**.
- Update select desabilita opções menos frequentes que consolidation; auto-clear quando inválido.
- Hint visual quando intermediário: *"Inputs intermediários serão tratados como projeção"*.
- Tooltips com exemplo MRR.

### 3.3 `useEditKpiForm.ts` / `CreateKpiDialog.tsx`

- Hidrata os 2 campos novos (fallback `legacyFrequencyToValue` para KPIs ainda não migrados manualmente).
- Reset segue padrão `prevIdRef`.
- Mutation escreve `consolidation_frequency`, `update_frequency`, `frequency` (espelho enquanto NOT NULL no DB) e `frequency_migration_reviewed=true`.
- `useKpiMutations.UpdateKpiData` e `useKpiData.createKpi` aceitam os campos novos.

---

## Fase 4 — Captura de input em valores (UI simplificada)

### 4.1 `AddKpiValueDialog.tsx` / `EditKpiValueDialog.tsx`

- Recebe prop `kpi: KpiMetric` (atualmente recebe só id/name/unit — ampliar).
- Novo radio **Tipo do input**: `consolidated` / `projection`. Default por `suggestInputType`.
- **Confidence**: NÃO aparece por padrão. Campo dentro de `<details>` "Avançado":
  ```
  ▸ Avançado
    ☐ Sobrescrever confidence (auto: alta para consolidado, média para projeção)
  ```
  Se usuário marca, exibe radio high/medium/low.
- Hint quando `update_frequency < consolidation_frequency`:
  > *Este KPI consolida {X}, mas é atualizado {Y}. Inputs antes do fechamento são projeções.*
- Schema Zod estende com `input_type` (obrigatório) e `confidence` (opcional — backend deriva quando ausente).
- `useKpiMutations.addKpiValue` e edição passam `input_type` + `confidence?`.

### 4.2 Permissões

- Inserção: `kpis.value.add:bu` (chave canônica confirmada em `PERMISSIONS_AND_RBAC_MODEL.md`).
- Edição: `kpis.value.update_own:bu` (autor).

---

## Fase 5 — `useKpisForWizardV2`

Arquivo: `src/modules/kpis/hooks/useKpisForWizardV2.ts`

- `select` de `kpi_metrics` adiciona `consolidation_frequency, update_frequency, update_mode, frequency_migration_reviewed` (mantém `frequency` para fallback Fase 1).
- `select` de `kpi_values` adiciona `input_type`.
- **`checkNeedsUpdate(kpi, lastValueDate)`** refatorada:
  - Usa `kpi.update_frequency ?? legacyMap(kpi.frequency)`.
  - Se nulo → `false` (KPI ex-`manual` sem revisão fica fora de `kpisToUpdate`).
  - Sem valor lançado → `true`.
  - Senão → `daysSinceLastInput >= UPDATE_OVERDUE_THRESHOLDS[update_frequency]`.
- Helper novo `filterKpisForRitual(kpis, ritualType)`: filtra por compatibilidade `update_frequency ≤ ritualMax` + sempre inclui em alerta.
- Enriquecimento calcula `deviation_pct` **uma vez** e armazena em `KpiForWizardV2`.
- 5 buckets retornados permanecem inalterados (compatibilidade).

### Tech debt registrada (não nesta entrega)

Adicionar comentário `// PERF: considerar materialização via view/RPC se BU > 50 KPIs ativos` no topo do hook.

---

## Fase 6 — Ordenação 6-blocos no KPI Gate

Arquivo: `src/modules/okrs/components/wizards/shared/framework/config/stepContentAdapters.ts`

- Função nova `classifyKpiGateBuckets(wizardData)` retorna 6 grupos:
  1. `overdue` (= `kpisToUpdate`)
  2. `critical` (= `kpisInAlert ∩ off_track`, exclui overdue)
  3. `guardrailViolated`
  4. `attention` (= `kpisInAlert ∩ at_risk`, exclui overdue)
  5. `healthy` (= `kpisStrategic ∩ on_track`)
  6. `teamContext` (colapsado por default)
- Ordenação intra-bloco: `byUpdateFrequencyThenDeviation` (usa `deviation_pct` já pré-calculado).
- `KpiGateStep` (compartilhado) e `MbrKpiGateStep` renderizam os 6 blocos com:
  - Badge "Projeção"/"Consolidado" no último input.
  - Badge "Conf: Alta/Média/Baixa".
  - Badge sutil quando `last_confidence='low'` ou `last_input_type='projection'`.
- Hint de confidence baixa em decisões críticas (modal de confirmação).
- Gate de avanço continua via `KpiGateStepConfig.requireResolution` existente.

**Weekly**: o repo não tem step KPI Gate na Weekly hoje. **Fora deste escopo** — registrar como follow-up.

---

## Fase 7 — Auditoria de decisões disparadas pelo KPI Gate

Quando o condutor registra decisão sobre um KPI vermelho via `InlineDecisionsSlot`:

- O payload da decisão grava em `metadata` (jsonb):
  ```json
  {
    "source": "kpi_gate",
    "kpi_id": "...",
    "kpi_input_type": "projection|consolidated",
    "kpi_confidence": "low|medium|high",
    "kpi_rag_status": "off_track"
  }
  ```
- Permite post-mortem: filtrar decisões tomadas sobre projeções de baixa confidence.
- Sem mudança de schema (campo `metadata` já existe em `okr_decisions`).

---

## Fase 8 — Visualização de `input_type` na evolução

- `KpiEvolutionChart.tsx`:
  - Pontos `consolidated` sólidos; `projection` com `strokeDasharray` + opacidade reduzida.
  - **Toggle "Mostrar apenas consolidados" via URL state** (`useUrlState({ key: 'evolution_only_consolidated', schema: ... })`) — respeita `mem://standards/url-state-preservation`.
- `KpiValuesTable.tsx` / `KpiHistoryDialog.tsx`: nova coluna **Tipo** + badge **Confidence**; row de projeção com `bg-muted/30`.
- `KpiDetailContent.tsx`: bloco resumo *"Último consolidado / Última projeção / Próxima consolidação esperada"* (calculada via `getConsolidationPeriod`).

---

## Fase 9 — Banner de revisão (UX escalável)

### 9.1 Banner GLOBAL no Dashboard `/kpis`

Quando `count(frequency_migration_reviewed=false) > 0`:

```
ℹ️ {N} indicadores precisam de revisão de frequência
   [Ver indicadores pendentes]
```

CTA aplica filtro `?needs_review=1` no URL state, listando apenas os pendentes.

### 9.2 Banner discreto no detalhe individual

Apenas no KPI atual quando `frequency_migration_reviewed=false`:

```
ℹ️ Configuração migrada — revise consolidação e atualização.
   [Revisar agora]
```

CTA abre `EditKpiDialog` direto na seção Cálculo.

### 9.3 Variante destacada para ex-`manual`

Quando `consolidation_frequency IS NULL`:

```
⚠️ Este indicador precisa ter sua frequência configurada
   para aparecer corretamente nos ritos.
```

### 9.4 Permissão

Banners e CTA aparecem apenas para usuários com `kpis.settings.manage:bu` (`useCanEditKpi`).

---

## Fase 10 — Componentes secundários

- `KpiCard.tsx`, `KpiContextSection.tsx`: substituir exibição de `frequency` por `update_frequency` (com fallback ao antigo enquanto Fase 1).
- Memoização preservada (`React.memo` já obrigatório).

---

## Fase 11 — Auditoria pós-migração

Script `scripts/audit-kpi-frequency-migration.ts`:
- Conta KPIs migrados por categoria.
- Lista KPIs com `consolidation_frequency IS NULL` (ex-`manual`).
- Confere que nenhum KPI com `frequency NOT NULL` ficou sem migração.
- Saída em `/mnt/documents/kpi-frequency-migration-report.md`.

---

## Fase 12 — Documentação canônica

Atualizações **obrigatórias** na mesma entrega:

1. `docs/canonical/SCHEMA_QUICK_REFERENCE.md` — colunas novas em `kpi_metrics`/`kpi_values`, novos enums.
2. `docs/canonical/DATA_MODEL_REGISTRY.md` — seção 2.3 (KPIs) + 9 (enums).
3. `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` — versão bumped + nota sobre os 3 campos novos.
4. `docs/canonical/DB_FUNCTIONS_INDEX.md` — `kpi_calculate_period_v2`, `derive_kpi_value_confidence`, `validate_kpi_frequency_relationship` + semântica formal de biweekly/semiannual.
5. **Criar** `mem://features/kpis/kpis-master-standard` (referenciado no índice mas inexistente).
6. Atualizar `mem://index.md` referenciando as mudanças.

---

## Confirmações finais

- ✅ ENUMs (não CHECK) — alinhado a `mem://standards/database/check-constraint-prohibition`.
- ✅ `frequency` antigo preservado na Fase 1.
- ✅ KPIs com `frequency='manual'` ficam fora dos ritos até revisão.
- ✅ `useKpisForWizardV2` usa `update_frequency`; `checkNeedsUpdate` refatorada.
- ✅ Ordenação 6-blocos; `kpisTeamContext` colapsado.
- ✅ Detecção `no_data` por atraso usa `update_frequency`.
- ✅ Captura **só `input_type`** na UI; `confidence` derivado por trigger; override em "Avançado".
- ✅ Decisões críticas gravam `kpi_input_type`/`kpi_confidence` em metadata (auditoria).
- ✅ Visualização diferenciada projeção × consolidado; toggle via URL state.
- ✅ Banner global + discreto (não banner por KPI).
- ✅ Semântica formal de biweekly (segunda-âncora) e semiannual (H1/H2).
- ✅ `kpi_calculate_period` antiga preservada; v2 coexistente.
- ✅ Permission key `kpis.value.add:bu` (canônica).
- ✅ Query keys via `kpisKeys.*`.
- ✅ Padrão `prevIdRef` no reset do form.
- ✅ RAG calculado e gravado no momento da escrita (preservado).
- ✅ BU isolation, RLS, RBAC, soft-delete preservados.
- ✅ Docs canônicos atualizados na mesma entrega.

## Fora deste escopo (follow-ups)

- Step "KPI Gate" dedicado dentro da **Weekly**.
- Implementação de `update_mode='automatic'` (integrações).
- Remoção física de `frequency` (Fase 2/3 futuras).
- Materialização SQL de `useKpisForWizardV2` se BU passar de ~50 KPIs ativos.
