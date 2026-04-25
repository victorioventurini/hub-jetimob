## Problema

A URL `/okrs/objectives/{objectiveId}/krs/create?contributor_team_id={teamId}` não permite criar KRs de contribuição quando já existe um draft do **time owner** (ou de outro time contribuidor) para o mesmo `objectiveId`. A causa-raiz é o `localStorage` key do `useKrWizardDraft` ser composto **apenas** por `objectiveId`, ignorando o `teamId` efetivo. Drafts de owner e de contribuidor se sobrescrevem, gerando estado inconsistente que bloqueia o submit.

## Pré-checklist Canônico ✅
- TCR consultado (wizard hierarchy + KR linked entities)
- `mem://features/okrs/shared-okr-contributor-view-standard` revisado (URL contract com `contributor_team_id`)
- `mem://features/okrs/creation-wizard-draft-hydration` revisado (política de hidratação)
- `mem://standards/url-state-preservation` revisado
- RLS `okr_team_key_results` (ownership) confirmada — não é bloqueio de permissão; é bug de estado client-side

## Plano de Ação

### 1. `src/modules/okrs/hooks/useKrWizardDraft.ts`
- Bump `DRAFT_VERSION` de `2` → `3` para invalidar drafts legados
- Reescrever `getStorageKey(objectiveId, teamId)` → `okr-draft.team-kr-creation.${objectiveId}.${teamId}`
- Adicionar `teamId` como dependência do `useEffect` de carregamento e do `storageKey`
- Validar no load que `parsed.teamId === teamId` (além de `objectiveId`); se não bater, descartar silenciosamente
- Manter migration silenciosa: legacy keys sem `teamId` são ignoradas (já cairão fora pelo version bump)

### 2. `src/modules/okrs/pages/TeamKrCreationPage.tsx`
- Garantir que `effectiveTeamId` (resolvido a partir de `contributor_team_id` da URL ou ownership do objetivo) é passado ao `useKrWizardDraft` **antes** da inicialização
- Se draft existente tiver `teamId` divergente do `effectiveTeamId`, chamar `clearDraft()` + `initializeDraft()` automaticamente (auto-healing)
- Log telemetria: `[wizardDraft] auto-clear: teamId mismatch`

### 3. Memória SSOT
- Criar `.lovable/memory/standards/wizard-draft-isolation.md`:
  - Regra: **toda chave de draft de wizard DEVE incluir o escopo completo** (todos IDs que afetam ownership/visibilidade — `objectiveId`, `teamId`, `cycleId` quando aplicável)
  - Aplicar a `useKrWizardDraft`, `useGenericWizardDraft` e futuros hooks
- Atualizar `.lovable/memory/index.md` Core rules com one-liner

## Arquivos
- ✏️ `src/modules/okrs/hooks/useKrWizardDraft.ts`
- ✏️ `src/modules/okrs/pages/TeamKrCreationPage.tsx`
- ✏️ `.lovable/memory/index.md`
- ➕ `.lovable/memory/standards/wizard-draft-isolation.md`

## Validação
1. Acessar URL com `contributor_team_id` → wizard inicializa limpo, sem bloqueio
2. Owner e contribuidor podem manter drafts paralelos para mesmo objetivo
3. Reabrir mesma URL preserva o draft correto do escopo
