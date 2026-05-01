## Objetivo

1. Criar **saudação contextual** compartilhada no Step 1 de todos os ritos (exceto Criação de OKRs).
2. Redesenhar o Step 1 do **Check-in Individual**, transformando-o de "dashboard de tarefas" em "abertura ritual": **snapshot visual** + **trilha de etapas** + único CTA "Começar".
3. Mover a lista operacional de KPIs do Step 1 para o Step 2 (Indicadores).

## Pré-checklist consultado

- TCR §4.8 (Collaborator Check-in) e §4.8.1 (Wizards Framework)
- `WIZARDS_FRAMEWORK_BOUNDARY.md` (SSOT de labels via `RITUAL_LABELS` em `ritualLabels.ts`)
- `IDENTITY_CONVENTION.md` (uso de `useIdentity` para nome do usuário)
- `QUERY_KEYS_STANDARD.md` (helpers em `src/lib/queryKeys/*`)
- `UI_COMPONENTS_REGISTRY.md` (não duplicar `WizardStepHeader`, `WizardStepScaffold`, `LastCheckinBadge`, `KpiContextSection`)

Nada do que será criado já existe; o plano **estende** componentes shared existentes em vez de reescrevê-los.

---

## Parte 1 — Saudação contextual (todos os ritos, exceto criação)

### Componente novo (compartilhado)
`src/modules/okrs/components/wizards/shared/RitualGreeting.tsx`

Props:
- `userName: string`
- `ritualSlug: WizardPersona` (tipo já existente)
- `cycleId?: string` / `cycleName?: string`
- `cadence: 'weekly' | 'monthly' | 'quarterly'` (driver dos badges)
- `weekNumber?: number`, `checkInOrdinal?: number` (semanais)
- `monthName?: string`, `monthInQuarter?: number` (mensais)
- `closingCycleName?: string`, `openingCycleName?: string` (trimestrais)

Comportamento:
- Saudação por hora local (`< 12 / < 18 / else`).
- Frase contextual via lookup em **uma constante SSOT** nova: `RITUAL_GREETING_PHRASES` em `src/modules/okrs/constants/ritualLabels.ts` (mesmo SSOT já normativo dos labels). Sem `if/else` por slug dentro do componente.
- Badges renderizados conforme `cadence`.
- Sem CTAs, sem lógica de dados — componente puramente apresentacional.

### Hook auxiliar (cálculos contextuais)
`src/modules/okrs/hooks/useRitualGreetingContext.ts`

Centraliza:
- `weekNumber` e `monthInQuarter` a partir do ciclo ativo (helpers já existem em `src/lib/cycles/*` — checar antes de criar).
- `checkInOrdinal` por usuário via query (`okr_checkins` ou tabela equivalente já usada em outros badges); aproveita query keys já existentes (`queryKeys.okrs.userCheckins…`) — adiciona helper se faltar.
- Retorna o objeto pronto para alimentar `<RitualGreeting>`.

Cada Step 1 chama o hook e passa o resultado, sem lógica condicional na UI.

### Integração em cada rito (Step 1)

Substituir o cabeçalho atual do **primeiro step** de:

| Rito | Step 1 atual | Cadência |
|---|---|---|
| Check-in Individual | `CollaboratorContextStep` | weekly |
| Pré-Check-in do Time | `LeaderOverviewStep` | weekly |
| Check-in do Time | `TeamOpeningStep` | weekly |
| Pré-Weekly | `PreWeeklySourcesStep` | weekly |
| Weekly | `WeeklyExecutiveOpeningStep` | weekly |
| Pré-MBR | `MbrPreHighlightsStep` | monthly |
| MBR | `MbrPanoramaStep` | monthly |
| Pré-QBR | `QbrBalanceStep` | quarterly |
| Pré-QBR Executivo | `QbrCLevelSystemReadStep` | quarterly |
| QBR | `QbrMeetingOpeningStep` | quarterly |
| Pós-QBR | `QbrPostMinutesStep` | quarterly |

Excluído: wizards de Criação (`team-okr-creation`, `team-kr-creation`, `clevel-checkin` do C-Level Directives — confirmar com base em escopo).

Em cada Step 1: remover títulos institucionais antigos e renderizar `<RitualGreeting>` no topo. Manter o resto do conteúdo do step intacto.

---

## Parte 2 — Redesenho do Step 1 do Check-in Individual

