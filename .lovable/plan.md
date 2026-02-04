

# Plano: Documentação de Padrões de Insights para Wizards

## 1. Contexto

O Hub já possui **6 componentes de insights** espalhados pelo código, mas não há documentação normativa sobre **quando e como usar insights em novos wizards**. Isso cria risco de:
- Novos wizards serem criados sem insights
- Padrões inconsistentes entre módulos
- Perda da inteligência de gestão que o sistema poderia oferecer

## 2. Objetivo

1. **Documentar padrões canônicos** de uso de insights
2. **Criar checklist obrigatório** para desenvolvimento de novos wizards
3. **Registrar componentes existentes** para reaproveitamento

---

## 3. Alterações Propostas

### 3.1 Atualizar `docs/canonical/UI_COMPONENTS_REGISTRY.md`

Adicionar **nova seção "Componentes de Insights"**:

```markdown
## 10. Componentes de Insights

### 10.1 Filosofia

Insights são sinais contextuais de gestão que ajudam usuários a:
- Identificar padrões relevantes
- Tomar decisões informadas
- Aprender com o histórico

**Regra:** Todo wizard e dashboard com dados de OKRs/KPIs DEVE incluir insights contextuais.

### 10.2 Componentes Disponíveis

| Componente | Arquivo | Uso |
|------------|---------|-----|
| `VicInsightCard` | `src/modules/okrs/components/wizards/shared/VicInsightCard.tsx` | Insight individual de IA |
| `VicInsightsList` | Mesmo arquivo | Lista de insights colapsável |
| `KrStateInsightCard` | `src/modules/okrs/components/insights/KrStateInsightCard.tsx` | Insight baseado em estado de KR |
| `OrgViewInsights` | `src/modules/okrs/components/org-view/OrgViewInsights.tsx` | Insights de objetivo organizacional |

### 10.3 Padrão de Uso em Wizards

Todo wizard de OKRs DEVE:
1. Calcular estado das KRs usando `calculateKrState()`
2. Exibir insights contextuais via `KrStateInsightCard` ou `VicInsightCard`
3. Oferecer reflexões guiadas baseadas no estado

Exemplo:
\`\`\`tsx
import { calculateKrState, KrStateInsightCard } from '@/modules/okrs/components/insights';

const krState = calculateKrState({
  progress: kr.progress,
  status: kr.status,
  daysSinceCheckin: kr.days_since_checkin,
  cycleEnded: false,
});

<KrStateInsightCard state={krState} kr={kr} />
\`\`\`
```

### 3.2 Atualizar `docs/canonical/DEVELOPMENT_STANDARDS.md`

Adicionar **nova seção "O. Wizards e Ritos de Gestão"**:

```markdown
## O. Wizards e Ritos de Gestão

### O.1 Regra de Ouro para Wizards

> ⚠️ **Todo wizard de check-in ou gestão DEVE incluir insights contextuais.**
> Wizards sem insights são "termômetros" — não agregam inteligência.

### O.2 Checklist Obrigatório para Novos Wizards

| # | Item | Obrigatório |
|---|------|-------------|
| 1 | Calcular e exibir estado das KRs (`calculateKrState`) | ✅ |
| 2 | Exibir insights contextuais por estado | ✅ |
| 3 | Oferecer perguntas de reflexão guiadas | ✅ |
| 4 | Integrar com agentes Vic quando aplicável | Recomendado |
| 5 | Usar `VicInsightCard` ou `KrStateInsightCard` | ✅ |
| 6 | Não usar insights para avaliação/punição | ✅ |

### O.3 Estados de KR Reconhecidos

| Estado | Condição | Insight |
|--------|----------|---------|
| `not_started` | progress = 0 | "O foco está claro?" |
| `healthy` | Progresso conforme esperado | "Manter execução" |
| `stagnant` | 14+ dias sem check-in | "O que está travando?" |
| `at_risk` | RAG yellow | "Decisão necessária?" |
| `off_track` | RAG red | "Replanejar?" |
| `achieved` | progress = 100% | "Algum aprendizado?" |
| `exceeded` | progress > 100% | "O que aprendemos?" |
| `not_achieved` | Ciclo encerrado + <100% | "Meta, plano ou execução?" |

### O.4 Anti-patterns em Wizards

| # | Anti-pattern | Alternativa |
|---|--------------|-------------|
| 1 | Wizard sem insights | Adicionar `KrStateInsightCard` |
| 2 | Insight punitivo | Reescrever com tom de aprendizado |
| 3 | Comparação entre usuários | Focar em padrões, não pessoas |
| 4 | Insights genéricos | Usar contexto específico da KR |
```

