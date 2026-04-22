---
name: useAiSection canonical hook
description: Hook canônico para wizards/UI com IA opcional (slots, timeout, fallback imediato, anti-double-fetch)
type: preference
---

Para qualquer step de wizard ou seção de UI que enriqueça com IA opcional (saudações, mensagens de cultura, dicas contextuais), usar `useAiSection` de `@/modules/vic`.

```ts
const { values } = useAiSection({
  timeoutMs: 10_000,
  slots: {
    greeting: { agent, actionContext, context, userQuestion, fallback: 'Olá!' },
    message:  { agent, actionContext, context, userQuestion, fallback: 'Texto...' },
  },
});
```

**Garantias do hook:**
- Pré-popula `values` com fallback IMEDIATO (UX nunca trava).
- Espera `isReady` + `buId` + `bu_ia_config`; se IA off → mantém fallback.
- Dispara N chamadas em paralelo via `Promise.all`.
- Cada chamada usa `timeoutMs` + `silent: true` (resiliência centralizada em `useVicAgent`).
- `useRef` interno previne double-fetch quando o efeito reroda.

**PROIBIDO:** reimplementar este padrão à mão em wizards. Se precisar de feedback inline (ex.: validação metodológica), aí sim use `useVicAgent`/`useWizardAI` direto, mas sempre com `timeoutMs` e `fallback`.

Referência viva: `src/modules/okrs/components/wizards/team-okr-creation/TeamOkrIntroStep.tsx`.

Origem: Wave 2 do `docs/audits/SYSTEMIC_AUDIT_2026-04-22.md`.
