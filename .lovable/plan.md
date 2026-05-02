## Diagnóstico

URL: `/rituals/collaborator-checkin?step=checkin` → renderiza `CollaboratorCheckinStep` (atualização de KRs).

O botão **Voltar** está desabilitado quando o usuário está no primeiro KR da lista (`currentIndex === 0`). Como esse é o estado inicial ao chegar no step `checkin` vindo do step anterior (`initiatives`), o botão fica permanentemente desabilitado e o usuário não consegue voltar para o step anterior.

**Arquivo:** `src/modules/okrs/components/wizards/collaborator/CollaboratorCheckinStep.tsx`, linha 418:

```tsx
<Button variant="ghost" onClick={onBack} disabled={currentIndex === 0}>
  <ArrowLeft … /> Voltar
</Button>
```

A página pai (`CollaboratorCheckinPage.tsx`, linhas 391–397) já trata corretamente ambos os casos no handler `onBack`:
- Se `safeIndex > 0` → decrementa `currentKrIndex` (volta um KR)
- Se `safeIndex === 0` → chama `goBack()` (volta ao step anterior do wizard)

O `disabled` no botão impede que esse handler seja chamado no segundo caso.

Os outros steps do wizard (`CollaboratorKpiStep`, `CollaboratorProjectsStep`, `CollaboratorInitiativesStep`) não têm esse problema — apenas o `CollaboratorCheckinStep`.

## Mudança

**`CollaboratorCheckinStep.tsx`** (linha 418): remover `disabled={currentIndex === 0}` do botão Voltar. O handler em `CollaboratorCheckinPage` já lida com a lógica correta (voltar de KR ou voltar de step).

## Verificação

- Navegar `/rituals/collaborator-checkin?step=checkin` → clicar em "Voltar" deve retornar ao step anterior (`initiatives` ou primeiro step visível).
- No segundo KR em diante, "Voltar" deve continuar voltando KR a KR, como hoje.
- Sem mudança em handlers, dados, ou outros steps.

## Arquivos alterados
- `src/modules/okrs/components/wizards/collaborator/CollaboratorCheckinStep.tsx` (1 linha)
