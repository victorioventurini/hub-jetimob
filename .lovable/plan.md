## Pré-checklist (consultas obrigatórias)

✅ `TECHNICAL_CONTEXT_REGISTRY.md` — lido
✅ `mem://standards/wizard-draft-isolation` — chave de draft já isolada por `objectiveId+teamId` (fix anterior)
✅ `mem://features/okrs/okr-methodology-standards` — tipologia Foundational/Contribution/Enabler é canônica
✅ `mem://standards/frontend-rules-of-hooks` — hooks/side-effects em ordem estável, **nunca** em render
✅ Codebase: comparei com `KrCreationWizard` (criação de OKR completo) que usa o mesmo `TeamOkrKrTypeStep` corretamente

---

## Diagnóstico

**Sintoma:** Em `/okrs/objectives/:id/krs/create` o usuário não consegue adicionar KRs de **Contribuição** nem **Enabler**, e em alguns casos o wizard fica travado/oscilando.

**Raiz dupla — `src/modules/okrs/pages/TeamKrCreationPage.tsx` linhas 395-398:**

```tsx
case 'kr-type':
  // Step oculto — pular para kr-detail
  goNext();          // ⛔ SIDE-EFFECT NA RENDER → re-renders em cascata, loop em produção
  return null;
```

**Por que isso quebra tudo:**

1. **React anti-pattern (proibido pelo padrão `mem://standards/frontend-rules-of-hooks`)**
   - `goNext()` dispara `setSearchParams` + `setStep` (que faz `setDraft`).
   - Chamado durante render → React agenda novo render → render chama de novo → loop / `Maximum update depth exceeded` em produção.
   - Em DEV o StrictMode pode mascarar, mas em produção (hub.jetimob.com) trava o componente.

2. **Funcionalmente, o usuário fica sem o step de planejamento de KRs**
   - O `KrTypeStep` (que existe e está pronto em `src/modules/okrs/components/wizards/team-kr-creation/KrTypeStep.tsx`, 286 linhas) é onde o usuário **escolhe quantos KRs de cada tipo** quer criar (`krPlan.foundational/contribution/enabler`).
   - Pulando esse step, `krPlan` permanece no default `{ foundational: 1, contribution: 0, enabler: 0 }` (definido em `useKrWizardDraft.createEmptyDraft`).
   - O `TeamOkrKrDetailStep` gera os slots de KR a partir de `krPlan` (linhas 109-124). Com plan default → só 1 slot Foundational. **Impossível** adicionar KRs de Contribuição ou Enabler.

3. **UX quebrada na navegação**
   - `kr-type` está listado em `WIZARD_CONFIGS['team-kr-creation'].steps` (linha 104 de `wizard-configs.ts`) → aparece no progress bar, mas se o usuário clicar nele para voltar, o `goNext()` em render o joga de volta para `kr-detail` instantaneamente.

---

## Plano de correção

### 1. Renderizar o `KrTypeStep` corretamente em `TeamKrCreationPage.tsx`

Substituir o bloco anti-pattern (linhas 395-398) por uma renderização normal do `KrTypeStep`, alimentando `krPlan` do draft e expondo handler de mudança:

```tsx
case 'kr-type':
  return (
    <KrTypeStep
      objectiveTitle={objective.title}
      isSharedObjective={objective.is_shared || false}
      krPlan={draft.krPlan}
      onKrPlanChange={(plan) => updateDraft({ krPlan: plan })}
      onContinue={goNext}
      onBack={goBack}
    />
  );
```

`KrTypeStep` já está importado em `team-kr-creation/index.ts` e em `TeamKrCreationPage.tsx` (linha 28), então é só usar.

### 2. Atualizar `completedSteps` para refletir a regra real do `kr-type`

Hoje (linhas 300-302) marca `kr-type` como completo se `krPlan.foundational > 0` — está OK, mas ajustar para considerar a soma total e refletir o novo fluxo:

```tsx
const totalKrs = draft.krPlan.foundational + draft.krPlan.contribution + draft.krPlan.enabler;
if (totalKrs > 0 && WIZARD_STEPS.indexOf(draft.currentStep) > 2) {
  completed.push('kr-type');
}
```

### 3. Garantir que `goNext`/`goBack` percorrem `kr-type` normalmente

Já percorrem (o array `WIZARD_STEPS` na linha 42-50 inclui `kr-type` na posição 2). Nenhum ajuste necessário aqui — apenas remover a lógica de "pular kr-type" que já não existe explicitamente; o problema era só o render side-effect.

### 4. Validar persistência do `krPlan`

`useKrWizardDraft` já persiste `krPlan` em localStorage e o tipo `KrPlan` em `useKrWizardDraft.ts` casa com o esperado pelo `KrTypeStep` (`{ foundational, contribution, enabler }`). Sem mudanças.

### 5. Criar memória padronizando proibição de side-effects em render

Criar `.lovable/memory/standards/no-render-side-effects.md`:

> **Proibido** chamar setters de estado, navigate, setSearchParams, ou qualquer função que dispare update de state durante o corpo de render de um componente React. Sempre usar `useEffect`. Em wizards, "pular um step" deve ser feito via filtro no array de steps + lógica em `goNext`/`goBack`, **nunca** com `setX()` em render. Histórico: 2026-04-25 — `TeamKrCreationPage` chamava `goNext()` no `case 'kr-type'`, travando criação de KRs de contribuição.

E adicionar referência em `mem://index.md` na seção Core:
> **No-render-side-effects:** PROIBIDO chamar setState/navigate/setSearchParams durante render. Usar useEffect ou filtrar o caso antes de renderizar.

---

## Arquivos a modificar / criar

- **Editar** `src/modules/okrs/pages/TeamKrCreationPage.tsx` — substituir o `case 'kr-type'` (linhas 395-398) por render real do `KrTypeStep`; ajustar `completedSteps` para `kr-type`.
- **Criar** `.lovable/memory/standards/no-render-side-effects.md`.
- **Editar** `.lovable/memory/index.md` — adicionar entrada Core + linha em "Memories — Standards & Patterns".

## Validação pós-fix

1. Rodar `tsc --noEmit` e checar que não há novos erros.
2. Verificar manualmente em `/okrs/objectives/1470f9f5-fed4-42db-b5fa-406ade6cef6d/krs/create`: o step "Tipos de KR" deve aparecer e permitir incrementar Contribution/Enabler.
3. Confirmar que após escolher 0 Foundational + 1 Contribution o `TeamOkrKrDetailStep` gera 1 slot do tipo Contribution.

## Riscos

- **Baixo.** Não toca em mutations, RLS ou schema. Apenas restaura comportamento de um step já implementado e remove um anti-pattern. O draft existente em localStorage continua compatível (mesma versão 3, mesma shape).