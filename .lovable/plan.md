## Objetivo

Permitir que admins/líderes verifiquem a usabilidade do ambiente do respondente (`/q/:token`) de cada prova **sem precisar consumir um convite real** nem expor um link público.

## Pré-checklist

- TCR / DATA_MODEL_REGISTRY / PERMISSIONS_AND_RBAC_MODEL: módulo Assessments ainda **não está catalogado**; o código vigente é a SSOT.
- IDENTITY_CONVENTION: fluxo é leitura via RPC `SECURITY DEFINER`; `auth.uid()` é suficiente, sem `useIdentity`/`realProfileId`.
- BU isolation: rota nova entra em `assessments.routes.tsx` sob `AssessmentsRoute` (Protected + BuRequired + ModuleRoute).
- Reutilização: `PublicAssessmentRunner` será refatorado para extrair o `RunnerFlow` em um view compartilhado — sem duplicar UI.
- Lazy: rota nova usa `lazyWithRetry`.

## Decisões de design

- **Não duplicar UI.** Extrair o `RunnerFlow` interno do `PublicAssessmentRunner` para um componente centralizado:
  - `src/modules/assessments/components/AssessmentRunnerView.tsx` — recebe `{ lookup, runnerApi, isPreview }` e renderiza a experiência inteira (identificação → instruções → questões → finalização).
  - `runnerApi` é uma interface com `startRun`, `upsertAnswer`, `submitRun`, `telemetry` — implementação real em `src/modules/assessments/runner/realRunnerApi.ts` (RPCs atuais), implementação preview em `previewRunnerApi.ts` (no-ops + estado em memória).
- Em modo preview o view mostra um `Badge` semântico ("PREVIEW — respostas não são salvas") fixo no topo, e a tela final exibe "Submissão simulada" no lugar de "Enviada".
- **Backend (1 migration):** RPC `rpc_assessment_preview_lookup(p_assessment_id uuid)` `SECURITY DEFINER`, `search_path = public`:
  - valida `bu_id` da prova = `current_bu_id()` (RAISE 'forbidden' caso contrário);
  - exige `has_assessment_permission(current_bu_id(), auth.uid(), 'assessments.assessment.read:bu')` (confirmar nome exato no momento da escrita; fallback `update:bu` se a key específica não existir);
  - retorna o **mesmo shape** de `rpc_assessment_invite_lookup`, com `invite = { id: 'preview', status: 'preview', invitee_name: 'Preview', invitee_cpf_masked: '***.***.***-**', expires_at: null }`;
  - `REVOKE ALL FROM PUBLIC, anon` + `GRANT EXECUTE TO authenticated`.
- **Rota nova (BU-scoped):** `/assessments/provas/:id/preview` em `src/routes/assessments.routes.tsx`, dentro de `AssessmentsRoute`, lazy via `lazyWithRetry`. Renderiza um wrapper full-screen (sem `HubLayout`) para reproduzir fielmente o ambiente público; um `Button` "Voltar para a prova" no canto.
- **Botão de entrada centralizado:** `src/modules/assessments/components/PreviewEnvironmentButton.tsx` (`<Button asChild><Link target="_blank" to={...}><Eye/>Pré-visualizar ambiente</Link></Button>`). Reutilizado em:
  1. `AssessmentDetailPage` — nas `actions` do `PageHeader`, ao lado de "Editar".
  2. `AssessmentsPage` — ação secundária por linha/card (ícone-only com tooltip).

## Mudanças

### Backend (1 migration)

- `CREATE FUNCTION public.rpc_assessment_preview_lookup(p_assessment_id uuid) RETURNS jsonb` — reusa exatamente os mesmos `JOIN`s de `rpc_assessment_invite_lookup`.

### Frontend

- `src/modules/assessments/components/AssessmentRunnerView.tsx` (novo) — recebe `lookup`, `runnerApi`, `isPreview`.
- `src/modules/assessments/runner/realRunnerApi.ts` (novo) — wrappers das RPCs atuais.
- `src/modules/assessments/runner/previewRunnerApi.ts` (novo) — no-ops.
- `src/pages/PublicAssessmentRunner.tsx` — vira um shell fino: faz `rpc_assessment_invite_lookup` e renderiza `<AssessmentRunnerView lookup={lookup} runnerApi={realRunnerApi(...)} />`.
- `src/modules/assessments/pages/AssessmentPreviewPage.tsx` (novo) — chama `rpc_assessment_preview_lookup` (via `useBuScopedSupabase`) e renderiza `<AssessmentRunnerView lookup={lookup} runnerApi={previewRunnerApi()} isPreview />`.
- `src/routes/assessments.routes.tsx` — registra a rota nova com `lazyWithRetry`.
- `src/modules/assessments/components/PreviewEnvironmentButton.tsx` (novo) — botão centralizado.
- `src/modules/assessments/pages/AssessmentDetailPage.tsx` — adiciona o botão nas `actions`.
- `src/modules/assessments/pages/AssessmentsPage.tsx` — adiciona o botão na linha/card.

## Fora de escopo

- Preview anônimo (sem login).
- Snapshots/print do ambiente.
- Editar a prova a partir do preview.

## Riscos

- Garantir que `previewRunnerApi` realmente bloqueia toda escrita (cobrir com no-op + log local).
- Confirmar a permission key exata (`assessments.assessment.read:bu` vs `update:bu`) lendo `permission_catalog` no momento da migration.
- Refator do `PublicAssessmentRunner` precisa preservar 100% do comportamento atual (timer, anti-fraude, `LockedTextarea`, telemetria).
