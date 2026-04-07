

## Plano Revisado: Reabrir QBR Meeting com proteção contra perda de dados

### Mudança principal vs. plano anterior

Adicionada **Etapa 0** de proteção: antes de reverter o status, o sistema cria um backup do snapshot e a re-hidratação é obrigatória antes de qualquer edição.

---

### Etapa 0 — Backup do snapshot antes de reabrir

**Arquivo:** `src/modules/okrs/hooks/useGenericWizardDraft.ts`

Na função `reopenSession`:
1. Buscar a sessão pelo ID, incluindo `reflection_data`
2. Salvar `reflection_data` no campo `addendums` como entrada especial do tipo `{ type: 'pre_reopen_backup', snapshot: reflection_data, created_at }` — isso garante que mesmo se o rito for re-concluído com dados corrompidos, o snapshot original permanece acessível
3. Só então reverter `status → 'in_progress'`, `completed_at → null`
4. Re-hidratar o draft local a partir de `reflection_data.data` (o conteúdo dos steps)
5. Persistir no localStorage imediatamente

### Etapa 1 — Re-hidratação obrigatória do draft

**Arquivo:** `src/modules/okrs/hooks/useGenericWizardDraft.ts`

- A função `reopenSession` recebe o `reflection_data` completo
- Mapeia os campos do snapshot para o formato do draft do wizard (steps, decisions, commitments, approvals)
- Popula o localStorage com o draft re-hidratado **antes** de redirecionar o usuário ao wizard
- Se o mapeamento falhar (formato incompatível), abortar a reabertura e exibir toast de erro

### Etapa 2 — Botão de reabertura na CompletedRitualView

**Arquivo:** `src/modules/okrs/components/wizards/shared/CompletedRitualView.tsx`

- Prop opcional `onReopen?: () => Promise<void>`
- `ConfirmDialog` com texto explícito: "O rito será reaberto para edição. Uma cópia de segurança dos dados atuais será mantida automaticamente."
- Visível apenas quando `canReopen` é `true` (restrito a BU admins via `isWildcard`)
- Loading state no botão durante a operação

### Etapa 3 — Integração no QbrMeetingPage

**Arquivo:** `src/modules/okrs/pages/QbrMeetingPage.tsx`

- Usar `useCompletedSessionForCycle('qbr-meeting', null, quarterlyCycle?.id)`
- Quando sessão `completed` detectada e draft local vazio: exibir `CompletedRitualView` com botão de reabertura
- Ao reabrir: chamar `reopenSession(sessionId, reflectionData)` → re-hidratar → redirecionar ao wizard

---

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| `useGenericWizardDraft.ts` | `reopenSession` com backup + re-hidratação |
| `CompletedRitualView.tsx` | Botão opcional com ConfirmDialog |
| `QbrMeetingPage.tsx` | Detectar completed + integrar reopen |

### Proteções contra perda de dados

| Cenário | Proteção |
|---------|----------|
| Re-conclusão com dados vazios | Backup do snapshot original nos addendums |
| Formato incompatível | Abortar reabertura + toast de erro |
| Usuário fecha sem re-concluir | Draft permanece no localStorage + sessão fica `in_progress` (editável na próxima visita) |
| Múltiplas reaberturas | Cada reabertura cria novo backup nos addendums |

### Ação imediata

Para desbloquear o acesso agora (antes da implementação), posso reverter a sessão específica via query SQL direta, desde que se re-hidrate o draft manualmente. Basta confirmar.

