## Pré-checklist (concluído)
- **TCR + DATA_MODEL_REGISTRY**: `ritual_occurrences` BU-scoped (v3.21.0), confirmado.
- **RLS verificada via DB**: `bu_admin_occurrences_all` permite `UPDATE` para admins da BU — coerente com `/settings/rituals`.
- **IDENTITY_CONVENTION**: política usa `is_bu_admin(auth.uid(), bu_id)`; não exige `realProfileId` para a mutação (já validado no plano original).
- **Memórias**: `comprehensive-calendar-architecture-v2`, `mbr-multi-date-governance`, `ritual-reopen-mechanism` revisadas — apenas `scheduled`/`missed` são mutáveis.
- **Standards**: `BULK_RESCHEDULABLE_WIZARD_TYPES` já tipado como `WizardPersona[]` em `constants.ts`. Query keys via `okrsKeys` prefix. `useBuScopedSupabase` mandatório.
- **Hook + Dialog + botão do header**: já implementados corretamente. **Esta iteração é puramente UI/UX no `OccurrenceSheet`.**

## Problema observado (print do usuário)
O `OccurrenceSheet` para um `mbr-pre` agendado mostra apenas:
- Status "Agendado", time "BizOps", "Data prevista 05/05/2026"
- Campo "Nova data" + botão "Confirmar" cinza (reagendamento individual já expandido)

**O botão "Reagendar todos os times deste rito" não está visível**, embora o código em `OccurrenceSheet.tsx:165-174` o renderize quando `isBulkEligible === true` (que é o caso para `mbr-pre` + `scheduled`).

Causa provável: o botão **está renderizado**, mas fica abaixo da dobra do `SheetContent` porque:
1. O formulário individual (`Reagendar`) aparece **antes** no JSX (linhas 120-163), com Calendar Popover + botão Confirmar grande, ocupando muito espaço vertical.
2. O `SheetContent` não tem scroll explícito, então o conteúdo overflowa silenciosamente.
3. Hierarquia visual invertida: ação **menos comum** (reagendar 1 time de um rito global) está em destaque acima da ação **mais comum** (reagendar todos os times daquela data).

## Objetivo
Tornar o reagendamento em massa **descobrível e prioritário** quando a ocorrência for de um rito global (`mbr`, `mbr-pre`, `qbr-*`), sem alterar lógica de negócio.

## Mudanças (apenas em `src/modules/okrs/pages/ritual-calendar/OccurrenceSheet.tsx`)

### 1. Reordenar ações abaixo do `Separator`
Quando `isBulkEligible === true`:
- **1ª ação (destaque, `variant="default"`)**: "Reagendar todos os times deste rito" (atual bulk).
- **2ª ação (`variant="outline"`)**: "Reagendar apenas este time" (atual individual, label renomeado).

Quando `isBulkEligible === false` (ex.: `collaborator`, `team-checkin`):
- Apenas a ação individual aparece, com label original "Reagendar".

### 2. Hint contextual
Acima dos botões, quando `isBulkEligible`, exibir texto sutil:
> "Este rito ocorre em todos os times nesta data."

### 3. Garantir scroll do `SheetContent`
Envolver o conteúdo abaixo do `SheetHeader` em um wrapper com `max-h-[calc(100vh-6rem)] overflow-y-auto pr-1` para garantir que o formulário individual expandido nunca esconda o botão de bulk.

### 4. Status `missed` também elegível
Hoje o bloco de reagendamento individual (linha 120) só renderiza para `status === 'scheduled'`. Como `isBulkEligible` aceita `scheduled` **ou** `missed`, ajustar a condição do bloco individual para `(occurrence.status === 'scheduled' || occurrence.status === 'missed')` — mantém consistência entre as duas ações.

## Snippet de referência
```tsx
{(occurrence.status === 'scheduled' || occurrence.status === 'missed') && (
  <div className="space-y-3">
    {isBulkEligible && (
      <p className="text-xs text-muted-foreground">
        Este rito ocorre em todos os times nesta data.
      </p>
    )}

    {isBulkEligible && (
      <Button className="w-full" onClick={() => setShowBulk(true)}>
        <CalendarRange className="h-4 w-4 mr-2" />
        Reagendar todos os times deste rito
      </Button>
    )}

    {!showReschedule ? (
      <Button variant="outline" className="w-full" onClick={() => setShowReschedule(true)}>
        <RefreshCw className="h-4 w-4 mr-2" />
        {isBulkEligible ? 'Reagendar apenas este time' : 'Reagendar'}
      </Button>
    ) : (
      /* formulário individual existente — Calendar Popover + Confirmar */
    )}
  </div>
)}
```

## Fora de escopo
- Hooks (`useRescheduleOccurrence`, `useRescheduleOccurrencesBulk`): inalterados.
- `BulkRescheduleDialog`: inalterado.
- Botão "Reagendar em massa" no header do `CalendarTab`: inalterado.
- RLS, query keys, edge functions, constantes: sem mudanças.

## Validação manual
1. `/settings/rituals?tab=calendar` → clicar em ocorrência `Pré-MBR` (status Agendado).
2. Conferir que o **primeiro** botão visível abaixo dos metadados é "Reagendar todos os times deste rito" (variant default, destaque).
3. Conferir que "Reagendar apenas este time" aparece logo abaixo, em outline.
4. Clicar em ocorrência de `collaborator` → conferir que apenas "Reagendar" aparece.
5. Clicar em ocorrência `mbr-pre` com status "Não executado" (`missed`) → ambas as ações devem aparecer.
6. Expandir o reagendamento individual → o botão de bulk continua visível acima; se necessário, scroll funciona dentro do Sheet.

## Arquivos afetados
- `src/modules/okrs/pages/ritual-calendar/OccurrenceSheet.tsx` (única alteração)
