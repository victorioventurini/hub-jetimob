## Objetivo

Padronizar o **Step 1 (Contexto / Abertura ritual)** do Check-in Individual (`/rituals/collaborator-checkin`) com os demais steps do rito:

1. **Largura total da tela** (hoje há `max-w-3xl mx-auto` que estreita o conteúdo).
2. **Botão primário no rodapé fixo** via `WizardStepFooter`, dentro de `WizardStepScaffold` — em vez do botão "Começar" embutido no fim da Trail.

Sem duplicar componentes: reaproveitar exatamente os mesmos `WizardStepScaffold`, `WizardStepHeader` e `WizardStepFooter` que `CollaboratorProjectsStep`, `CollaboratorInitiativesStep` e `CollaboratorDecisionsStep` já usam.

## Estado atual (diagnóstico)

- `CollaboratorContextStep.tsx` renderiza estrutura própria:
  - `<div className="flex flex-col h-full ...">` + `<RitualGreeting>` + `<ScrollArea>` + `<div className="p-6 space-y-6 max-w-3xl mx-auto">` com `<CollaboratorSnapshot>` e `<CollaboratorCheckinTrail onStart={onContinue}>`.
  - O CTA "Começar" vive **dentro** de `CollaboratorCheckinTrail` (linhas 129-137), fora do padrão de footer dos outros steps.
- Demais steps operacionais (Projects/Initiatives/Decisions) usam o trio `WizardStepScaffold` + `WizardStepHeader` + `WizardStepFooter` com conteúdo em `p-4 md:p-6 ... min-w-0 max-w-full` (largura total).

## Mudanças

### 1. `CollaboratorContextStep.tsx` — adotar scaffold

- Remover o wrapper manual (`flex flex-col h-full`, `ScrollArea`, `max-w-3xl mx-auto`).
- Envolver em `WizardStepScaffold`:
  - `header`: `<WizardStepHeader icon={Sparkles} title="Visão geral" tooltip="collaborator-context" description="Confira o que vamos revisar e comece pela sua trilha" variant="purple" />` (variant alinhada à abertura; ajustar token se já houver convenção para Step 1).
  - **A `<RitualGreeting>` continua acima do conteúdo do step** — passa para dentro do `header` slot ou imediatamente como primeiro filho do conteúdo, decidir conforme o que `WizardStepScaffold` aceita (ver `CollaboratorProjectsStep` como referência). Preferência: manter `RitualGreeting` como primeiro nó do `children` para preservar a hierarquia visual atual da abertura, com o `WizardStepHeader` como cabeçalho do scaffold.
  - `footer`: `<WizardStepFooter primaryLabel="Começar" onPrimary={onContinue} />` (sem `showBack` — é o primeiro step; sem `showSkip`). Quando `hasNothing` for `true`, podemos manter o `onPrimary` ainda como "Começar" levando ao próximo (ou desabilitar — escolha: **manter habilitado** seguindo o comportamento atual do `onStart`).
- `children`: substituir por
  ```tsx
  <div className="p-4 md:p-6 space-y-6 min-w-0 max-w-full">
    <RitualGreeting ... />
    {hasNothing ? <EmptyState/> : (
      <>
        <CollaboratorSnapshot ... />
        <CollaboratorCheckinTrail steps={trailSteps} />
      </>
    )}
  </div>
  ```
  Sem `max-w-3xl` → ocupa toda a largura disponível, idêntico aos demais steps.

### 2. `CollaboratorCheckinTrail.tsx` — desacoplar CTA

- Tornar `onStart` opcional (`onStart?: () => void`).
- Quando `onStart` **não** for passado, **não renderizar** o `<Button>` "Começar" nem o flex container do rodapé interno; exibir somente a linha de "Tempo estimado".
- Manter retrocompatibilidade: outros consumidores que ainda passem `onStart` continuam funcionando (segundo `rg`, hoje só `CollaboratorContextStep` usa, então o impacto é zero, mas a API fica preservada).

Em `CollaboratorContextStep` deixamos de passar `onStart` — o CTA passa a viver no `WizardStepFooter`.

### 3. Sem novos componentes

- Reusa `WizardStepScaffold`, `WizardStepHeader`, `WizardStepFooter` já centralizados em `src/modules/okrs/components/wizards/shared/`.
- Sem alterar `CollaboratorSnapshot`, `RitualGreeting`, `CollaboratorCheckinPage` (a prop `onContinue` já é repassada como antes).

### 4. Conformidade com o pré-checklist (TCR / docs canônicos)

- **Identidade/RBAC**: nenhuma alteração — apenas UI do step.
- **BU isolation / RLS**: não tocadas.
- **Query keys / Supabase**: não tocadas.
- **Memoization**: `CollaboratorCheckinTrail` continua exportada via `memo`; nenhum componente novo de lista é criado.
- **SSOT de wizards** (`mem://architecture/wizards/wizards-master-standard` + `mem://ui/wizards/wizard-shell-mobile-standard`): a mudança **aproxima** o Step 1 do padrão (Scaffold + Header + Footer), o que é exatamente o que o standard pede.

## Arquivos editados

- `src/modules/okrs/components/wizards/collaborator/CollaboratorContextStep.tsx` (envolver em scaffold + footer, remover `max-w-3xl`).
- `src/modules/okrs/components/wizards/collaborator/CollaboratorCheckinTrail.tsx` (tornar `onStart` opcional; só renderiza CTA quando recebido).

## Validação

- Visual no preview em `/rituals/collaborator-checkin?user=…`: Step 1 deve ocupar toda a largura, com cabeçalho fixo no topo e botão "Começar" no `WizardStepFooter` no rodapé, idêntico ao layout dos Steps de Projetos / Iniciativas / Decisões.
- Clique em "Começar" deve continuar avançando para o Step 2 (`onContinue`).
- Estado `hasNothing` continua exibindo o `EmptyState` central, agora também em largura total, com o footer "Começar" disponível.
