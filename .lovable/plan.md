

## Bug: Sessao do wizard nao e criada na conclusao, bloqueando e-mail de resumo

### Diagnostico Confirmado (com base no TCR v3.8.0 e codigo-fonte)

O `useGenericWizardDraft` so cria um registro em `okr_wizard_sessions` quando o usuario clica **"Salvar rascunho"** (que chama `saveDraft` -> `saveDraftMutation`). Se o usuario completa o wizard sem salvar rascunho:

1. `sessionId` permanece `null` durante todo o wizard
2. `clearDraft()` apenas limpa localStorage (o bloco `if (sessionId)` no banco nao executa)
3. **TeamCheckinPage**: O disparo do e-mail de resumo falha porque `if (sessionId && ...)` e `false`
4. **Todos os outros wizards**: Nenhum registro de conclusao e salvo em `okr_wizard_sessions`

### Wizards Afetados (5 arquivos)

| Wizard | Arquivo | Consequencia |
|--------|---------|--------------|
| Check-in do Time | `TeamCheckinPage.tsx` | E-mail de resumo NAO enviado + sem registro de conclusao |
| Check-in do Colaborador | `CollaboratorCheckinPage.tsx` | Sem registro de conclusao |
| Preparacao do Lider | `LeaderPrepPage.tsx` | Sem registro de conclusao |
| Check-in de Gestores | `ManagersCheckinPage.tsx` | Sem registro de conclusao |
| Check-in C-Level | `CLevelCheckinPage.tsx` | Sem registro de conclusao |

### Solucao

Modificar `clearDraft` no `useGenericWizardDraft.ts` para **criar automaticamente uma sessao `completed`** quando `sessionId` for `null` no momento da conclusao. Isso resolve o problema de forma centralizada para todos os 5 wizards.

### Detalhamento Tecnico

**Arquivo 1: `src/modules/okrs/hooks/useGenericWizardDraft.ts`** (alteracao principal)

Modificar a funcao `clearDraft` (linhas 323-348) para:
1. Se `sessionId` for `null`, inserir um novo registro em `okr_wizard_sessions` com `status = 'completed'` e `completed_at = now()`
2. Retornar o `sessionId` resultante (existente ou recem-criado) como retorno da funcao `clearDraft`

Mudanca de assinatura: `clearDraft: () => Promise<void>` passa a `clearDraft: () => Promise<string | null>` (retorna o sessionId).

Pseudo-codigo da nova `clearDraft`:
```text
clearDraft():
  1. localStorage.removeItem(storageKey)
  2. Se sessionId existir:
     - UPDATE okr_wizard_sessions SET status='completed', completed_at=now() WHERE id=sessionId
     - resultId = sessionId
  3. Se sessionId == null E profile.id E currentBu.id existirem:
     - INSERT okr_wizard_sessions (bu_id, wizard_type, team_id, cycle_id, started_by, status, completed_at, reflection_data)
     - resultId = novo ID
  4. Reset state local (draft, sessionId, isDirty, etc)
  5. return resultId
```

**Arquivo 2: `src/modules/okrs/pages/TeamCheckinPage.tsx`** (ajuste do disparo do e-mail)

Modificar `handleComplete` (linhas 169-191) para usar o `sessionId` retornado por `clearDraft()`:

```text
handleComplete():
  1. const completedSessionId = await clearDraft()
  2. toast.success + navigate('/okrs')
  3. Se completedSessionId && teamIdParam && quarterlyCycle && currentBu:
     - Invocar 'team-checkin-summary' com completedSessionId (best-effort)
```

**Arquivo 3: `src/modules/okrs/pages/TeamCheckinPage.tsx`** (remover import global client)

A linha 17 importa `supabase` de `@/integrations/supabase/client` (violacao do padrao BU_SCOPED_SUPABASE_RULES - deve usar globalClient ou buScopedSupabase). Como `clearDraft` ja usa `buSupabase` internamente, o import global pode ser substituido por `useBuScopedSupabase` para o invoke da Edge Function.

**Nenhuma alteracao nos outros 4 wizards** e necessaria, pois a correcao no `clearDraft` e centralizada no hook. O retorno do `sessionId` sera ignorado nos wizards que nao precisam dele.

### Atualizacao da Interface `UseGenericWizardDraftReturn`

```text
// ANTES
clearDraft: () => Promise<void>;

// DEPOIS
clearDraft: () => Promise<string | null>;
```

### Conformidade

- **PRE-BU vs POST-BU**: `clearDraft` usa `buSupabase` (POST-BU, correto)
- **Identity**: Usa `profile.id` para `started_by` (correto, conforme IDENTITY_CONVENTION)
- **BU Scope**: Insert inclui `bu_id: currentBu.id` (correto)
- **Client**: Remove import proibido de `@/integrations/supabase/client` no TeamCheckinPage
- **Wizard Standards**: Alinhado com `WIZARD_DEVELOPMENT_GUIDE.md`

