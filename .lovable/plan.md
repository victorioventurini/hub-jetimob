## Objetivo

Garantir que, ao clicar "Concluir" no MBR, **nenhum dado registrado seja perdido**: snapshot do rito (`reflection_data`), checklist de governança, `ritualFeedback`, decisões e addendums. Hoje há janelas de perda silenciosa.

## Diagnóstico (estado atual)

Fluxo de conclusão (`MbrPage.handleComplete` → `useGenericWizardDraft.clearDraft` → `completeSession`):

1. `clearDraftFromStorage(storageKey)` apaga o localStorage **antes** do UPDATE no banco.
2. `completeSession` faz UPDATE em `okr_wizard_sessions` com `status='completed'` + `reflection_data` final.
3. Em caso de erro, o `try/catch` apenas loga (`console.error`) e retorna o `sessionId` mesmo assim.
4. `MbrPage.handleComplete` mostra `toast.success` e `navigate('/okrs/executive')` incondicionalmente.

Janelas de perda identificadas:

- **Erro silencioso no UPDATE final**: se a gravação do snapshot final falhar (rede, RLS, BU), o usuário vê sucesso, perde o localStorage e é redirecionado. Snapshot fica desatualizado (sem últimas edições do step Resumo/Closing).
- **Auto-save debounced em voo**: edições feitas nos últimos ~ms antes do clique podem estar com mutation pendente. Como `completeSession` regrava `reflection_data` com o draft React mais recente, isso é inofensivo — **a menos** que o UPDATE final falhe (volta ao ponto anterior).
- **Duplo-clique**: protegido por `isCompletingRef`, ok.
- **Addendums** (participant evaluations, reopen backup): persistidos por fluxos próprios fora de `completeSession`. Verificar que `EvaluationCollectionStep.closeMut` é aguardado antes de avançar — hoje `onContinue={goNext}` permite avançar sem fechar a coleta. Isso não bloqueia conclusão, mas convém deixar explícito.
- **`ritualFeedback` e `checklist`**: vivem só em `draft.data`, salvos via snapshot. Confirmado que entram no `JSON.stringify(draft)` do `completeSession`. OK desde que o UPDATE final não falhe.

## Mudanças propostas

### 1. `useGenericWizardDraft.session.ts` — `completeSession` deve falhar alto

- Remover o `catch` que engole erro e retorna `sessionId` mesmo assim. Re-lançar a exceção.
- Manter try/catch só ao redor de `associateCompletedSessionToOccurrence` (não-crítico, best-effort com `console.warn`).
- Validar resposta do UPDATE: usar `.select('id').single()` para garantir que a linha existiu e foi atualizada (RLS-safe).

### 2. `useGenericWizardDraft.ts` — `clearDraft` deve ser atômico

- Reordenar: **primeiro** `await completeSession(...)`, **depois** limpar localStorage e estado React.
- Se `completeSession` lançar, **não** limpar localStorage, **não** zerar `sessionId`/`draft`, e re-lançar.
- Liberar `isCompletingRef` em caso de erro (hoje fica travado para sempre).

### 3. `useGenericWizardDraft.ts` — flush de auto-save pendente

- Antes de `completeSession`, aguardar qualquer `saveDraftMutation` em voo (`saveDraftMutation.isPending` → await mutation atual ou disparar um `saveSession` síncrono com o draft mais recente).
- Garante que, em caso de retry após erro, o último estado já estaria persistido como `in_progress`.

### 4. `MbrPage.handleComplete` — UX de erro

- Envolver `clearDraft()` em try/catch.
- Em erro: `toast.error('Não foi possível concluir o MBR. Seus dados estão preservados — tente novamente.')` e **não** navegar.
- Em sucesso: comportamento atual (toast + navigate + email best-effort).

### 5. Closing — bloquear conclusão se há mutation pendente

- `MbrClosingStep` recebe `isCompleting` (do hook) e desabilita o botão enquanto pendente, evitando duplo clique e mostrando estado.

### 6. Telemetria mínima

- `console.warn('[MBR] complete failed', { sessionId, error })` para diagnóstico futuro. Sem novas tabelas.

## Fora de escopo

- Promover decisões/KPIs/OKRs para tabelas canônicas (não solicitado).
- Mudanças em RLS de `okr_wizard_sessions`.
- Mudança no formato de `reflection_data`.

## Arquivos afetados

- `src/modules/okrs/hooks/useGenericWizardDraft.session.ts` (completeSession: rethrow + select.single)
- `src/modules/okrs/hooks/useGenericWizardDraft.ts` (clearDraft: reorder + flush + libera ref em erro)
- `src/modules/okrs/pages/MbrPage.tsx` (handleComplete: try/catch + UX)
- `src/modules/okrs/components/wizards/mbr/MbrClosingStep.tsx` (prop `isCompleting` no botão)

## Validação

- Build limpo.
- Teste manual: simular erro no UPDATE (DevTools → bloquear request `okr_wizard_sessions`) e verificar que: localStorage permanece, draft React intacto, toast de erro, sem redirect.
- Cenário feliz inalterado: snapshot final gravado, sessão `completed`, navegação para `/okrs/executive`, e-mail disparado.
