# Plano — Renomear "Projeção" → "Parcial" em inputs de KPI

## Pré-checklist obrigatório (executado)

| Doc consultado | Achado relevante |
|---|---|
| `TECHNICAL_CONTEXT_REGISTRY.md` v3.29.0 | Cita explicitamente "projeção × consolidado" e "63/63 valores marcados consolidated" — precisa bump v3.29.1 com renomeação |
| `SCHEMA_QUICK_REFERENCE.md` | Linhas 184 e 189 listam `projection` no enum `kpi_input_type` |
| `DB_FUNCTIONS_INDEX.md` linha 1065 | Texto descritivo cita `projection → medium`; **função real no banco não usa o literal** (só testa `consolidated`), então só a doc precisa ajuste |
| `DEVELOPMENT_STANDARDS.md` v1.30.0 | Sem regras específicas afetadas; referência ao TCR pode ficar como está |
| `mem://features/kpis/kpis-master-standard` | Linhas 30, 36, 86, 104 mencionam `projection` — atualizar SSOT |
| `mem://standards/database/check-constraint-prohibition` | **Confirma:** usar ENUM (e não CHECK) — alinhado com `ALTER TYPE RENAME VALUE` |
| `IDENTITY_CONVENTION.md` / `PERMISSIONS_AND_RBAC_MODEL.md` | Não impactados (mudança não toca identidade nem RBAC) |
| `BU_SCOPED_SUPABASE_RULES.md` | Não impactado (sem novas queries) |
| `DATA_MODEL_REGISTRY.md` | Sem menção a `input_type`/`projection` — não exige update |
| Auditoria DB | 0 registros com `'projection'` (todos os 63 são `consolidated`); função `derive_kpi_value_confidence` **não cita literal `projection`** → seguro renomear |

### Validações contra o prompt do Claude

| Item | Prompt sugeria | Realidade no projeto | Decisão |
|---|---|---|---|
| Coluna `input_type` | CHECK constraint | ENUM `kpi_input_type` | Usar `ALTER TYPE ... RENAME VALUE` (não DROP/ADD CHECK) |
| Migração de dados | UPDATE em massa | 0 linhas afetadas | Migração é só de schema (rename) |
| Editar `src/integrations/supabase/types.ts` | Sim | **NUNCA** (auto-gerado) | Confiar na regeneração automática |
| Funções DB usam string `'projection'` | — | Não | Sem alteração em funções/triggers |

---

## Fase 1 — Migração de banco

Uma única migration, atômica, instantânea, sem rewrite, sem perda de dados:

```sql
ALTER TYPE public.kpi_input_type RENAME VALUE 'projection' TO 'partial';
```

Após o rename:
- A função `derive_kpi_value_confidence` continua válida (não referencia `projection`).
- Trigger `kpi_frequency_validation` não é afetado.
- RLS, índices, views, FKs: zero impacto.
- `src/integrations/supabase/types.ts` é regenerado automaticamente pelo Lovable Cloud com `kpi_input_type: "partial" | "consolidated"`.

---

## Fase 2 — Tipos & utilitários TypeScript

| Arquivo | Mudança |
|---|---|
| `src/modules/kpis/types.ts` L34 | `KpiInputType = 'partial' \| 'consolidated'` |
| `src/modules/kpis/types.ts` L216-218 | `INPUT_TYPE_LABELS = { partial: 'Parcial', consolidated: 'Consolidado' }` |
| `src/modules/kpis/utils/frequency.ts` L221-235 | `suggestInputType` retorna `'partial'` no lugar de `'projection'` |
| `src/modules/kpis/hooks/useKpiData.ts` L348, L358 | Literal `'projection'` → `'partial'` |
| `src/modules/kpis/hooks/useKpiMutations.ts` L214 | Literal `'projection'` → `'partial'` |
| `src/modules/okrs/types/wizard/mbr.ts` L61 | `latestInputType?: 'partial' \| 'consolidated' \| null` |
| `src/modules/okrs/types/wizard/shared.ts` L93 | Comentário do payload de decisão |

---

## Fase 3 — Componentes UI (KPIs)

