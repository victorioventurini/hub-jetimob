

# Unificar MBR: remover `mbr-first`/`mbr-pre-first` e usar apenas `mbr`/`mbr-pre` com dupla janela

## Diagnóstico

- **Nenhuma página instancia `mbr-first`/`mbr-pre-first`**: `MbrPage` grava hardcoded `wizardType: 'mbr'` e `MbrPrePage` grava `'mbr-pre'`. Não há rota, card, nem componente dedicado.
- **Zero histórico**: `okr_wizard_sessions` tem 0 sessões `mbr-first`/`mbr-pre-first` (auditoria confirmada).
- **Bug latente**: o calendário agenda 72 ocorrências futuras `mbr-first` e 90 `mbr-pre-first` que **nenhum usuário consegue executar** — a única UI existente só grava com persona `mbr`/`mbr-pre`.
- **Ganho**: simplificar 4 personas → 2, mantendo **a cadência de dois MBRs por quarter** via janela dupla (M1 + M2) sobre as mesmas personas.

## Estratégia (sem prejuízo funcional)

Mantemos **exatamente a mesma cadência de governança** (MBR na 1ª terça de M2 e M3 do quarter, Pré-MBR nos 5du anteriores) — mudamos apenas a modelagem: em vez de 4 personas com janelas disjuntas, usamos 2 personas com **janela composta** que abre em qualquer um dos dois períodos do quarter.

## Mudanças no Frontend

1. **`src/modules/okrs/hooks/useRitualAvailability.ts`**
   - Remover entradas `'mbr-first'` e `'mbr-pre-first'` dos maps `RITUAL_LABELS` e `RITUAL_WINDOWS`.
   - Expandir `getWindow` de `'mbr'` e `'mbr-pre'` para retornar **união de janelas**: computa `window1` sobre `review_date_first_month` e `window2` sobre `review_date`, retorna a janela ativa (onde `today` está dentro) ou a **próxima futura** para exibir data de abertura correta em `RitualUnavailableScreen`.
   - Manter regra de bloqueio QBR (`today >= planning_date`) aplicada a `['mbr','mbr-pre']`.

2. **`src/modules/okrs/constants/ritualWizardTypes.ts`** — remover `'mbr-first'` e `'mbr-pre-first'` de `ALL_RITUAL_WIZARD_TYPES`.

3. **`src/modules/okrs/types/wizard.ts`**
   - **Manter** `'mbr-first'` e `'mbr-pre-first'` no tipo `WizardPersona` (back-compat de registros antigos — mesmo padrão do `managers-checkin`).
   - Remover entradas `'mbr-first'` e `'mbr-pre-first'` de `WIZARD_METADATA` e do mapa de agentes IA (linhas 853-855).

4. **`src/modules/okrs/hooks/useRitualHistory.ts`** — remover labels `'mbr-first'` e `'mbr-pre-first'` do seletor de filtros (tipos consolidados como "MBR" e "Pré-MBR"; histórico real é 0 e qualquer registro antigo cai no fallback).

5. **`src/modules/okrs/pages/ExecutiveQuarterReviewPage.tsx`** — remover `'mbr-first'` e `'mbr-pre-first'` do `.in('wizard_type', …)` (linha 306).

## Mudanças no Backend

6. **`supabase/functions/sync-ritual-calendar-from-cycles/index.ts`**
   - Remover `'mbr-first'` e `'mbr-pre-first'` de `ALL_WIZARD_TYPES` e seus `CadenceTemplate`.
   - Duplicar/ajustar as cadências `'mbr'` e `'mbr-pre'` para `frequency: 'monthly'` na **1ª terça-feira** (`month_week_ordinal=1, day_of_week=2`). O gerador de ocorrências (`generate-ritual-occurrences`) já materializa mês a mês — assim M1 e M2 do quarter recebem uma ocorrência cada sem duplicação.
   - Ajustar derivação de `start_date` para o `review_date_first_month` do primeiro quarter disponível.

7. **Migration de limpeza** `supabase/migrations/<ts>_unify_mbr_personas.sql`:
   ```sql
   -- Remove cadências órfãs
   DELETE FROM public.ritual_cadences 
   WHERE wizard_type IN ('mbr-first','mbr-pre-first');

   -- Cancela ocorrências futuras órfãs (soft via status)
   UPDATE public.ritual_occurrences
     SET status = 'cancelled', updated_at = now()
     WHERE wizard_type IN ('mbr-first','mbr-pre-first')
       AND status = 'scheduled';
   ```
   Não toca em enums nem em tipos de coluna. `WizardPersona` no TS preserva os valores para qualquer linha remanescente de outras BUs.

8. **Re-sync automático** — após a migration, o deploy do `sync-ritual-calendar-from-cycles` repopula `ritual_cadences` de MBR/MBR-pre com cadência mensal correta. `useSyncRitualCalendar` é invocado automaticamente em operações de ciclo (memória `comprehensive-calendar-architecture-v2`).

## Atualização de memória canônica

9. Atualizar `mem://features/okrs/ritual-access-governance-standard.md` e `mem://features/okrs/mbr-multi-date-governance.md`:
   - Remover referências a `mbr-first`/`mbr-pre-first`.
   - Documentar que `'mbr'` e `'mbr-pre'` possuem **janela composta** (união de MBR₁ sobre `review_date_first_month` e MBR₂ sobre `review_date`).
   - Cadência passa a ser `monthly` na 1ª terça-feira (implicitamente M1 e M2 do quarter, bloqueada em M3 pela regra QBR).

## Checklist TCR

- [x] Sem `select('*')`.
- [x] Query keys inalteradas.
- [x] BU-scoping preservado (migration opera em tabelas com RLS nativa).
- [x] Sem hardcode de roles — guards `requiresBuAdmin` do MBR permanecem.
- [x] Histórico preservado: `WizardPersona` mantém os valores antigos; renderers `MbrPanoramaStep` etc. continuam funcionando.
- [x] Sem prejuízo funcional: cadência de 2 MBRs por quarter é mantida via janela composta.
- [x] Bug latente (ocorrências órfãs não executáveis) é corrigido no processo.

