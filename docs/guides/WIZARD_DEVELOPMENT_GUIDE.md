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

> ⚠️ **Regra de Ouro:** Todo wizard de check-in ou gestão DEVE incluir insights contextuais.
> Wizards sem insights são "termômetros" — não agregam inteligência.

---

## 2. Arquitetura Padrão

Todo wizard segue a estrutura:

```
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
```

---

## 3. Componentes Obrigatórios

### 3.1 Shell e Navegação

| Componente | Arquivo | Uso |
|------------|---------|-----|
| `FullPageWizardShell` | `wizards/shared/FullPageWizardShell.tsx` | Layout full-page com header e navegação |
| `WizardStepper` | `wizards/shared/WizardStepper.tsx` | Navegação entre passos |
| `WizardStepHeader` | `wizards/shared/WizardStepHeader.tsx` | Cabeçalho padronizado de passo |
| `WizardStepFooter` | `wizards/shared/WizardStepFooter.tsx` | Botões de navegação |

### 3.2 Insights (OBRIGATÓRIO)

| Componente | Arquivo | Uso |
|------------|---------|-----|
| `KrStateInsightCard` | `components/insights/KrStateInsightCard.tsx` | Insight baseado em estado de KR |
| `KrStateInline` | `components/insights/KrStateInsightCard.tsx` | Indicador inline de estado |
| `VicInsightCard` | `wizards/shared/VicInsightCard.tsx` | Insight gerado por IA |
| `VicInsightsList` | `wizards/shared/VicInsightCard.tsx` | Lista de insights colapsável |

### 3.3 Reflexão Guiada

| Componente | Arquivo | Uso |
|------------|---------|-----|
| `ReflectionQuestions` | `wizards/shared/ReflectionQuestions.tsx` | Perguntas contextuais |
| `MicrocopyQuestion` | `wizards/shared/ReflectionQuestions.tsx` | Pergunta individual inline |

---

## 4. Integração com Estados de KR

### 4.1 Hook Centralizado

```typescript
import { 
  calculateKrState, 
  KR_STATE_CONFIG 
} from '@/modules/okrs/hooks/useKrStateInsights';

// Em cada passo que exibe KRs:
const krState = calculateKrState({
  progress: kr.progress,
  status: kr.status,
  daysSinceCheckin: kr.days_since_checkin,
  cycleEnded: false,
});

// Acessar configuração visual e textual
const config = KR_STATE_CONFIG[krState];
console.log(config.label);           // "Em Risco"
console.log(config.guidingQuestion); // "Decisão necessária?"
```

### 4.2 Estados Reconhecidos

| Estado | Condição | Insight | Severidade |
|--------|----------|---------|------------|
| `not_started` | progress = 0 | "O foco está claro?" | info |
| `healthy` | Progresso conforme esperado | "Manter execução" | info |
| `stagnant` | 14+ dias sem check-in | "O que está travando?" | warning |
| `at_risk` | RAG yellow | "Decisão necessária?" | warning |
| `off_track` | RAG red | "Replanejar?" | critical |
| `achieved` | progress = 100% | "Algum aprendizado?" | info |
| `exceeded` | progress > 100% | "O que aprendemos?" | info |
| `not_achieved` | Ciclo encerrado + <100% | "Meta, plano ou execução?" | warning |

### 4.3 Exibindo Insights por Estado

```tsx
import { 
  KrStateInsightCard, 
  calculateKrState 
} from '@/modules/okrs/components/insights';

function MyWizardStep({ kr }) {
  const state = calculateKrState({
    progress: kr.progress,
    status: kr.status,
    daysSinceCheckin: kr.days_since_checkin,
    cycleEnded: false,
  });

  return (
    <div>
      <h3>{kr.title}</h3>
      <KrStateInsightCard 
        state={state} 
        krTitle={kr.title}
        showGuidingQuestion={true}
      />
    </div>
  );
}
```

---

## 5. Checklist Obrigatório para Novos Wizards

