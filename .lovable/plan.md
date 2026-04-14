

## Plano: Thread de mensagens em decisões/registros + Step de pendências no check-in do colaborador

### Pré-checklist canônico ✅

| Doc | Status | Impacto |
|-----|--------|---------|
| TCR v3.23.0 | ✅ Analisado | Wizard deve usar `FullPageWizardShell`, drafts em `okr_wizard_sessions`, JSONB em `reflection_data` |
| DEVELOPMENT_STANDARDS v1.29.0 | ✅ Analisado | POST-BU com `useBuScopedSupabase()`, query keys via `queryKeys`, sem `select('*')` |
| IDENTITY_CONVENTION v2.2.0 | ✅ Analisado | `profileId` para domínio (nunca `auth.uid()`), `realProfileId` para mutations com impersonation |
| PERMISSIONS_AND_RBAC_MODEL v1.5.0 | ✅ Analisado | `isWildcard` para admin BU, `teams.leader_user_id` para líderes |
| WIZARD_DEVELOPMENT_GUIDE v1.0.0 | ✅ Analisado | Estrutura `src/modules/okrs/components/wizards/<name>/`, barrel exports |
| DATA_MODEL_REGISTRY | ✅ Via codebase | `okr_wizard_sessions` com colunas `decisions` e `reflection_data` (JSONB) |

### Decisão arquitetural

**JSONB** — as mensagens da thread ficam dentro do `TeamCheckinDecision` existente. Consistente com o padrão de persistência em `okr_wizard_sessions.decisions` / `reflection_data`. Zero migrações.

---

### Etapa 1 — Estender `TeamCheckinDecision` com thread

**Arquivo:** `src/modules/okrs/types/wizard.ts`

```typescript
// Novo sub-tipo
export interface DecisionThreadMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

// Adicionar ao TeamCheckinDecision:
thread?: DecisionThreadMessage[];
```

O campo `resolutionNote` permanece como registro da resolução final. Backward compatible.

### Etapa 2 — Extrair `DecisionFollowUpRow` como componente compartilhado

**De:** inline em `RitualHistoryPage.tsx` (linhas 548-732)
**Para:** `src/modules/okrs/components/wizards/shared/DecisionFollowUpRow.tsx`

O componente recebe props genéricas:
- `decision`, `sessionId`, `onUpdate` (ou usa `useUpdateDecisionFollowUp` internamente)
- Seção de thread: lista de `DecisionThreadMessage` usando `MessageBubble` de `src/components/messaging`
- Input para nova mensagem
- Modal de resolução (obrigatório ao marcar como done)
- Permissão via `useCanResolveDecision`

**Export via:** `src/modules/okrs/components/wizards/shared/index.ts`

### Etapa 3 — Hook `useDecisionThread`

**Arquivo:** `src/modules/okrs/hooks/useDecisionThread.ts`

- `addMessage(sessionId, decisionId, content)` → append ao array `thread` no JSONB
- Reutiliza o padrão de `useUpdateDecisionFollowUp`: fetch session → merge thread → update
- Query key via `queryKeys` (reutiliza `ritualHistoryListPrefix` para invalidação)
- Usa `useBuScopedSupabase()` (POST-BU)
- Identity: `profileId` do `useIdentity()` como `authorId`

**Export via:** `src/modules/okrs/hooks/index.ts`

### Etapa 4 — Atualizar `RitualHistoryPage`

**Arquivo:** `src/modules/okrs/pages/RitualHistoryPage.tsx`

- Remover `DecisionFollowUpRow` inline (linhas 548-732)
- Importar `DecisionFollowUpRow` do compartilhado
- Zero mudança funcional

### Etapa 5 — Hook `useMyPendingDecisions`

**Arquivo:** `src/modules/okrs/hooks/useMyPendingDecisions.ts`

- Query em `okr_wizard_sessions` com `status = 'completed'` e `decisions` não vazio
- Filtra client-side: `decision.owner?.id === effectiveUserId` e `followUpStatus !== 'done'`
- Retorna lista com `sessionId` para cada decisão (necessário para a mutação)
- Usa `useBuScopedSupabase()`, query key centralizada

### Etapa 6 — Step `CollaboratorDecisionsStep`

**Arquivo:** `src/modules/okrs/components/wizards/collaborator/CollaboratorDecisionsStep.tsx`

- Usa `useMyPendingDecisions` para buscar pendências
- Renderiza cada item via `DecisionFollowUpRow` compartilhado (thread + resolução)
- Empty state quando sem pendências
- Segue padrão: `WizardStepHeader` + `WizardStepFooter`

### Etapa 7 — Integrar no wizard do colaborador

**Arquivo:** `src/modules/okrs/pages/CollaboratorCheckinPage.tsx`

- Adicionar step `'decisions'` ao `WizardStep` type e ao `STEP_ORDER`:
  `context → checkin → kpis → projects → initiatives → decisions → reflection → summary`
- Auto-skip: se `useMyPendingDecisions` retorna lista vazia, pular para `reflection`
- Import do novo `CollaboratorDecisionsStep`

---

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| `src/modules/okrs/types/wizard.ts` | Adicionar `DecisionThreadMessage` e campo `thread` |
| `src/modules/okrs/components/wizards/shared/DecisionFollowUpRow.tsx` | **Novo** — extraído + thread |
| `src/modules/okrs/components/wizards/shared/index.ts` | Export do novo componente |
| `src/modules/okrs/hooks/useDecisionThread.ts` | **Novo** — append de mensagens na thread |
| `src/modules/okrs/hooks/useMyPendingDecisions.ts` | **Novo** — decisões pendentes do usuário |
| `src/modules/okrs/hooks/index.ts` | Exports dos novos hooks |
| `src/modules/okrs/pages/RitualHistoryPage.tsx` | Substituir inline por import compartilhado |
| `src/modules/okrs/components/wizards/collaborator/CollaboratorDecisionsStep.tsx` | **Novo** — step de pendências |
| `src/modules/okrs/pages/CollaboratorCheckinPage.tsx` | Adicionar step `decisions` com auto-skip |

### Reutilização

- `MessageBubble` de `src/components/messaging` para renderizar mensagens da thread
- `useCanResolveDecision` existente para permissões
- `useUpdateDecisionFollowUp` existente para persistência de resolução
- `useIdentity` para `profileId` e `realProfileId` (mutation guard)
- Componentes de wizard compartilhados (`WizardStepHeader`, `WizardStepFooter`)