### 3.3 Criar `docs/guides/WIZARD_DEVELOPMENT_GUIDE.md`

Novo documento normativo para desenvolvimento de wizards:

```markdown
# Guia de Desenvolvimento de Wizards — Hub da Jet

**Versão:** 1.0.0
**Status:** Normativo
**Referência:** TCR v2.84.0 / DEVELOPMENT_STANDARDS v1.18.0

---

## 1. Filosofia

Wizards no Hub não são apenas formulários — são **rituais de gestão** que:
- Guiam reflexão estruturada
- Geram aprendizado organizacional
- Alimentam memória estratégica

## 2. Arquitetura Padrão

Todo wizard segue a estrutura:

\`\`\`
src/modules/<module>/
├── pages/
│   └── <Wizard>Page.tsx          # Página full-page
├── components/
│   └── wizards/
│       └── <wizard-name>/
│           ├── index.ts          # Barrel export
│           ├── <Step1>Step.tsx   # Passos do wizard
│           └── <Step2>Step.tsx
└── hooks/
    └── use<Wizard>Draft.ts       # Persistência de rascunho
\`\`\`

## 3. Componentes Obrigatórios

### 3.1 Shell e Navegação

- Usar `FullPageWizardShell` para layout
- Usar `WizardStepper` para navegação entre passos
- Usar `WizardStepHeader` para cabeçalhos de passo
- Usar `WizardStepFooter` para navegação

### 3.2 Insights (OBRIGATÓRIO)

- Usar `useKrStateInsights` para calcular estados
- Usar `KrStateInsightCard` para exibir insights por estado
- Usar `VicInsightCard` para insights de IA
- Usar `VicInsightsList` para múltiplos insights

### 3.3 Reflexão Guiada

- Usar `ReflectionQuestions` para perguntas contextuais
- Personalizar perguntas baseadas no estado da KR
- Nunca usar tom punitivo

## 4. Integração com Estados de KR

\`\`\`typescript
import { calculateKrState, KR_STATE_CONFIG } from '@/modules/okrs/hooks/useKrStateInsights';

// Em cada passo que exibe KRs:
const krState = calculateKrState({
  progress: kr.progress,
  status: kr.status,
  daysSinceCheckin: kr.days_since_checkin,
  cycleEnded: false,
});

// Exibir insight contextual
const config = KR_STATE_CONFIG[krState];
<KrStateInsightCard state={krState} guidingQuestion={config.guidingQuestion} />
\`\`\`

## 5. Checklist de PR para Wizards

- [ ] Wizard usa `FullPageWizardShell`
- [ ] Cada passo tem `WizardStepHeader`
- [ ] Insights contextuais estão presentes
- [ ] Estados de KR são calculados e exibidos
- [ ] Perguntas de reflexão são contextuais
- [ ] Nenhum insight é punitivo
- [ ] Testes automatizados cobrem fluxo principal

## 6. Wizards Existentes (Referência)

| Wizard | Persona | Arquivo | Insights |
|--------|---------|---------|----------|
| Collaborator Check-in | Colaborador | `CollaboratorCheckinPage.tsx` | ✅ KR State |
| Leader Prep | Líder | `LeaderPrepPage.tsx` | ✅ Highlights + Vic |
| Team Check-in | Time | `TeamCheckinPage.tsx` | ✅ Decision-focused |
| Managers Check-in | Gestores | `ManagersCheckinPage.tsx` | ✅ Cross-team |
| C-Level Check-in | Direção | `CLevelCheckinPage.tsx` | ✅ Strategic signals |
| Team OKR Creation | Líder | `TeamOkrCreationPage.tsx` | ✅ Retrospective |

## 7. Princípios Culturais

**SEMPRE:**
- Foco em aprendizado
- Insights acionáveis
- Contexto específico
- Tom positivo

**NUNCA:**
- Comparação entre pessoas
- Rankings ou scores individuais
- Tom punitivo
- Insights genéricos
```

