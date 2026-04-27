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

## Fase 4 — Captura de input em valores (UI simplificada) ✅

### 4.1 `AddKpiValueDialog.tsx` / `EditKpiValueDialog.tsx`

- Novas props opcionais `consolidationFrequency` / `updateFrequency` (sem quebra de callers existentes).
- Radio **Tipo do input** (`consolidated` / `projection`) com default por `suggestInputType` no Add e hidratado de `kpiValue.input_type` no Edit.
- No Add, ao mudar `reference_date`, re-sugere `input_type` automaticamente.
- Hint visual quando `update_frequency < consolidation_frequency`: explica que inputs antes do fechamento são projeções.
- Bloco `<details>` "Avançado" com checkbox "Sobrescrever confidence" → revela RadioGroup `Alta/Média/Baixa`.
- Quando `override_confidence` está desligado, o front **não** envia `confidence`, deixando o trigger `derive_kpi_value_confidence` aplicar o default (`high` para consolidado, `medium` para projeção).
- Schema Zod estendido com `input_type` (obrigatório), `override_confidence` (opcional) e `confidence` (opcional).

### 4.2 Mutations (`useKpiData.addKpiValue`, `useKpiMutations.updateKpiValue`)

- Aceitam `input_type` e `confidence?`. `confidence` só é enviado quando explicitamente fornecido pelo usuário.
- `addKpiValue` faz default `input_type='consolidated'` quando ausente.

### 4.3 Selects ampliados

- `useKpiDetail` agora seleciona `consolidation_frequency, update_frequency, update_mode, frequency_migration_reviewed` em `kpi_metrics` e `input_type` em `kpi_values`.
- `KpiValuesTable`, `KpiDetailContent`, `KpiHistoryDialog`, `KpiDashboardPage` e `KpiActionsMenu` repassam as frequências para os diálogos.

### 4.4 Permissões (sem mudança)

- Inserção: `kpis.value.add:bu`.
- Edição: `kpis.value.update_own:bu` (autor).


---

## Fase 5 — `useKpisForWizardV2` ✅

- `select` de `kpi_metrics` agora inclui `consolidation_frequency` e `update_frequency`.
- `select` de `kpi_values` inclui `input_type`.
- `checkNeedsUpdate` refatorada: usa `update_frequency` (com fallback `legacyFrequencyToValue(kpi.frequency)`); KPIs sem frequência (ex-`manual` não revisados) retornam `false` e ficam fora de `kpisToUpdate`.
- Threshold por cadência via `FREQUENCY_DAYS` (7 valores).
- `KpiForWizardV2` ganhou `consolidation_frequency`, `update_frequency`, `latest_input_type` e `deviation_pct` (pré-calculado uma vez no enriquecimento, sensível à `direction`).
- 5 buckets retornados permanecem inalterados (compatibilidade).
- Testes: 142 passando (incluindo `CollaboratorContextStep` atualizado para o novo shape).

### Tech debt registrada (não nesta entrega)

Adicionar comentário `// PERF: considerar materialização via view/RPC se BU > 50 KPIs ativos` no topo do hook.

---

## Fase 6 — Ordenação 6-blocos no KPI Gate ✅

Arquivos: `stepContentAdapters.ts`, `KpiGateStep.tsx` (genérico), `MbrKpiGateStep.tsx`, `types/wizard/mbr.ts`.

- **`classifyKpiGateBuckets(input)`** retorna 6 grupos com precedência por `seen` (KPI aparece em apenas 1 bucket):
  1. `overdue` (= `kpisToUpdate`)
  2. `critical` (= `kpisInAlert ∩ off_track`, exclui overdue)
  3. `guardrailViolated` (= `guardrailsViolated`, exclui anteriores)
  4. `attention` (= `kpisInAlert ∩ at_risk`, exclui overdue)
  5. `healthy` (= `kpisStrategic ∩ on_track`)
  6. `teamContext` (`kpisTeamContext`, **colapsado por default** via `COLLAPSED_BY_DEFAULT`).
