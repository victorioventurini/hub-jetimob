---
name: Vic Invoke Resilience
description: Toda chamada invokeVic herda timeout default (12s) e suporta fallback opt-in centralizado em useVicAgent
type: preference
---

Toda chamada `invokeVic` (via `useVicAgent` ou `useWizardAI`) deve confiar na resiliência centralizada:

- **Timeout default:** `DEFAULT_VIC_TIMEOUT_MS = 12_000ms` aplicado automaticamente. Para opt-out, passar `timeoutMs: 0`.
- **Fallback opcional:** passar `fallback: VicInvokeResponse` faz a promise NUNCA rejeitar — usar quando IA é nice-to-have.
- **Silent toasts:** passar `silent: true` quando o caller já tem fallback/feedback inline.

**PROIBIDO** reintroduzir `withTimeout` ad-hoc, `Promise.race` manual ou `AbortController` próprio em componentes que chamam `invokeVic`. Toda resiliência mora em `src/modules/vic/hooks/useVicAgent.ts`.

**Por quê:** Wizards de OKR travavam quando IA atrasava. Solução ad-hoc local (TeamOkrIntroStep) só protegia 1 de 10 steps. Centralizar no hook protege todos os callers automaticamente sem editar cada componente.

**Como aplicar em novos wizards/steps com IA:**
```ts
const response = await invokeVic(agentSlug, actionContext, context, question, {
  silent: true,
  timeoutMs: 10_000, // override opcional
  fallback: { response: 'mensagem de fallback', agentName: '', agentSlug: '' }, // opcional
});
```

Ver: `docs/audits/SYSTEMIC_AUDIT_2026-04-22.md` — Wave 1.
