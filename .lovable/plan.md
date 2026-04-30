# Plano — Remover "Confiança no Valor" dos KPIs

## Contexto e justificativa
O campo `confidence` em `kpi_values` (enum `kpi_confidence_level`: high/medium/low) é uma autoavaliação subjetiva sobre a veracidade do dado. Foi adicionado em v2.1 mas é redundante com sinais já existentes:
- **`input_type`** (Consolidado/Parcial) já indica se o dado é fechado ou provisório.
- **`source`** (manual/api/webhook/database) já indica origem/confiabilidade da fonte.
- **`rag_status`** já mede performance vs. meta.

**Decisão:** eliminar `confidence` do escopo **KPI**. O `confidence` de **OKR check-ins** (`okr_checkins.confidence`, enum `okr_confidence`) **permanece intacto** — é outra entidade.

---

## 1. Banco de Dados (migration única)

```sql
-- 1. Drop trigger e function
DROP TRIGGER IF EXISTS trg_kpi_value_derive_confidence ON public.kpi_values;
DROP FUNCTION IF EXISTS public.derive_kpi_value_confidence();

-- 2. Drop coluna
ALTER TABLE public.kpi_values DROP COLUMN IF EXISTS confidence;

-- 3. Drop enum (CASCADE só após drop da coluna)
DROP TYPE IF EXISTS public.kpi_confidence_level;
```

Auditar `calculate_objective_health` e `kpi_validate_value_insert` — se referenciarem `confidence`, ajustar (recriar sem o campo).

> Tipos auto-gerados (`src/integrations/supabase/types.ts`) serão regenerados automaticamente após a migration.

---

## 2. SSOT compartilhado (`src/modules/kpis/components/shared/`)

- **`KpiValueEntryForm.tsx`**: remover seção "Confiança no Valor" (modo `always-visible` e bloco `<details>` "Avançado" com `override_confidence`); remover props `confidenceMode`, `defaultConfidence`, `CONFIDENCE_OPTIONS`, lógica de `overrideConfidence`.
- **`kpiValueEntrySchema.ts`**: remover campos `confidence` e `override_confidence` do Zod schema e do tipo `KpiValueEntryFormValues`.

Schema final: `value`, `reference_date`, `input_type`, `notes`.

---

## 3. Módulo `/kpis`

| Arquivo | Mudança |
|---------|---------|
| `AddKpiValueDialog.tsx` | Remover `confidenceMode="advanced"` e `confidence` no payload |
| `EditKpiValueDialog.tsx` | Remover schema local de `override_confidence/confidence`, hidratação, UI "Avançado", envio na mutation |
| `KpiValuesTable.tsx` | Remover coluna/badge de confidence (`confidenceConfig`) |
| `KpiEvolutionChart.tsx` | Remover `confidence` do mapeamento |
| `hooks/useKpiData.ts` | Remover `confidence` dos selects, tipos e payloads |
| `hooks/useKpiWithHistory.ts` | Remover `confidence` do select e tipo |
| `hooks/useKpisForWizard.ts` | Remover `latest_confidence` e select |
| `hooks/useKpisForWizardV2.ts` | Idem |
| `hooks/useKpiMutations.ts` | Remover `confidence` do payload de update |
| `types.ts` | Remover `KpiConfidenceLevel`, `confidence`, `latest_confidence` |

---

## 4. Ritos (`src/modules/okrs/components/wizards/...`)

- **Collaborator**:
  - `CollaboratorKpiStep.tsx`: remover `confidenceMode="always-visible"` e campo `confidence` do submit.
  - `CollaboratorSummary.tsx`: remover badges 🟢🟡🔴 de confidence em **KPIs** (manter para KRs).
  - `CollaboratorCheckinPage.tsx`: remover `confidence` do tipo do mutation `addKpiValueSilent` e do payload.
- **MBR — `MbrKpiGateStep.tsx`**: remover `kpi_confidence` enviado para snapshot.
- **Pre-Weekly — `PreWeeklySourcesStep.tsx`**: remover contagem de `lowConfidence` em resultados de KPI.
- **Cycle Check-ins** (`CycleCheckinsFeed/Filters/Summary/Table.tsx`, `useCycleCheckins.ts`): manter confidence no caminho **KR**; remover quando aplicado a KPI.
- **Ritual Report — `CollaboratorReport.tsx`**: remover `<ConfidenceBadge>` na linha de KPI (manter na linha de KR).
- **Shared**:
  - `LatestCheckinSummary.tsx`, `WizardTooltips.tsx`: revisar — manter para KR, remover quando exibido para KPI.
  - `framework/config/stepContentAdapters.ts`: revisar adaptadores de KPI.