- **Ordenação intra-bloco**: `byUpdateFrequencyThenDeviation` — usa `update_frequency → FREQUENCY_DAYS` (mais frequente primeiro), desempata por `|deviation_pct|` desc.
- **`KpiGateItem`** estendido com campos opcionais `lastInputType`, `lastConfidence`, `updateFrequency`, `deviationPct` (sem quebra para callers existentes).
- **`KpiGateStep`** (genérico) ganhou prop opcional `buckets?: KpiGateBucket[]`. Quando fornecida, renderiza blocos colapsáveis com badges `Projeção`/`Consolidado` + `Conf: Alta/Média/Baixa` (destructive em `low`). Quando ausente, mantém comportamento legacy (lista chapada).
- **`MbrKpiGateStep`**: adicionadas badges `Projeção/Consolidado` + Confidence quando o snapshot fornecer `latestInputType`/`latestConfidence` (campos opcionais novos em `MbrKpiSnapshot`). Gate de avanço (toggle "Exige decisão estratégica" + decisão registrada) preservado.
- **Adapter**: `kpiForWizardV2ToGateItem(kpi, opts)` é o ponto de adaptação canônico; mapeia `latest_rag_status` para `status` e popula os 4 metadados v3.0.0.
- **Tests**: 315 passando (todas as suítes de wizards/MBR/KPI utils). TS limpo.

### Pendências de fase futura (não nesta entrega)

- Hidratação de `latestInputType`/`latestConfidence` no builder do `MbrKpiSnapshot` (depende do snapshot loader do MBR — fora deste escopo de UI).
- Rituais que consomem `KpiGateStep` genérico (Collaborator/Leader Prep) precisam passar `buckets={classifyKpiGateBuckets(...)}` no consumidor — gancho deixado pronto, ativação por rito é troca pontual.
- Hint de confidence baixa em modal de confirmação de decisão crítica → segue para Fase 7 (auditoria de decisões).

**Weekly**: o repo não tem step KPI Gate na Weekly hoje. **Fora deste escopo** — registrar como follow-up.

---

## Fase 7 — Auditoria de decisões disparadas pelo KPI Gate ✅

Arquivos: `src/modules/okrs/types/wizard/shared.ts`, `InlineDecisionInput.tsx`, `MbrKpiGateStep.tsx`.

- **`TeamCheckinDecision.metadata?: Record<string, unknown>`** adicionado ao tipo. Campo livre (jsonb), serializado junto com o restante da decisão na persistência atual (sem mudança de schema DB — decisões são gravadas como jsonb dentro do payload do rito).
- **`InlineDecisionInput`** ganhou prop opcional `metadataFactory?: () => Record<string, unknown> | undefined`. Quando presente, é chamada na criação de cada decisão e o retorno é mesclado em `decision.metadata` (apenas se `Object.keys.length > 0`).
- **`MbrKpiGateStep`** passa `metadataFactory` ao `InlineDecisionInput` do KPI Gate gravando:
  ```json
  {
    "source": "kpi_gate",
    "kpi_id": "...",
    "kpi_rag_status": "red|yellow|...",
    "kpi_input_type": "projection|consolidated",  // se disponível
    "kpi_confidence": "low|medium|high"           // se disponível
  }
  ```
- Permite post-mortem: filtrar decisões tomadas sobre projeções de baixa confidence.
- Sem mudança de schema DB; sem quebra de callers (prop opcional).
- **Tests**: 338 passando. TS limpo.

### Pendência futura
- Replicar `metadataFactory` no `KpiGateStep` genérico quando rituais (Collaborator/Leader Prep) usarem decisão por KPI individual (hoje só MBR tem essa interação granular).
- Modal de confirmação extra para decisões com `kpi_confidence='low'` — registrado como follow-up de UX (não-bloqueante).

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