Arquivo principal: `CollaboratorContextStep.tsx` é refatorado para conter apenas:
1. `<RitualGreeting cadence="weekly" />`
2. `<CollaboratorSnapshot>` (novo)
3. `<CollaboratorCheckinTrail>` (novo)
4. Botão único "Começar →" (já existe; reusa `Button`)

Toda a lista de KPIs/KRs visual atual sai daqui.

### Componentes novos (específicos do Check-in Individual)

**`src/modules/okrs/components/wizards/collaborator/CollaboratorSnapshot.tsx`**
- Props: `krs`, `kpisToUpdate`, `projects`, `openBlocksCount`, `avgConfidence`.
- Renderiza 3 linhas com label + bolinhas (componente `<DotMeter>` interno reusável) + texto resumo.
- Cores: preenchida = `bg-primary`, vazia = `bg-muted`. Sem RAG.
- Linha de sinais condicional: só renderiza bloqueios > 0 ou confiança ≠ alta.
- Sem CTAs, sem lista de itens nominais.

**`src/modules/okrs/components/wizards/collaborator/CollaboratorCheckinTrail.tsx`**
- Props: `steps: TrailStep[]` onde cada item tem `index`, `label`, `summary`, `etaMinutes`, `onStart` no rodapé (único CTA).
- Cálculo de tempo (regra do prompt) feito por helper puro `computeTrailEta()` exportado para testes.
- Quando uma etapa não tem pendência: mostra "Tudo em dia".

### Origem dos dados
- `krs`, `kpisToUpdate`, `projects` já vêm de `CollaboratorCheckinPage.tsx` (props existentes do step).
- `openBlocksCount` e `avgConfidence`: derivar dos check-ins anteriores do usuário; usar hook existente (`useCollaboratorPendingItems` ou equivalente) — se não bastar, adicionar `useCollaboratorOpeningSignals` em `src/modules/okrs/hooks/`.

### Migração da lista de KPIs para o Step 2
- Step 2 atual = `CollaboratorKpiStep`. Hoje recebe `kpisToUpdate` mas a UI rica (gradient, badges de status, agrupamento) vive no Step 1.
- Mover o bloco visual `KpiContextSection` (variant `update`) e demais seções de "Indicadores do Time" / "Indicadores Estratégicos" para `CollaboratorKpiStep`.
- Step 1 não mais importa `KpiContextSection`.

### Critérios de preservação
- Steps 2–7 inalterados em lógica, apenas Step 2 ganha conteúdo movido.
- Sem mudanças em RLS, salvamento de rascunho, navegação do `WizardStepper` ou permissões.
- Testes existentes de `CollaboratorContextStep` precisam ser atualizados (snapshot, ausência de lista) — manter cobertura, atualizar expectativas.

---

## Parte 3 — Memória / docs

- Atualizar `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` §4.8 com nota: "Step 1 do Collaborator Check-in segue padrão de abertura ritual (snapshot + trilha) e usa `RitualGreeting`".
- Criar memória `mem://standards/ui/ritual-greeting-standard` (SSOT do componente, frases e badges por cadência).
- Atualizar `mem://index.md` apontando para a nova memória.

---

## Detalhes técnicos

### Estrutura de arquivos
```text
src/modules/okrs/components/wizards/shared/
  └── RitualGreeting.tsx              [novo - compartilhado]

src/modules/okrs/components/wizards/collaborator/
  ├── CollaboratorContextStep.tsx     [refatorado - enxuto]
  ├── CollaboratorSnapshot.tsx        [novo]
  ├── CollaboratorCheckinTrail.tsx    [novo]
  └── CollaboratorKpiStep.tsx         [recebe seções migradas]

src/modules/okrs/constants/
  └── ritualLabels.ts                 [+ RITUAL_GREETING_PHRASES]

src/modules/okrs/hooks/
  └── useRitualGreetingContext.ts     [novo]

src/lib/queryKeys/okrs.ts             [+ helper de ordinal de check-in se faltar]
```

### Atualizações em ritos (apenas substituição de header)
- 11 arquivos de Step 1 listados acima passam a renderizar `<RitualGreeting>` no topo, sem alterar lógica de negócio.

### Não-objetivos
- Não tocar nos wizards de criação de OKRs.
- Não alterar lógica de cálculo de status/health/efetividade — apenas leitura.
- Não criar novos endpoints ou edge functions.

## Perguntas residuais (responder durante implementação se ambíguo)
- Caso `useIdentity` não retorne `first_name`, usar `display_name` truncado no primeiro espaço.
- Se o usuário nunca teve check-in no ciclo, ordinal vira "Primeiro check-in do ciclo" (texto fixo).