# KPI `frequency` Sunset — Audit & Migration Plan

**Data:** 2026-04-30  
**Status:** Pré-execução (Onda 7 — frente dedicada)  
**Pré-requisito Onda 6 Frente A revertida:** primeira tentativa quebrou hooks/edge sem auditoria prévia.

---

## 1. Estado do banco (snapshot 2026-04-30)

| Métrica | Valor |
|---|---:|
| KPIs ativos (`status='active'`, não-deletados) | 31 |
| Com `frequency` (legacy, NOT NULL) | 31 |
| Com `consolidation_frequency` populado | 31 |
| Com `update_frequency` populado | 31 |
| Marcados `frequency_migration_reviewed=true` | 16 |
| **Legacy não-migrados** (frequency sem split) | **0** |

**Conclusão DB:** split v3.0.0 100% concluído. Coluna `frequency` é hoje
**dado redundante** (espelho de `consolidation_frequency`). Pode ser dropada
após zero-leitura do código.

---

## 2. Consumidores de `kpi.frequency` no código

### 2.1 Frontend (8 pontos — escopo do drop)

| Arquivo | Linha | Uso | Tipo de migração |
|---|---:|---|---|
| `components/KpiCard.tsx` | 80 | Fallback `update_frequency ?? legacyFrequencyToValue(kpi.frequency)` | **Remover fallback** — `update_frequency` é NOT NULL. |
| `components/KpiDetailContent.tsx` | 271 | `FREQUENCY_LABELS[kpi.frequency]` | **Substituir por** `update_frequency` + label v3. |
| `components/KpiHistoryDialog.tsx` | 271-273 | `kpi.frequency && FREQUENCY_LABELS[...]` | **Substituir por** `update_frequency`. |
| `components/KpiActionsMenu.tsx` | 139 | `frequency: (kpi.frequency ?? 'monthly')` ao montar form | **Trocar por** `consolidation_frequency`/`update_frequency`. |
| `components/edit-kpi/useEditKpiForm.ts` | 44 | `legacyFrequencyToValue(kpi.frequency) ?? 'monthly'` | **Remover legacy mapping** — usar campos novos diretamente. |
| `pages/KpiEvolutionPage.tsx` | 324 | `frequency: kpi.frequency as any` (cast) | **Trocar por** campo correto + remover `any`. |
| `hooks/useKpisForWizard.ts` | 132, 139 | `kpi.frequency` em payload + `needsUpdate(kpi.frequency, ...)` | **Trocar `needsUpdate` para `update_frequency`** (semântica de gate de input). |
| `hooks/useKpisForWizardV2.ts` | 171, 174, 223 | Mesmo padrão de v1 | **Igual ao v1.** |

### 2.2 Edge functions (FORA DE ESCOPO)

`generate-ritual-occurrences` e `sync-ritual-calendar-from-cycles` usam
`cadence.frequency`/`template.frequency` — propriedade de **rituais**, não KPIs.
**Nenhuma alteração necessária.**

### 2.3 Utils preservados

- `src/modules/kpis/utils/frequency.ts` — contém `legacyFrequencyToValue`,
  `needsUpdate`, `FREQUENCY_LABELS`. Após migração, manter apenas
  helpers v3 (`consolidation`/`update`). Funções legacy ficam `@deprecated` por
  1 ciclo e são removidas em wave seguinte.

---

## 3. Plano faseado

### Fase 1 — Refactor frontend (sem DB) — **safe, reversível**

1. Substituir todos os 8 pontos pela combinação correta:
   - **Display de cadência de input** → `update_frequency`
   - **Display de cadência de consolidação** → `consolidation_frequency`
   - **Form initial values** → ambos os campos (form já aceita).
2. Remover `legacyFrequencyToValue` dos call sites (manter export marcado
   `@deprecated` por 1 wave).
3. Atualizar testes (`useEditKpiForm.test`, `KpiCard.test` se existirem).
4. Validar visualmente: `KpiCard`, `KpiDetailContent`, `KpiHistoryDialog`,
   `KpiActionsMenu`, `KpiEvolutionPage`, wizards (Pre Weekly, Pre QBR).
5. **Ship.** Coluna `frequency` continua no DB como espelho.

### Fase 2 — Auditoria pós-deploy (1 semana)

1. Rodar `scripts/audit-kpi-frequency-migration.ts` semanalmente.
2. Monitorar Sentry/console por `Cannot read property 'frequency' of...`.
3. Confirmar zero leituras de `kpi.frequency` em produção via grep CI guard
   (adicionar regra ESLint custom ou check no `compliance-all.yml`).

### Fase 3 — Drop DB

```sql
-- Tornar coluna nullable primeiro (rollback-friendly)
ALTER TABLE kpi_metrics ALTER COLUMN frequency DROP NOT NULL;

-- Esperar 1 ciclo (1 wave). Se zero erros:
ALTER TABLE kpi_metrics DROP COLUMN frequency CASCADE;
DROP TYPE IF EXISTS kpi_frequency;  -- se enum não usado em outro lugar
```

**Pré-requisito:** confirmar que `kpi_frequency` enum não é usado por outras
tabelas/funções (`pg_depend` query).

### Fase 4 — Cleanup helpers

- Remover `legacyFrequencyToValue` e `FREQUENCY_LABELS` (legacy enum).
- Remover `frequency` do tipo `Kpi` (auto-regenerado de `types.ts`).

---

## 4. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| `useKpisForWizard*.ts` retorna `kpi.frequency` em payload consumido por wizards | Substituir por `update_frequency` mantendo backward-compat de wizard payload por 1 wave. |
| `needsUpdate(kpi.frequency, ...)` define gate de input em ritos | **Trocar por `update_frequency`** (é exatamente a semântica correta — quando o KPI espera novo dado). |
| `KpiActionsMenu` envia `frequency` para form de edição | Form já aceita os 3 campos; basta remover o legacy. |
| Tipos auto-gerados (`types.ts`) ainda têm `frequency` enquanto coluna existe | OK — não-quebra. Só some após Fase 3. |

---

## 5. Critérios de pronto (Definition of Done)

- [ ] Fase 1 mergeada, zero `kpi.frequency` no codebase frontend (exceto utils legacy)
- [ ] CI guard adicionado (`grep -n "kpi\\.frequency" src/ → fail`)
- [ ] 1 semana de produção sem regressões
- [ ] Migration de drop NOT NULL aplicada
- [ ] Migration de DROP COLUMN aplicada
- [ ] Helpers legacy removidos
- [ ] `mem://features/kpis/kpis-master-standard` atualizada para v3.1.0

---

## 6. Não-fazer (lições da Frente A revertida)

- ❌ Não dropar coluna sem zerar leituras no código primeiro
- ❌ Não fazer Fase 1 + Fase 3 no mesmo PR
- ❌ Não tocar em edge functions de **ritual cadence** (escopo diferente)
- ❌ Não remover `kpi_frequency` enum sem auditar dependências