| # | Item | Obrigatório |
|---|------|-------------|
| 1 | Usar `FullPageWizardShell` para layout | ✅ |
| 2 | Cada passo tem `WizardStepHeader` | ✅ |
| 3 | Calcular e exibir estado das KRs (`calculateKrState`) | ✅ |
| 4 | Exibir insights contextuais por estado | ✅ |
| 5 | Oferecer perguntas de reflexão guiadas | ✅ |
| 6 | Usar `VicInsightCard` ou `KrStateInsightCard` | ✅ |
| 7 | Integrar com agentes Vic quando aplicável | Recomendado |
| 8 | Não usar insights para avaliação/punição | ✅ |

---

## 6. Wizards Existentes (Referência)

| Wizard | Persona | Arquivo | Insights |
|--------|---------|---------|----------|
| Collaborator Check-in | Colaborador | `CollaboratorCheckinPage.tsx` | ✅ KR State |
| Leader Prep | Líder | `LeaderPrepPage.tsx` | ✅ Highlights + Vic |
| Team Check-in | Time | `TeamCheckinPage.tsx` | ✅ Decision-focused |
| Managers Check-in | Gestores | `ManagersCheckinPage.tsx` | ✅ Cross-team |
| C-Level Check-in | Direção | `CLevelCheckinPage.tsx` | ✅ Strategic signals |
| Team OKR Creation | Líder | `TeamOkrCreationPage.tsx` | ✅ Retrospective |
| Team KR Creation | Líder | `TeamKrCreationPage.tsx` | ✅ Alignment |

---

## 7. Anti-patterns em Wizards

| # | Anti-pattern | Alternativa |
|---|--------------|-------------|
| 1 | Wizard sem insights | Adicionar `KrStateInsightCard` |
| 2 | Insight punitivo | Reescrever com tom de aprendizado |
| 3 | Comparação entre usuários | Focar em padrões, não pessoas |
| 4 | Insights genéricos | Usar contexto específico da KR |
| 5 | Criar componentes duplicados | Usar componentes canônicos |
| 6 | Hardcode de cores | Usar tokens semânticos |

---

## 8. Integração com Agentes de IA

### 8.1 Contexto para Agentes

Ao invocar o Vic, incluir estado da KR no contexto:

```typescript
const vicContext = {
  type: 'wizard-collaborator',
  krContext: {
    krId: kr.id,
    krTitle: kr.title,
    progress: kr.progress,
    status: kr.status,
    state: calculateKrState({ ... }), // Estado calculado
    daysSinceCheckin: kr.days_since_checkin,
  },
};
```

### 8.2 Action Contexts Disponíveis

| Action Context | Uso |
|----------------|-----|
| `okr-check-alignment` | Validar alinhamento de OKR |
| `okr-review-quality` | Revisar qualidade de check-in |
| `okr_state_analysis` | Analisar estado e sugerir ações |

---

## 9. Princípios Culturais

### SEMPRE:
- Foco em aprendizado
- Insights acionáveis
- Contexto específico
- Tom positivo

### NUNCA:
- Comparação entre pessoas
- Rankings ou scores individuais
- Tom punitivo
- Insights genéricos

---

## 10. Utilitários Disponíveis

### Funções do Hook `useKrStateInsights`

| Função | Descrição |
|--------|-----------|
| `calculateKrState(params)` | Calcula estado baseado em progress, status, etc. |
| `getKrStateConfig(state)` | Retorna configuração visual/textual |
| `groupKrStatesBySeverity(items)` | Agrupa por severidade (critical/warning/info) |
| `filterKrsRequiringAttention(items)` | Filtra KRs que precisam de atenção |
| `filterKrsForCelebration(items)` | Filtra KRs para celebração |
| `sortByStatePriority(items)` | Ordena por prioridade de estado |

---

## Changelog

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0.0 | 2026-02-04 | Criação inicial com padrões de insights |

---

*Documento mantido pela equipe de Engenharia. Atualizações devem ser refletidas no TCR.*