- **Tipos**: `types/wizard/collaborator.ts`, `mbr.ts`, `shared.ts` — remover `confidence` dos tipos de **KPI** (KR não mexe).

---

## 5. Outros consumidores

- **`src/modules/teams/hooks/useTeamContributionAnalytics.ts`**: substituir o score baseado em `confidence` por mapping de `rag_status` (`green`=100, `amber`=50, `red`=0, `no_data`=null/skip).
- **`src/modules/teams/hooks/useTeamKpisGrouped.ts`**: remover `confidence` do select e tipo.
- **`supabase/functions/analysis-generate/index.ts`**: remover `confidence` do select e do tipo `KpiValueRow` (manter no `CheckinRow` — KR).
- **`supabase/functions/_shared/tcr/entities.ts`**: remover linha `confidence` da definição da entidade `kpi_values`.
- **`src/modules/okrs/hooks/queries/okrFieldDefinitions.ts`** e quaisquer outras queries que listem colunas de `kpi_values`: remover `confidence`.

---

## 6. Testes

Atualizar/limpar asserts e fixtures de **confidence em KPI** (manter os de KR):
- `CollaboratorKpiStep.test.tsx`, `CollaboratorContextStep.test.tsx`, `CollaboratorCheckinKpiSave.test.ts`
- `useCreateCheckin.test.ts` / `useCreateCheckin.integration.test.ts` (apenas asserts ligados a KPI)
- `CycleCheckinsFilters.test.tsx`, `queries.test.ts`, `types.test.ts`
- `okr.factory.ts`, `fixtures.ts` — limpar campos de confidence em fixtures de KPI
- `CLevelSteps.test.tsx` — remover `confidence` em payloads de KPI

---

## 7. Documentação canônica & Memória

- **`docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`** (bump v3.30.0):
  - Linha 837: remover `confidence` da tabela `kpi_values`.
  - Linha 844: remover bullet "Default confidence".
  - Linhas 2904, 2913, 2922: remover `kpi_confidence_level` da lista de enums e item "confidence" da seção KPIs v2.1.
  - Linha 3267: remover "confidence" do filtro de listagem.
  - Adicionar entrada de versão v3.30.0 documentando a remoção e a justificativa (redundância com `input_type` + `source`).
- **`docs/canonical/DATA_MODEL_REGISTRY.md`**: remover entrada do enum `kpi_confidence_level` (linha 226).
- **`docs/canonical/SCHEMA_QUICK_REFERENCE.md`**: linha 182 — remover `confidence` da lista de colunas; linha 184 — remover menção ao trigger `derive_kpi_value_confidence`.
- **`docs/canonical/DB_FUNCTIONS_INDEX.md`**: remover entrada `derive_kpi_value_confidence()` (linhas 1064-1065).
- **`docs/canonical/UI_COMPONENTS_REGISTRY.md`**: atualizar registro do `KpiValueEntryForm` — remover coluna `confidenceMode`, exemplos e nota sobre trigger.
- **`.lovable/memory/features/kpis/kpi-value-entry-ssot.md`**: remover coluna `confidenceMode` da tabela; ajustar regra 2 (não citar mais `derive_kpi_value_confidence`).
- **`.lovable/memory/features/kpis/kpis-master-standard`**: remover menção a "confidence" do índice (entrada do master); bump de versão.
- **`.lovable/memory/features/teams/team-contribution-tab-standard.md`**: documentar nova fórmula (rag_status no lugar de confidence).
- **`.lovable/memory/index.md`**: bump versão da entrada `KPIs Master`.

---

## 8. Ordem de execução

1. **Frontend e edge functions primeiro** — parar de enviar/ler `confidence` (deploy não-bloqueante: coluna ainda existe, fica nullable de fato).
2. **Migration DB** — drop trigger → drop column → drop type.
3. **Regenerar tipos Supabase** — automático após migration.
4. **Atualizar docs e memórias**.

> Inverter essa ordem (DB primeiro) quebraria inserts em produção até o deploy do frontend.

---

## 9. Verificação final

1. `rg "confidence" src/modules/kpis` → zero ocorrências.
2. `rg "kpi_confidence|latest_confidence" src/` → zero ocorrências.
3. `psql -c "\d kpi_values"` → coluna `confidence` ausente; trigger `trg_kpi_value_derive_confidence` ausente.
4. `psql -c "\dT kpi_confidence_level"` → erro "does not exist".
5. Smoke manual:
   - Registrar valor pelo modal `/kpis` → form sem campo confidence, persiste sem erro.
   - Registrar valor pelo step KPIs do **Collaborator Check-in** → idem.
   - Abrir relatório de rito antigo (já completado) → renderiza sem quebrar.
   - Página `/teams/:id/contribution` → score continua sendo calculado (agora via rag_status).
6. Build limpo; suíte de testes verde.
