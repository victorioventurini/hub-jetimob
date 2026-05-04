# Plano — Modal de confirmação canônico ao finalizar ritos

## Pré-checklist (executado)
- TCR `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` v3.29.1 — consultado
- `docs/canonical/WIZARDS_FRAMEWORK_BOUNDARY.md` — fronteira `@/wizards-framework` respeitada
- Memórias: Wizards Master SSOT + Ritual Labels SSOT
- Componentes existentes auditados:
  - `src/components/ui/confirm-dialog.tsx` — **canônico** (`ConfirmDialog`, variants `destructive/warning/info/default`, `isLoading`)
  - `src/modules/okrs/components/wizards/shared/WizardStepFooter.tsx` — `WizardLastStepFooter` **já existe** com confirmação (mas reimplementa `AlertDialog` em vez de usar `ConfirmDialog`)
  - 10 ritos já usam `WizardLastStepFooter`; 4 wizards finalizam sem ele

## Diagnóstico

### Inconsistências atuais
1. `WizardLastStepFooter` reimplementa o AlertDialog manualmente. Deveria delegar ao `ConfirmDialog` canônico (DRY + variantes coerentes).
2. Cobertura incompleta — finalizam **sem modal**:
   - `clevel-checkin/CLevelDirectivesStep.tsx` (Button manual `onClick={onComplete}`)
   - `team-okr-creation/TeamOkrShareStep.tsx` (último step do OKR creation)
   - `team-kr-creation/KrReviewStep.tsx` (último step do KR creation)
   - `leader-prep/LeaderProjectsStep.tsx` (último step da leader-prep)
3. O **framework genérico** `shared/framework/components/SummaryAndSubmitStep.tsx` e `ClosingStep.tsx` precisam usar o mesmo padrão para que QUALQUER wizard novo herde a confirmação.
4. Texto da confirmação atual é genérico ("Concluir ritual"). Deve permitir customização leve por rito (título/descrição/label do botão), mantendo defaults canônicos.

## Mudanças propostas

### 1. Refatorar `WizardLastStepFooter` para usar `ConfirmDialog`
Arquivo: `src/modules/okrs/components/wizards/shared/WizardStepFooter.tsx`

- Remover o bloco `<AlertDialog>...</AlertDialog>` manual.
- Renderizar `<ConfirmDialog variant="info" />` (importado de `@/components/ui/confirm-dialog`).
- Adicionar props opcionais ao `WizardLastStepFooter`:
  - `confirmTitle?: string` (default: `"Concluir ritual"`)
  - `confirmDescription?: ReactNode` (default: texto atual)
  - `confirmLabel?: string` (default: `"Confirmar conclusão"`)
  - `confirmVariant?: ConfirmDialogVariant` (default: `"info"`)
- Propagar `isLoading` ao `ConfirmDialog` quando `primaryLoading` for true (evita duplo-clique).
- Remover imports não usados de `AlertDialog*` no arquivo.

### 2. Aplicar `WizardLastStepFooter` nos 4 wizards faltantes

| Arquivo | Texto sugerido (confirmTitle / confirmDescription) |
|---|---|
| `clevel-checkin/CLevelDirectivesStep.tsx` | "Concluir Check-in C-Level" / "As diretrizes serão registradas e enviadas." |
| `team-okr-creation/TeamOkrShareStep.tsx` | "Publicar OKR do time" / "O OKR será publicado e ficará visível para o time." |
| `team-kr-creation/KrReviewStep.tsx` | "Publicar KR" / "O Key Result será publicado e ficará visível para o time." |
| `leader-prep/LeaderProjectsStep.tsx` | "Concluir preparação do líder" / texto curto análogo |

Em cada um:
- Trocar `WizardStepFooter` (com `primaryLabel="Continuar"` ou Button manual) por `WizardLastStepFooter`.
- Manter `onPrimary` / `primaryLoading` existentes.

### 3. Aplicar nos componentes do framework genérico
Arquivos:
- `src/modules/okrs/components/wizards/shared/framework/components/SummaryAndSubmitStep.tsx`
- `src/modules/okrs/components/wizards/shared/framework/components/ClosingStep.tsx`

Garantir que ambos rendam `WizardLastStepFooter` em vez de `WizardStepFooter`. Mantém wizards futuros gerados pelo framework com modal por default.

### 4. SSOT de cópia (texto da confirmação)
Adicionar constantes em `src/modules/okrs/constants/ritualLabels.ts` (já é SSOT):
```ts
export const RITUAL_FINALIZATION_COPY: Record<RitualType, {
  title: string;
  description: string;
  confirmLabel: string;
}> = { /* mbr-pre, mbr, qbr-pre, qbr-meeting, qbr-post, weekly, pre-weekly,
       team-checkin, collaborator, clevel-checkin, leader-prep,
       team-okr-creation, team-kr-creation, qbr-pre-clevel */ };
```
Cada wizard passa `RITUAL_FINALIZATION_COPY[ritualType]` ao `WizardLastStepFooter`. Defaults do componente cobrem ausência da chave.

### 5. Testes
Atualizar/adicionar:
- `shared/__tests__/WizardStepFooter.test.tsx` — confirmar que clique em "Finalizar e enviar" abre o `ConfirmDialog` (não `AlertDialog` direto), respeita `confirmTitle/Description/Label`, e respeita `isLoading`.
- Os testes existentes de Closing/Summary que mockam o footer continuam válidos (interface preservada).

## Detalhes técnicos
- **Sem breaking change** na API de `WizardLastStepFooter` (props novas são todas opcionais).
- **Sem nova dependência**.
- **Sem migração de banco**.
- O componente canônico `ConfirmDialog` já trata a11y (Radix `AlertDialog` por baixo), `Loader2`, `disableCancelOnLoading`.
- Mantido o ponto de entrada `@/wizards-framework` para SummaryAndSubmit/Closing — mudança é interna ao framework.

## Arquivos afetados (~10)
1. `src/modules/okrs/components/wizards/shared/WizardStepFooter.tsx` (refator)
2. `src/modules/okrs/constants/ritualLabels.ts` (novo SSOT de cópia)
3. `src/modules/okrs/components/wizards/clevel-checkin/CLevelDirectivesStep.tsx`
4. `src/modules/okrs/components/wizards/team-okr-creation/TeamOkrShareStep.tsx`
5. `src/modules/okrs/components/wizards/team-kr-creation/KrReviewStep.tsx`
6. `src/modules/okrs/components/wizards/leader-prep/LeaderProjectsStep.tsx`
7. `src/modules/okrs/components/wizards/shared/framework/components/SummaryAndSubmitStep.tsx`
8. `src/modules/okrs/components/wizards/shared/framework/components/ClosingStep.tsx`
9. `src/modules/okrs/components/wizards/shared/__tests__/WizardStepFooter.test.tsx` (atualizar)

## Validação pós-implementação
- Em cada um dos 14 ritos, ao clicar no botão final aparece o modal canônico `ConfirmDialog`.
- "Cancelar" fecha sem efeito; "Confirmar" dispara o submit e desabilita botões durante `isLoading`.
- Texto do modal varia por rito conforme `RITUAL_FINALIZATION_COPY`.
- Build limpo, sem regressão visual no footer.
