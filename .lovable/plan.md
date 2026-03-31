

# Plano Revisado: Calendarização 2026 — Dias Úteis + Modelo de Consolidação + Unificação

## Auditoria TCR/Canonical

| Doc | Status |
|-----|--------|
| TCR v3.21.0 | ✅ Schema `cycles`: 14 colunas, sem `review_date_first_month` |
| DEVELOPMENT_STANDARDS v1.27.0 | ✅ `useOptionalBuClient()` para CyclesTab, campos explícitos no select |
| BU_SCOPED_SUPABASE_RULES | ✅ CyclesTab opera PRE-BU com `useOptionalBuClient` |
| PERMISSIONS_AND_RBAC_MODEL | ✅ `okrs.settings.manage:bu` para geração |
| DB real | ✅ Coluna `review_date_first_month` precisa ser criada |
| Edge Function `generate-ritual-occurrences` | ✅ Suporta `monthly` + `quarterly` com `day_of_month` e `month_week_ordinal`/`day_of_week` |

---

## Correção Principal: Dias Úteis (segunda a sexta)

O plano anterior usava **dias corridos** para janelas (ex: `review_date - 5d`). O correto é **5 dias úteis**. Isso impacta:

1. **`generateCycles.ts`** — helper `addBusinessDays(date, n)` (pular sábados e domingos)
2. **`useRitualAvailability.ts`** — janelas de abertura/fechamento usam dias úteis
3. **Datas de reunião** — a regra "1ª terça-feira" já garante dia útil, mas janelas de preparação precisam contar apenas seg–sex

### Helper `addBusinessDays`

```typescript
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remaining = Math.abs(days);
  const direction = days >= 0 ? 1 : -1;
  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return result;
}
```

Será criado em `generateCycles.ts` e importado em `useRitualAvailability.ts`.

---

## Modelo de Reuniões: 1ª Terça-Feira do Mês Seguinte

Calendário 2026 (inalterado — a 1ª terça já é dia útil por definição):

| Ciclo | MBR₁ (1ª Ter M2) | MBR₂ (1ª Ter M3) | QBR-pre (16 ou 7 M3) | QBR (1ª Ter M4) |
|-------|-------------------|-------------------|----------------------|-----------------|
| Q1 | 03/fev | 03/mar | 16/mar | 07/abr |
| Q2 | 05/mai | 02/jun | 16/jun | 07/jul |
| Q3 | 04/ago | 01/set | 16/set | 06/out |
| Q4 | 03/nov | 01/dez | 07/dez | 05/jan/27 |

---

## Janelas com Dias Úteis (Revisão)

| Rito | Abre | Fecha |
|------|------|-------|
| `mbr-pre-first` | `review_date_first_month - 5 dias úteis` | `review_date_first_month - 1 dia útil` |
| `mbr-first` | `review_date_first_month` | `review_date_first_month + 2 dias úteis` |
| `mbr-pre` | `review_date - 5 dias úteis` | `review_date - 1 dia útil` |
| `mbr` | `review_date` | `review_date + 2 dias úteis` |
| `qbr-pre` | `planning_date` | `retro_date - 1 dia útil` |
| `qbr-pre-clevel` | `planning_date + 5 dias úteis` | `retro_date - 1 dia útil` |
| `qbr-meeting` | `retro_date` | `retro_date + 2 dias úteis` |
| `qbr-post` | `retro_date` | `retro_date + 5 dias úteis` |
| Check-ins | `start_date` | `end_date` |

**QBR block**: MBR/MBR-pre bloqueados quando `today >= planning_date`.

---

## Implementação

### 1. Migration — `review_date_first_month`

```sql
ALTER TABLE public.cycles ADD COLUMN review_date_first_month date;
```

### 2. UPDATE dados 2026

4 registros trimestrais com as datas da tabela acima.

### 3. `generateCycles.ts`

- Adicionar `addBusinessDays(date, n)` e `firstTuesdayOfMonth(year, month)`
- Interface `GeneratedCycle` ganha `review_date_first_month: string`
- Fórmulas: `review_date_first_month = firstTuesday(M2)`, `review_date = firstTuesday(M3)`, `planning_date = 16 de M3` (Q4: 7), `retro_date = firstTuesday(M_seguinte_ao_quarter)`
- Exportar `addBusinessDays` para reuso

### 4. `useRitualAvailability.ts`

- Importar `addBusinessDays` de `generateCycles.ts`
- Novos `WINDOW_DEFS` para `mbr-pre-first` e `mbr-first`
- Todas as janelas usam `addBusinessDays` em vez de `addDays`
- QBR block ajustado para `planning_date`

### 5. `CycleRitualDates.tsx`

- Nova prop `review_date_first_month`
- Exibir `MBR₁: dd/mmm · MBR₂: dd/mmm · QBR-pre: dd/mmm · QBR: dd/mmm`
- Remover `ReplacedByQbrBadge`

### 6. Tipos e selects

- `Cycle` em `useCycleData.ts`: + `review_date_first_month`
- `CycleWithStatus` em `useActiveCycle.ts`: + `review_date_first_month` no select
- Interface local em `CyclesTab.tsx`: idem, passar como prop ao `CycleRitualDates`

### 7. Unificação Ciclos → Calendário Operacional

Na mutation de geração em `CyclesTab.tsx`, após inserir ciclos:

- Upsert `ritual_cadences` para MBR (monthly, `month_week_ordinal=1, day_of_week=2` = 1ª terça) e QBR-pre/QBR-meeting (quarterly)
- Invocar `generate-ritual-occurrences` para cada cadência criada
- Resultado: `/settings/rituals` populado automaticamente

### 8. Memórias

Atualizar 3 memory files para refletir dias úteis + 2 MBRs + unificação.

---

## Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| Tabela `cycles` | Migration — add `review_date_first_month` |
| 4 registros Q1–Q4 2026 | UPDATE |
| `generateCycles.ts` | Editar — `addBusinessDays`, `firstTuesdayOfMonth`, novas fórmulas |
| `useRitualAvailability.ts` | Editar — janelas em dias úteis |
| `CycleRitualDates.tsx` | Editar — exibir MBR₁ + MBR₂ |
| `useActiveCycle.ts` | Editar — select + tipo |
| `useCycleData.ts` | Editar — tipo Cycle |
| `CyclesTab.tsx` | Editar — tipo + upsert cadências |
| 3 memory files | Editar |

## O que NÃO muda

- Páginas de rituais, `RitualUnavailableScreen`, `CycleFormDialog`
- Edge function `generate-ritual-occurrences` (reutilizada)
- Máquina `qbr_status`