| Arquivo | Mudança |
|---|---|
| `AddKpiValueDialog.tsx` L47, L196+ | `z.enum(['consolidated','partial'])`; radio label **"Parcial"** + descrição **"Valor atingido até a data, antes do período fechar"**; default via `suggestInputType` continua funcionando |
| `EditKpiValueDialog.tsx` L46, L106, L131, L187+ | Idem (schema, hidratação, label, descrição) |
| `KpiValuesTable.tsx` L237, L309 | `isProjection` → `isPartial`; texto **"Parcial"**; manter visual diferenciado (border-dashed) |
| `KpiEvolutionChart.tsx` L35, L68, L88 | Filtro `v.input_type !== 'partial'`; legenda "Parcial"; comentários v3.0.0 |
| `KpiHistoryDialog.tsx` L131, L135 | Filtros `!== 'partial'` e contador `=== 'partial'`; toggle "Apenas consolidados" mantido |
| `KpiActionsMenu.tsx` L46 | Comentário atualizado |

---

## Fase 4 — Componentes UI (Ritos / KPI Gate)

| Arquivo | Mudança |
|---|---|
| `MbrKpiGateStep.tsx` L153, L156, L159, L213 | `=== 'projection'` → `=== 'partial'`; badge **"Parcial"** (border-dashed); payload `kpi_input_type: 'partial'` |
| `wizards/shared/framework/components/KpiGateStep.tsx` L55, L72 | `isProjection` → `isPartial`; badge **"Parcial"** |
| `wizards/shared/framework/config/stepContentAdapters.ts` L177, L199 | Comentário v3.0.0; tipo herda do novo `KpiInputType` |
| `useKpisForWizardV2.ts` | Sem mudança de literal (já usa o tipo) — só herda |

---

## Fase 5 — UX adicional pedida pelo prompt

- **Hint em decisões críticas no KPI Gate:** quando `kpi.lastInputType === 'partial'`, exibir aviso já existente reformulado para:
  > "Este KPI tem valor parcial — o período ainda não fechou. A decisão será tomada com base no que foi atingido até agora, não no valor consolidado final."
  
  Verificar se já existe componente de aviso em `KpiGateStep`/`MbrKpiGateStep`; se não houver, adicionar `Alert` discreto inline (sem novo componente reutilizável — escopo enxuto).

---

## Fase 6 — Documentação canônica & memória

| Arquivo | Mudança |
|---|---|
| `docs/canonical/SCHEMA_QUICK_REFERENCE.md` L184, L189 | `kpi_input_type: partial \| consolidated` + texto descritivo |
| `docs/canonical/DB_FUNCTIONS_INDEX.md` L1065 | Trecho do trigger: "consolidated → high, partial → medium" |
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` L4 | Bump **v3.29.0 → v3.29.1** com nota: "Renomeado `kpi_input_type.projection` → `partial` (semântica correta: valor parcial observado até a data, não estimativa de futuro). Migration via `ALTER TYPE RENAME VALUE`, zero registros afetados." |
| `mem://features/kpis/kpis-master-standard` L30, L36, L86, L104 | Substituir `projection` por `partial`; ajustar bloco JSON de decisões; reescrever §6 ("projeções com dot oco" → "parciais com dot oco") |
| `mem://index.md` | One-liner do KPI Master ajustado se necessário |

---

## Fase 7 — Verificação final

1. `rg -n "projection|Projeção" src/ docs/canonical/` — esperado: zero ocorrências (apenas `src/integrations/supabase/types.ts` antes da regeneração; após regen, zero).
2. `tsc --noEmit` limpo.
3. Auditoria SQL: `SELECT input_type, count(*) FROM kpi_values GROUP BY input_type` — esperado `consolidated: 63`.
4. Smoke manual: AddKpiValueDialog mostra label "Parcial" + nova descrição; KpiValuesTable / KpiEvolutionChart / KPI Gate exibem "Parcial".

---

## Riscos & mitigações

- **Sessões antigas (bundle pré-rename) tentando inserir `'projection'`:** PostgreSQL retorna `invalid input value for enum`. Aceitável; janela curtíssima (rename é instantâneo, deploy do front segue logo após). Sem necessidade de alias temporário.
- **Regeneração de `types.ts`:** Lovable Cloud regenera automaticamente. Caso haja lag, o tipo manual `KpiInputType` em `src/modules/kpis/types.ts` mantém o frontend compilando.
- **Zero impacto** em RLS, triggers, funções, índices, views, edge functions, RBAC, BU isolation.

---

## Entregáveis

1. 1 migration SQL (uma linha funcional).
2. Patches em ~13 arquivos TS/TSX.
3. 3 docs canônicos atualizados (SCHEMA, DB_FUNCTIONS, TCR) + 1 memória SSOT KPIs atualizada.
4. Verificação por `rg` confirmando zero ocorrências de `projection`/`Projeção` no código de aplicação.

Posso prosseguir com a implementação?
