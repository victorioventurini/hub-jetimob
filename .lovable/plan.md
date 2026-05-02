# Padronizar footers de navegação do Pré-MBR ao canon do Check-in Individual

## Contexto

Os 5 steps do Pré-MBR já consomem os componentes canônicos compartilhados (`WizardFirstStepFooter`, `WizardStepFooter`, `WizardLastStepFooter` em `src/modules/okrs/components/wizards/shared/WizardStepFooter.tsx`). O gap é **nas props passadas**, não em estrutura — então não há nenhum componente novo a criar nem nenhuma duplicação envolvida. Apenas alinhamento de chamadas.

Auditoria step-a-step (referência: Check-in Individual):

| Step Pré-MBR | Componente | Hoje | Canon | Status |
|---|---|---|---|---|
| 1 — Balanço (`QbrBalanceStep`) | `WizardFirstStepFooter` | `primaryLabel="Continuar"` (override) | `"Começar"` (default do preset) | Override desnecessário |
| 2 — KPIs (`QbrKpiAnalysisStep`) | `WizardStepFooter` | `onBack`, `onPrimary` | idem | OK — sem mudança |
| 3 — Destaques (`MbrPreHighlightsStep`) | `WizardStepFooter` | `onBack`, `onPrimary`, `primaryDisabled` | idem | OK — `primaryDisabled` mantido (decisão do usuário) |
| 4 — Próximos Passos (`MbrPreNextStepsStep`) | `WizardStepFooter` | `onBack`, `onPrimary`, `primaryDisabled` | idem | OK — `primaryDisabled` mantido |
| 5 — Resumo (`MbrPreSummary`) | `WizardLastStepFooter` | `onBack`, `onPrimary`, `primaryLoading={isCompleting}` | + `backDisabled={isCompleting}` | Falta travar Voltar durante envio |

Outro detalhe: hoje `MbrPrePage` chama `<MbrPreSummary ... isCompleting={false} />` fixo — o spinner do botão e o `backDisabled` nunca aparecem. Precisa propagar o estado real.

## Mudanças

### 1) `src/modules/okrs/components/wizards/qbr-pre/QbrBalanceStep.tsx`

Linha ~126: remover override `primaryLabel="Continuar"` para o `WizardFirstStepFooter` cair no default canônico `"Começar"`.

```diff
- <WizardFirstStepFooter
-   onPrimary={onContinue}
-   primaryLabel="Continuar"
- />
+ <WizardFirstStepFooter onPrimary={onContinue} />
```

Impacto cruzado: este componente também é usado pelo `QbrPrePage`. Como o canon do Check-in já estabelece "Começar" no Step 1, padronizar o QBR-Pre junto é coerente — o usuário pediu "canônico do Check-in Individual" como referência geral.

### 2) `src/modules/okrs/components/wizards/mbr-pre/MbrPreSummary.tsx`

Linha ~82: passar `backDisabled={isCompleting}` ao `WizardLastStepFooter`, espelhando exatamente o padrão do `CollaboratorSummary` (`backDisabled={isSubmitting}`).

```diff
  <WizardLastStepFooter
    onBack={onBack}
+   backDisabled={isCompleting}
    onPrimary={onComplete}
    primaryLoading={isCompleting}
  />
```

### 3) `src/modules/okrs/pages/MbrPrePage.tsx`

- Adicionar estado local `isCompleting` (controlado pelo próprio `handleComplete`):
  ```ts
  const [isCompleting, setIsCompleting] = useState(false);
  const handleComplete = useCallback(async () => {
    setIsCompleting(true);
    try {
      await clearDraft();
      toast.success('Pré-MBR concluído! O facilitador será notificado.');
      navigate('/rituals');
    } catch (error) {
      handleError(error, { context: 'MBR Pre Complete' });
    } finally {
      setIsCompleting(false);
    }
  }, [clearDraft, navigate]);
  ```
- Trocar `isCompleting={false}` por `isCompleting={isCompleting}` na chamada do `<MbrPreSummary>`.

### 4) Verificações de "voltar funcionando"

Já está correto via `goBack()` em `MbrPrePage` (`STEP_ORDER.indexOf(currentStep) - 1`) e propagado para `QbrKpiAnalysisStep`, `MbrPreHighlightsStep`, `MbrPreNextStepsStep`, `MbrPreSummary`. Não há mudança de código — apenas validar manualmente após os ajustes.

O stepper superior (`FullPageWizardShell` → `WizardStepper`) já recebe `onStepChange={goToStep}` e habilita clique nos steps já completados (`completedSteps`). Sem mudança.

## Não-mudanças (deliberadamente)

- **Não criar variantes novas de footer.** Tudo já existe em `shared/WizardStepFooter.tsx`.
- **Não adicionar `showSkip`** nos steps intermediários do Pré-MBR. O usuário escolheu manter o bloqueio (`primaryDisabled` quando vazio em Highlights/Next-Steps).
- **Não tocar nos labels canônicos** do `WizardLastStepFooter` (`"Finalizar e enviar"` / `"Enviando…"`) — vêm do shared.
- **Não tocar no `AlertDialog` de confirmação** do `WizardLastStepFooter` — já é canônico.

## Validação

1. `/rituals/mbr-pre?team=...` → Step 1 deve mostrar botão **"Começar"** (não "Continuar").
2. Avançar até cada step → botão **"Voltar"** funcional, label/ícone idênticos ao Check-in.
3. Steps 3 e 4 → "Continuar" desabilitado quando vazio (mantido), habilita ao digitar.
4. Step 5 → ao clicar "Finalizar e enviar" abre o `AlertDialog`; ao confirmar, botão exibe spinner + "Enviando…" e botão **"Voltar"** fica disabled durante envio.
5. `bun run test src/modules/okrs/components/wizards/shared/__tests__/WizardStepFooter.test.tsx` continua verde (sem alterações ao componente shared).
