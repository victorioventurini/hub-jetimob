---
name: No Side-Effects in Render
description: Proibido chamar setState/navigate/setSearchParams/setStep durante o corpo de render — sempre usar useEffect ou filtrar antes do render
type: preference
---

**Regra inquebrável:** **NUNCA** chamar funções que disparam updates de estado (setState, setSearchParams, navigate, setStep, ou qualquer setter de React Query) **durante o corpo de render** de um componente React.

**Por quê:**
- React agenda re-render quando state muda. Chamar um setter no render → novo render → setter de novo → loop infinito.
- Em DEV pode parecer funcionar (StrictMode mascara), mas em produção quebra com `Maximum update depth exceeded` ou trava silenciosamente.
- O componente fica preso em re-renders e a UI nunca avança.

**Anti-pattern (PROIBIDO):**
```tsx
function Wizard() {
  switch (currentStep) {
    case 'kr-type':
      goNext();          // ⛔ side-effect em render
      return null;       // ⛔ never renders, loops forever
  }
}
```

**Pattern correto (3 opções):**

1. **Filtrar antes de chegar no render** — remover o step do array de steps e ajustar `goNext`/`goBack` para pulá-lo:
```tsx
const filteredSteps = config.steps.filter(s => s.id !== 'kr-type' || shouldShow);
```

2. **Mover side-effect para `useEffect`** — quando precisa rodar após render:
```tsx
useEffect(() => {
  if (currentStep === 'kr-type' && shouldSkip) goNext();
}, [currentStep, shouldSkip, goNext]);
```

3. **Renderizar o step de verdade** — geralmente a opção certa, especialmente quando o step coleta dados necessários downstream.

**Como aplicar em wizards:**
- Pular step opcional → filtrar do array `WIZARD_STEPS` + ajustar `goNext`/`goBack` (já existe lógica para `kr-shared-check` em `TeamKrCreationPage.tsx`).
- Step que ainda não está pronto → comente no array de configs, **não** renderize null com side-effect.

**Histórico:**
- 2026-04-25 — `TeamKrCreationPage.tsx` chamava `goNext()` no `case 'kr-type'` durante render. Resultado: usuários não conseguiam adicionar KRs de Contribuição/Enabler (krPlan ficava no default `{foundational:1, contribution:0, enabler:0}`) e em produção o wizard travava em loop. Corrigido renderizando o `KrTypeStep` real.
