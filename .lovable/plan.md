# Bug: Botão "Voltar" em Projects não funciona

## Pré-checklist (TCR + docs canônicos)

- Lido: `CollaboratorCheckinPage.tsx`, `CollaboratorProjectsStep.tsx`, `CollaboratorKpiStep.tsx`.
- Memórias relevantes: `mem://standards/no-render-side-effects`, `mem://features/rituals/collaborator-checkin-pending-items-step`.
- Sem duplicação: a correção é na orquestração (`visibleStepOrder`) e na remoção de side-effects de render. Reaproveita os componentes existentes.

## Diagnóstico

`STEP_ORDER = ['context','kpis','projects','initiatives','checkin','decisions','reflection','summary']`.

Quando o usuário **não tem KPIs** (`kpis.length === 0`), o `CollaboratorKpiStep` faz `goNext()` **em render** (linhas 370-372 do orquestrador, no `case 'kpis'`):

```ts
if (!currentKpi || kpis.length === 0) {
  goNext();
  return null;
}
```

Resultado: ao clicar **Voltar** em `projects`, `goBack()` move para `kpis`; o render imediato chama `goNext()` e volta para `projects`. UI parece "travada".

O mesmo padrão existe no `case 'checkin'` (linhas 325-329) — mitigado para o caso "sem KRs" porque `visibleStepOrder` já remove `checkin` quando `!hasKrStep`. Mas há fragilidade: se `currentKrIndex >= krs.length` por qualquer motivo, mesmo loop.

Violações dos canônicos:
- `mem://standards/no-render-side-effects` — `goNext()` chamado durante render.
- O `visibleStepOrder` deve refletir **todos** os steps efetivamente disponíveis, não só `checkin`.

## Solução

Centralizar a regra "step disponível" no `visibleStepOrder`/`visibleSteps` e remover os side-effects de render dos `case`s do orquestrador.

### Mudanças em `src/modules/okrs/pages/CollaboratorCheckinPage.tsx`

1. **Detectar emptiness de KPIs** após a query carregar:
   ```ts
   const hasKpiStep = !!(userKpis && userKpis.length > 0);
   ```

2. **Filtrar `visibleSteps` e `visibleStepOrder`** considerando `hasKrStep` **e** `hasKpiStep`:
   ```ts
   const visibleSteps = useMemo(() => WIZARD_STEPS.filter(s => {
     if (s.id === 'checkin' && !hasKrStep) return false;
     if (s.id === 'kpis' && !hasKpiStep) return false;
     return true;
   }), [hasKrStep, hasKpiStep]);

   const visibleStepOrder = useMemo(() => STEP_ORDER.filter(s => {
     if (s === 'checkin' && !hasKrStep) return false;
     if (s === 'kpis' && !hasKpiStep) return false;
     return true;
   }), [hasKrStep, hasKpiStep]);
   ```

3. **Remover os `goNext()` em render** dos `case 'kpis'` e `case 'checkin'`. Como o step não estará mais no `visibleStepOrder` quando vazio, o usuário nunca cai nele. Defesa final: se ainda assim o `draft.currentStep` apontar para um step removido, usar `useEffect` para redirecionar — não chamada direta no render.

   ```ts
   // Auto-correct: se o step atual saiu do visibleStepOrder (ex.: dados chegaram
   // depois e removeram 'kpis'), reposiciona via efeito — nunca em render.
   useEffect(() => {
     if (!visibleStepOrder.includes(draft.currentStep)) {
       setStep(visibleStepOrder[0] ?? 'context');
     }
   }, [visibleStepOrder, draft.currentStep, setStep]);
   ```

4. **Aguardar carregamento** antes de renderizar steps que dependem das listas. O loading guard já existe para `isLoadingKrs`; estender para `isLoadingKpis` se ainda não cobre o cálculo de `hasKpiStep` (verificar e ajustar se necessário).

### Não muda

- `CollaboratorProjectsStep.tsx`, `CollaboratorKpiStep.tsx` e demais steps permanecem intactos.
- Reaproveita `WizardStepFooter` e shells existentes (sem novos componentes).

## Impacto

- "Voltar" em `projects` (e qualquer outro step) passa a navegar diretamente para o step anterior **realmente disponível**, sem loop.
- Stepper visual no `FullPageWizardShell` deixa de mostrar "Indicadores operacionais" para usuários sem KPIs (consistente com o que já acontece para "KRs" sem KRs).
- Elimina side-effect de render (compliance com `no-render-side-effects`).

## Verificação

1. Acessar `/rituals/collaborator-checkin?user=4e5985d2-d729-4529-ad6c-4ee15b0d927f&step=projects` e clicar **Voltar** → deve ir para `context` (sem passar por `kpis`).
2. Usuário com KPIs: stepper mostra `kpis` e back/next funcionam normalmente.
3. Usuário sem KRs e sem KPIs: stepper sem `checkin` nem `kpis`; navegação completa funciona.
4. Conferir console: sem warnings de "setState during render".

Aprovação para implementar?
