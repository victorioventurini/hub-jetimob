
# Corrigir navegacao "voltar" do navegador nos wizards

## Diagnostico

### TCR e docs consultados
- TCR v3.8.0 (confirmado React Router DOM v7, wizards fullpage)
- `docs/guides/WIZARD_DEVELOPMENT_GUIDE.md` (arquitetura de wizards)
- Memory: `architecture/wizard-url-step-sync` (padrao de sync bidirecional com URL)

### Causa raiz

O hook `useGenericWizardDraft` (linha 290-303) usa `setSearchParams({ replace: true })` do React Router v7 para sincronizar o step atual na URL. Em React Router v7, `setSearchParams` chama `navigate()` internamente, que usa `startTransition`.

O problema ocorre porque:

1. **`setSearchParams` com `replace: true` no RR v7 pode criar entradas de historico** em vez de substituir, especialmente durante transicoes concorrentes ou quando chamado em sequencia rapida
2. **Nenhum tratamento de browser back existe** no `FullPageWizardShell` — so ha `beforeunload` (para fechar aba) e botao visual de voltar
3. Quando o usuario clica "voltar" no navegador, o React Router processa o `popstate`, mas se houver uma chamada pendente de `setSearchParams` (ex: do mount ou de uma transicao de step), ela pode sobrescrever a navegacao de volta, redirecionando ao wizard

### Evidencias no codigo
- `useGenericWizardDraft.ts:290-302`: `setStep` chama `setSearchParams` com `replace: true`
- `useGenericWizardDraft.ts:337,403`: `clearDraft`/`discardDraft` tambem chamam `setSearchParams`
- `FullPageWizardShell.tsx:126-137`: Apenas `beforeunload`, sem handler de `popstate` ou `useBlocker`
- Todos os 5 wizard pages (Collaborator, Leader, Team, Managers, CLevel) sao afetados

## Solucao

### 1. Substituir `setSearchParams` por `window.history.replaceState` no sync de step

**Arquivo:** `src/modules/okrs/hooks/useGenericWizardDraft.ts`

Na funcao `setStep` (linhas 290-303), substituir `setSearchParams` por manipulacao direta do `window.history.replaceState`. Isso bypassa o sistema de transicoes do React Router, garantindo que NENHUMA entrada de historico e criada:

```typescript
const setStep = useCallback((step: TStep) => {
  setDraft(prev => ({ ...prev, currentStep: step }));
  setIsDirty(true);
  // Sync step to URL via replaceState (bypassa React Router transitions)
  const url = new URL(window.location.href);
  if (step === defaultStep) {
    url.searchParams.delete('step');
  } else {
    url.searchParams.set('step', step);
  }
  window.history.replaceState(window.history.state, '', url.toString());
}, [defaultStep]);
```

Nas funcoes `clearDraft` (linha 403) e `discardDraft` (linha 337), substituir o `setSearchParams` pelo mesmo padrao:

```typescript
// Substituir:
// setSearchParams(prev => { ... }, { replace: true });
// Por:
const url = new URL(window.location.href);
url.searchParams.delete('step');
window.history.replaceState(window.history.state, '', url.toString());
```

### 2. Adicionar tratamento de browser back no FullPageWizardShell

**Arquivo:** `src/modules/okrs/components/wizards/shared/FullPageWizardShell.tsx`

Adicionar listener de `popstate` para interceptar o botao voltar do navegador e tratar como fechamento do wizard:

```typescript
// Handle browser back button
useEffect(() => {
  // Push a sentinel state so we can detect back
  const hasSentinel = window.history.state?.__wizardSentinel;
  if (!hasSentinel) {
    window.history.pushState(
      { ...window.history.state, __wizardSentinel: true },
      ''
    );
  }

  const handlePopState = (e: PopStateEvent) => {
    // User pressed browser back
    if (isDirty) {
      // Re-push to stay on page, show exit dialog
      window.history.pushState(
        { ...window.history.state, __wizardSentinel: true },
        ''
      );
      setShowExitDialog(true);
    } else {
      // Not dirty, just navigate back
      onClose();
      navigate(backUrl, { replace: true });
    }
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [isDirty, onClose, navigate, backUrl]);
```

### 3. Remover dependencia de `setSearchParams` no hook

**Arquivo:** `src/modules/okrs/hooks/useGenericWizardDraft.ts`

Remover o import de `useSearchParams` e a variavel `setSearchParams` do hook, ja que nao sera mais necessario. Manter apenas a leitura de `searchParams` para o mount sync (linha 185-190), usando `new URLSearchParams(window.location.search)` em vez de `useSearchParams`.

## Impacto

- Botao voltar do navegador funcionara corretamente em TODOS os 5 wizards
- Se houver alteracoes nao salvas (isDirty), usuario vera o dialogo de confirmacao
- Se nao houver alteracoes, voltara direto para a pagina anterior
- Step sync na URL continua funcionando (deep-linking preservado)
- Sem impacto em outros componentes que usam `useSearchParams` normalmente