---

## 4. Atualização do TCR

Adicionar referência ao novo guia na seção de documentação do TCR:

```markdown
> ### Desenvolvimento de Wizards
> - [WIZARD_DEVELOPMENT_GUIDE.md](../guides/WIZARD_DEVELOPMENT_GUIDE.md) — **Guia obrigatório para novos wizards** ⭐
```

---

## 5. Criação do Hook `useKrStateInsights`

O hook centraliza a lógica de estados (já detalhado no plano anterior):

**Arquivo:** `src/modules/okrs/hooks/useKrStateInsights.ts`

Exportações principais:
- `KrState` — Tipo union dos 8 estados
- `KR_STATE_CONFIG` — Configurações visuais e textuais por estado
- `calculateKrState()` — Função para calcular estado
- `useKrStateInsights()` — Hook para buscar insights de uma KR

---

## 6. Criação do Componente `KrStateInsightCard`

Componente visual para exibir insight baseado em estado:

**Arquivo:** `src/modules/okrs/components/insights/KrStateInsightCard.tsx`

```tsx
export function KrStateInsightCard({
  state,
  kr,
  showGuidingQuestion = true,
}: KrStateInsightCardProps) {
  const config = KR_STATE_CONFIG[state];
  // Renderiza card com ícone, cor e pergunta guia
}
```

---

## 7. Barrel Export para Insights

**Arquivo:** `src/modules/okrs/components/insights/index.ts`

```typescript
export { KrStateInsightCard } from './KrStateInsightCard';
export { StateDistributionChart } from './StateDistributionChart';
export { calculateKrState, KR_STATE_CONFIG } from '@/modules/okrs/hooks/useKrStateInsights';
export type { KrState, KrStateConfig } from '@/modules/okrs/hooks/useKrStateInsights';
```

---

## 8. Resumo de Arquivos

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `docs/guides/WIZARD_DEVELOPMENT_GUIDE.md` | Guia normativo para wizards |
| `src/modules/okrs/hooks/useKrStateInsights.ts` | Hook de estados de KR |
| `src/modules/okrs/components/insights/index.ts` | Barrel export |
| `src/modules/okrs/components/insights/KrStateInsightCard.tsx` | Componente visual |

### Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `docs/canonical/UI_COMPONENTS_REGISTRY.md` | Adicionar seção 10 - Insights |
| `docs/canonical/DEVELOPMENT_STANDARDS.md` | Adicionar seção O - Wizards |
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | Adicionar referência ao guia |

---

## 9. Benefícios

1. **Padronização:** Todo novo wizard seguirá o mesmo padrão de insights
2. **Descobribilidade:** Desenvolvedores encontrarão os componentes facilmente
3. **Qualidade:** Checklist de PR garante conformidade
4. **Memória institucional:** Documentação sobrevive a turnover de equipe

---

## 10. Seção Técnica

### Estrutura de Pastas Final

```
src/modules/okrs/
├── components/
│   ├── insights/                 # NOVO - Componentes de insight
│   │   ├── index.ts
│   │   ├── KrStateInsightCard.tsx
│   │   └── StateDistributionChart.tsx
│   ├── wizards/
│   │   └── shared/
│   │       ├── VicInsightCard.tsx  # Já existe
│   │       └── ...
│   └── ...
├── hooks/
│   ├── useKrStateInsights.ts     # NOVO - Lógica de estados
│   └── ...
└── types/
    └── wizard.ts                 # Já existe (VicInsight, etc)
```

### Query Keys para Insights

```typescript
// Em src/lib/queryKeys/okrs.ts
insights: {
  byKr: (buId: string | null, krId: string | null) =>
    ['okrs', 'insights', 'kr', buId, krId] as const,
  byObjective: (buId: string | null, objectiveId: string | null) =>
    ['okrs', 'insights', 'objective', buId, objectiveId] as const,
  stateDistribution: (buId: string | null, teamId: string | null) =>
    ['okrs', 'insights', 'state-distribution', buId, teamId] as const,
},
```

