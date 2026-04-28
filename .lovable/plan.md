# Reagendamento em massa de ritos no Calendário

## Pré-checklist (concluído)
- TCR + DATA_MODEL_REGISTRY: `ritual_occurrences` é BU-scoped (v3.21.0).
- RLS verificado: `UPDATE` exige `is_bu_admin OR is_platform_admin` — alinhado com a rota `/settings/rituals`.
- IDENTITY_CONVENTION: mutação não requer `realProfileId` (RLS usa `auth.uid()`).
- Memórias `comprehensive-calendar-architecture-v2` e `mbr-multi-date-governance` confirmam: ritos globais materializam 1 ocorrência por time, e mover ocorrências individuais não conflita com a cadência.
- Standards: BU isolation, query keys via prefix helpers, sem `select('*')`.

## Problema
Ritos globais (`mbr`, `mbr-pre`, `qbr-pre`, `qbr`, `qbr-clevel`) geram **uma `ritual_occurrence` por time ativo**. Hoje só existe reagendamento individual via `OccurrenceSheet`, inviabilizando "mover o `mbr-pre` de 05/ago de todos os times".

## Objetivo
Permitir que um Admin reagende, em uma única ação, **todas as ocorrências do mesmo rito que caem na mesma data**, para todos os times da BU ativa. Status elegíveis: `scheduled` e `missed`.

## Mudanças

### 1. Hook — `useRescheduleOccurrencesBulk`
Em `src/modules/okrs/hooks/useRitualOccurrences.ts`.

Entrada: `{ wizardType: string; plannedDate: string; newDate: string }`.

Comportamento:
- Cliente: `useBuScopedSupabase`.
- 1º SELECT (`id, planned_date, rescheduled_from`) com filtros `bu_id`, `wizard_type`, `planned_date`, `status IN ('scheduled','missed')`.
- Para cada linha, `UPDATE` preservando `rescheduled_from` (mantém valor original se já existir; senão usa `planned_date`), define `rescheduled_to = newDate`, `planned_date = newDate`, `status = 'rescheduled'`.
- Retorna `{ count }`.
- Invalida `queryKeys.okrs.ritualOccurrencesPrefix(buId)` e `ritualAdherencePrefix(buId)`.
- Toast: "N ocorrências reagendadas".

Justificativa do loop client-side: N ≤ nº de times ativos (~10-50). RLS já protege; não precisa de RPC/edge.

### 2. UI — `BulkRescheduleDialog` (novo)
`src/modules/okrs/pages/ritual-calendar/BulkRescheduleDialog.tsx`.

Props: `{ open, onOpenChange, initialWizardType?, initialDate? }`.

- Vindo do Sheet: campos pré-preenchidos e bloqueados.
- Vindo do header: `Select` de rito (lista `BULK_RESCHEDULABLE_WIZARD_TYPES`) + `Calendar` Popover de data origem.
- Preview: query secundária retorna contagem + lista de times num `ScrollArea` ("X ocorrências em Y times serão reagendadas").
- `Calendar` Popover de nova data.
- Aviso: "Apenas ocorrências com status 'agendada' ou 'perdida' serão afetadas."
- Confirmar desabilitado sem nova data ou se preview = 0.

### 3. Constantes
Em `src/modules/okrs/pages/ritual-calendar/constants.ts`:
```ts
export const BULK_RESCHEDULABLE_WIZARD_TYPES: WizardPersona[] = [
  'mbr', 'mbr-pre', 'qbr-pre', 'qbr', 'qbr-clevel',
];
```

### 4. Gatilhos
**a) `OccurrenceSheet.tsx`**: botão "Reagendar todos os times deste rito" quando `wizardType ∈ BULK_RESCHEDULABLE_WIZARD_TYPES` e `status ∈ ['scheduled','missed']`.

**b) `CalendarTab.tsx`**: botão "Reagendar em massa" no header (junto ao `RitualCalendarViewToggle`).

### 5. Query keys
Adicionar em `src/lib/queryKeys/okrs.ts`:
```ts
ritualOccurrencesEligibleForBulk: (buId, wizardType, plannedDate) =>
  [...prefix, 'eligible-bulk', buId, wizardType, plannedDate] as const,
```

### 6. Testes
- `useRitualOccurrences.test.ts` (estender): filtro correto, preservação de `rescheduled_from`, contagem retornada, ignora `completed_*` e `rescheduled`.
- `BulkRescheduleDialog.test.tsx`: render pré-preenchido vs livre, desabilitado sem nova data, payload correto.

### 7. Fora de escopo
- Sem alteração em `sync-ritual-calendar-from-cycles`, `ritual_cadences`, RLS, ou `useRescheduleOccurrence` individual.
- Sem alteração em `pickCompositeWindow` ou `firstTuesdayOfMonth` — apenas datas de ocorrências individuais são movidas.

## Arquivos afetados
- `src/modules/okrs/hooks/useRitualOccurrences.ts`
- `src/lib/queryKeys/okrs.ts`
- `src/modules/okrs/pages/ritual-calendar/constants.ts`
- `src/modules/okrs/pages/ritual-calendar/BulkRescheduleDialog.tsx` (novo)
- `src/modules/okrs/pages/ritual-calendar/OccurrenceSheet.tsx`
- `src/modules/okrs/pages/ritual-calendar/CalendarTab.tsx`
- Testes correspondentes

## Validação manual
1. `/settings/rituals?tab=calendar` → abrir uma ocorrência `mbr-pre` de agosto → "Reagendar todos os times deste rito" → escolher nova data → confirmar.
2. Conferir no calendário e via SQL: `mbr-pre` saiu da data antiga, apareceu na nova com `status='rescheduled'`, `rescheduled_to=novaData`, `rescheduled_from` preservado.
3. Repetir via botão do header com seleção manual (rito + data origem + nova data).
4. Data origem sem ocorrências elegíveis → preview 0 e Confirmar desabilitado.
