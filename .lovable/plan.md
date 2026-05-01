## Objetivo
No `?step=initiatives` do Collaborator Check-in, quando não houver iniciativas vinculadas:
1. Exibir o **EmptyState canônico** centralizado verticalmente no meio da área de conteúdo.
2. Manter o **footer padrão** do wizard com **Voltar / Pular / Continuar** (mesmo padrão dos outros steps — print enviado pelo usuário).

## Análise (pré-checklist)
- **Arquivo**: `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx` (linhas 184-212 — branch de empty state).
- **Hoje**: renderiza layout custom (`flex flex-col h-full` + ícone + título + descrição + botão "Continuar para reflexão") e um footer custom só com "Voltar". Quebra o padrão visual e duplica markup do EmptyState.
- **SSOT existentes (não duplicar)**:
  - `EmptyState` em `src/components/ui/empty-state.tsx` — já provê ícone redondo, título, descrição centralizados.
  - `WizardStepScaffold` + `WizardStepHeader` + `WizardStepFooter` (já usados em `CollaboratorProjectsStep` linhas 286-309) — provê o footer canônico Voltar/Pular/Continuar do print.
- **Observação adicional**: o branch principal (com iniciativas) deste step **também** monta layout próprio (`flex flex-col h-full` + header/footer manuais nas linhas 214-331). Está fora do escopo deste pedido (usuário pediu só o empty state). Não vou refatorar o branch com dados — apenas alinhar o empty state ao padrão.

## Mudanças (apenas frontend / presentation)

### Arquivo único: `CollaboratorInitiativesStep.tsx`

**1. Imports** — adicionar:
```ts
import { EmptyState } from '@/components/ui/empty-state';
import { WizardStepScaffold } from '../shared/WizardStepScaffold'; // mesmo path usado em CollaboratorProjectsStep
import { WizardStepHeader } from '../shared/WizardStepHeader';
import { WizardStepFooter } from '../shared/WizardStepFooter';
```
(Confirmar paths exatos durante implementação consultando os imports de `CollaboratorProjectsStep.tsx`.)

**2. Substituir o bloco do empty state (linhas 184-212)** por:
```tsx
if (initiatives.length === 0) {
  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={ClipboardList}
          title="Iniciativas vinculadas"
          tooltip="collaborator-initiatives"
          description="Revise as iniciativas e marque as que precisam de atenção"
          variant="purple"  /* alinhar ao tom usado no step quando houver dados; ajustar para o variant atualmente usado */
        />
      }
      footer={
        <WizardStepFooter
          showBack
          onBack={onBack}
          primaryLabel="Continuar"
          onPrimary={() => onContinue([])}
          showSkip
          skipLabel="Pular"
          onSkip={onSkip}
        />
      }
    >
      <div className="flex-1 flex items-center justify-center p-6 min-h-[320px]">
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma iniciativa vinculada"
          description="Você não possui iniciativas vinculadas aos seus KRs. Iniciativas são opcionais — você pode pular ou avançar."
        />
      </div>
    </WizardStepScaffold>
  );
}
```

**Notas de implementação:**
- `EmptyState` já centraliza horizontalmente; o wrapper `flex-1 flex items-center justify-center` garante o centro vertical do conteúdo, conforme pedido.
- O footer canônico é **idêntico** ao usado em `CollaboratorProjectsStep` — Voltar à esquerda, Pular + Continuar à direita (matches o print).
- **Sem CTA dentro do EmptyState**: as 3 ações (Voltar/Pular/Continuar) já estão no footer; evita botão duplicado.
- `onContinue([])` preserva o contrato (`markedAtRisk` vazio quando não há iniciativas).
- Ícone, título e descrição mantêm a mensagem original ("opcional"), apenas re-roteada ao componente canônico.

## Fora de escopo
- Não vou refatorar o branch com iniciativas (linhas 214-345) para usar o `WizardStepScaffold`. Pode ser um follow-up de hygiene em outra task — o usuário pediu especificamente o empty state.
- Sem mudanças em schema, RLS, edge functions ou lógica de dados.

## Validação
- Rota `/rituals/collaborator-checkin?step=initiatives` quando o usuário não tem iniciativas vinculadas:
  - EmptyState centralizado vertical+horizontal no meio da tela.
  - Footer com Voltar (esquerda) + Pular + Continuar (direita), igual aos outros steps.
- Quando houver iniciativas, comportamento permanece idêntico ao atual.