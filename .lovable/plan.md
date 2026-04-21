

# Descontinuar ritual "Check-in de Gestores" (managers-checkin)

## Contexto e justificativa

- O rito `managers-checkin` foi substituído pelo MBR (Monthly Business Review) nos dashboards estratégicos (memória canônica `management-rituals-standard-v2`).
- Auditoria no banco confirma: **0 sessões concluídas** (`okr_wizard_sessions`), **324 ocorrências futuras** planejadas no calendário (`ritual_occurrences`) e **1 cadência ativa** (`ritual_cadences`). Não há risco de perda de histórico real.
- Remoção deve seguir o TCR: não apagar migrations históricas, preservar `WizardPersona` para compatibilidade com registros antigos de auditoria, e remover apenas entry-points e geração de novas ocorrências.

## Estratégia (soft-remove, não destrutivo)

Adotamos **remoção cirúrgica das entradas do usuário** (cards, rotas, listagens, calendário) mantendo tipos e renderer de relatório para back-compat — padrão seguido anteriormente para o "modal removido" citado no próprio `index.ts` do módulo.

## Mudanças no Frontend

1. **`src/pages/Index.tsx`** — Remover import de `ManagersCheckinWizardCard` e seu uso no bloco `isExecutive`. O grid `md:grid-cols-2` passa a conter apenas `CLevelCheckinWizardCard` (ajustar para `grid-cols-1`).
2. **`src/routes/rituals.routes.tsx`** — Remover a rota ativa `/rituals/managers-checkin` e o lazy import de `ManagersCheckinPage`. Substituir o redirect legado `/okrs/managers-checkin` por redirect para `/rituals` (hub), preservando links antigos sem 404.
3. **`src/modules/okrs/constants/ritualWizardTypes.ts`** — Remover `'managers-checkin'` de `ALL_RITUAL_WIZARD_TYPES` para que o sync de calendário não regenere ocorrências.
4. **`src/modules/okrs/hooks/useRitualAvailability.ts`** — Remover entrada `'managers-checkin'` dos maps de label e de janelas, forçando `RitualUnavailableScreen` caso algum link remanescente seja acessado.
5. **`src/modules/okrs/pages/RitualHistoryPage.tsx`** — Remover `managers-checkin` dos filtros do seletor de tipo de rito.
6. **`e2e/fixtures/test-data.ts`, `e2e/okrs.spec.ts`, `e2e/navigation.spec.ts`** — Remover a rota dos arrays de smoke-tests.
7. **Arquivos mantidos (back-compat)**:
   - `src/modules/okrs/types/wizard.ts` — mantém `'managers-checkin'` em `WizardPersona` para tipagem de registros históricos.
   - `src/modules/okrs/hooks/useRitualHistory.ts` — mantém label `'Check-in de Gestores'` para renderizar eventuais addendums antigos.
   - `src/modules/okrs/components/ritual-report/SnapshotReportView.tsx` + `renderers/ManagersCheckinReport.tsx` — mantidos para visualização read-only do histórico.
   - `src/modules/vic/types/ask-to-vic.ts`, `useWizardAI.ts`, `useAskToVic.ts` — mantidos (consumidos apenas se uma sessão ativa ocorresse).

## Mudanças no Backend

8. **`supabase/functions/sync-ritual-calendar-from-cycles/index.ts`** — Remover `'managers-checkin'` de `ALL_WIZARD_TYPES` e sua `CadenceTemplate`. Redeploy automático.
9. **Migration de limpeza** (`supabase/migrations/<timestamp>_deprecate_managers_checkin.sql`):
   ```sql
   -- Remove cadência ativa (evita regeneração)
   DELETE FROM public.ritual_cadences WHERE wizard_type = 'managers-checkin';
   -- Cancela ocorrências futuras (soft-delete via status)
   UPDATE public.ritual_occurrences
     SET status = 'cancelled', updated_at = now()
     WHERE wizard_type = 'managers-checkin'
       AND status = 'scheduled';
   ```
   Não altera enums nem drops de colunas — preserva FKs e sessões históricas (caso surjam em outras BUs).

## Arquivos que serão fisicamente removidos

- `src/modules/okrs/pages/ManagersCheckinPage.tsx`
- `src/modules/okrs/components/wizards/managers-checkin/ManagersCheckinWizardCard.tsx`
- `src/modules/okrs/components/wizards/managers-checkin/ManagersPanoramaStep.tsx`
- `src/modules/okrs/components/wizards/managers-checkin/ManagersCrossIssuesStep.tsx`
- `src/modules/okrs/components/wizards/managers-checkin/ManagersAdjustmentsStep.tsx`
- `src/modules/okrs/components/wizards/managers-checkin/ManagersSystemicKpisStep.tsx`
- `src/modules/okrs/components/wizards/managers-checkin/__tests__/ManagersCheckinWizardCard.test.tsx`
- `src/modules/okrs/components/wizards/managers-checkin/index.ts`
- Ajustar `src/modules/okrs/components/wizards/index.ts` e `src/modules/okrs/hooks/__tests__/useGenericWizardDraft.test.ts` para não referenciarem o path removido.

## Atualização de memória canônica

10. Atualizar `mem://features/okrs/management-rituals-standard-v2` reforçando que o entry-point e calendário do `managers-checkin` foram descontinuados, mantendo o MBR como substituto oficial. Atualizar `mem://index.md` se a descrição precisar refletir o novo estado.

## Checklist de conformidade TCR

- [x] Sem `select('*')` introduzido.
- [x] Query keys inalteradas.
- [x] BU-scoping respeitado (migration usa RLS nativa das tabelas).
- [x] Sem hardcode de roles — guards permanecem via `CLevelRitualRoute`/`BuAdminRoute` nos demais rituais.
- [x] Histórico preservado (renderer + tipo mantidos; sessões antigas seguem visíveis).
- [x] Redirect legado preservado (`/okrs/managers-checkin` → `/rituals`).

