## All Hands — Rito mensal de comunicação da BU

Rito decisório/comunicacional da BU, conduzido na 1ª sexta-feira de cada mês, **reaproveitando integralmente** os componentes de step já existentes no MBR (não duplicar). Apenas BU admin + super_admin conduzem. 4 steps. Avaliação anônima pública (mesmo padrão MBR/QBR).

### Pré-checklist (cumprido)
- TCR + DEVELOPMENT_STANDARDS + DATA_MODEL_REGISTRY consultados.
- SSOTs revisados: `ritualLabels.ts`, `wizard-configs.ts`, `WizardPersona`, `MbrPage`, `mbr/constants.ts`, `comprehensive-calendar-architecture-v2`, `anonymous-evaluation-standard`, `cycles-and-rituals-master`.
- Confirmado: nenhum `all-hands` existente; só uma flag de checklist `communicateInAllHands` no MBR.

### Princípios de reuso (não duplicar)
- **Reaproveitar**: `FullPageWizardShell`, `MbrPanoramaCurationCard` (ou versão simplificada de sumário), `MbrKpiGateStep`, `MbrOrgOkrsStep`, framework de evaluation (`evaluationConfig.ts` + step anônimo), `RitualPreparationStatus`, `RitualAttendance`, `ReferenceMonthPicker`, hooks (`useGenericWizardDraft`, `useRitualAvailability`, `useMbrPreSubmissions`).
- **Criar mínimo**: 1 página + 1 step novo de "Sumário" (que apenas compõe blocos read-only do MBR mais recente do mês) + 1 hook `useLatestMbrForMonth` + entradas em SSOTs.
- **Não tocar**: MBR, MBR-Pre, edge functions de geração de ocorrências (apenas adicionar entrada de cadência).

### Steps
1. **Sumário** (`summary`) — read-only, hidratado do último MBR finalizado do mês de referência: panorama + decisões + checklist comunicacional. Se não há MBR fechado no mês, exibe `RitualUnavailableScreen` com CTA "Conduzir MBR primeiro".
2. **KPI Gate** (`kpi-gate`) — reusa `MbrKpiGateStep` em modo read-only (snapshot do MBR), sem permitir edição.
3. **OKRs Org** (`org-okrs`) — reusa `MbrOrgOkrsStep` em modo read-only.
4. **Avaliação** (`evaluation`) — step anônimo do framework canônico (`/p/r/:shortCode`), idêntico ao MBR/QBR-Meeting.

Sem step de "Encerramento" próprio: o submit final apenas marca `completed_at` e fecha avaliação.

### Permissão & rota
- `/rituals/all-hands` envolto por `<RitualRoute requiresBuAdmin>` (mesmo gate do MBR).
- Card no Hub Rituais aparece só para BU admin + super_admin.
- `requiresMbrFinalized` enforce na page (estado vazio com CTA se ausente).

### Cadência automática (CyclesTab)
- Adicionar upsert em `ritual_cadences` com: `wizard_type='all-hands'`, `cadence_type='monthly'`, `month_week_ordinal=1`, `day_of_week=5` (sexta), `team_id=NULL` (BU-wide).
- Reusar edge function `generate-ritual-occurrences` sem alteração (já trata cadências globais).

### Schema / SSOTs
- `WizardPersona` += `'all-hands'` em `types/wizard/core.ts`.
- `RITUAL_LABELS['all-hands'] = 'All Hands'`; `RITUAL_GREETING['all-hands']` cadence `monthly`.
- `WIZARD_CONFIGS['all-hands']` com 4 steps acima.
- `evaluationConfig.ts`: incluir `'all-hands'` na allowlist de avaliação anônima.
- `RITUAL_FINALIZATION_COPY['all-hands']` (1 frase).
- Sem novas tabelas. Sessão grava em `okr_wizard_sessions` com `wizard_type='all-hands'` (RLS já trata por BU).

### Estrutura de arquivos novos (mínima)
```text
src/modules/okrs/pages/AllHandsPage.tsx
src/modules/okrs/pages/all-hands/constants.ts
src/modules/okrs/pages/all-hands/useLatestMbrForMonth.ts
src/modules/okrs/components/wizards/all-hands/
  AllHandsSummaryStep.tsx           (compõe MbrPanoramaCurationCard read-only)
  AllHandsWizardCard.tsx            (card de entrada — variant do MbrWizardCard)
  index.ts
src/modules/okrs/types/wizard/all-hands.ts   (AllHandsDraftData mínimo)
```
Rota em `src/routes/rituals.routes.tsx` com `lazyWithRetry`.

### Out of scope
- Alterações no MBR.
- Novas RLS / tabelas / colunas (cabe inteiro nas existentes `okr_wizard_sessions` + `ritual_evaluation_responses` + `ritual_cadences`).
- Edge functions novas.
- Notificações automáticas (cabe num PR futuro).

### Memória a criar pós-implementação
`mem://features/rituals/all-hands-standard` — escopo, reuso e gate de MBR prévio.