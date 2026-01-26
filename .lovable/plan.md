
# Plano: Integração do Agente "Validador Metodológico de OKRs"

## Resumo Executivo

O agente **"Validador Metodológico de OKRs"** já existe no banco de dados (`ai_agents.id: 8027de04-b987-45b6-9ce6-16296860e6b3`) mas ainda **não possui slug** e não está integrado ao frontend.

Este plano substitui o uso do `coach-okrs` pelo novo agente `validador-metodologico-okrs` em todos os contextos de **criação e validação de OKRs**.

---

## 1. Análise de Pré-requisitos Consultados

| Documento | Versão | Status |
|-----------|--------|--------|
| TCR | v2.74.0 | ✅ Consultado |
| IDENTITY_CONVENTION | v2.1.1 | ✅ Consultado |
| DATA_MODEL_REGISTRY | v2.51.0 | ✅ Consultado |
| DEVELOPMENT_STANDARDS | v1.17.0 | ✅ Consultado |

---

## 2. Estado Atual

### Agente no Banco de Dados
```
id: 8027de04-b987-45b6-9ce6-16296860e6b3
name: "Validador Metodológico de OKRs"
slug: NULL (precisa definir)
is_active: true
model_name: gpt-4o-mini
```

### Uso Atual do `coach-okrs` em Contextos de Criação

| Arquivo | Contexto | Linha |
|---------|----------|-------|
| `types.ts` | VicAgentSlug type | 5 |
| `ask-to-vic.ts` | WIZARD_AGENT_MAP (creation) | 322-329 |
| `ask-to-vic.ts` | MODULE_AGENT_MAP | 370 |
| `useAskToVic.ts` | Fallback agent | 34 |
| `useWizardAI.ts` | Default agent | 125 |
| `TeamOkrIntroStep.tsx` | Greeting | 88 |
| `TeamOkrObjectiveStep.tsx` | Validação objetivo | 97 |
| `TeamOkrShareStep.tsx` | Reflection questions | 104 |
| `TeamOkrSharingStep.tsx` | VicActionButton | 435 |
| `useInitiativeNameValidation.ts` | Initiative validation | 94 |
| `okr-construction-review` edge fn | Team analysis | 423, 534 |
| `OkrConstructionReviewPage.tsx` | Alignment handler | 96 |
| `TeamObjectiveCard.tsx` | Improve dropdown | 171 |
| `TeamObjectiveFormFields.tsx` | Improve button | 238 |
| `agent-loader.ts` | Slug mapping | 31 |

---

## 3. Plano de Implementação

### Fase 1: Atualizar Slug no Banco de Dados

**Arquivo:** Nova migration SQL

**SQL:**
```sql
-- Define o slug do novo agente
UPDATE public.ai_agents 
SET slug = 'validador-metodologico-okrs' 
WHERE id = '8027de04-b987-45b6-9ce6-16296860e6b3';
```

---

### Fase 2: Atualizar Types do Frontend

**Arquivo:** `src/modules/vic/types.ts`

**Alterações:**
1. Adicionar `validador-metodologico-okrs` ao type `VicAgentSlug`
2. Adicionar metadata do agente no `VIC_AGENTS`

```typescript
export type VicAgentSlug =
  | "cultura"
  | "coach-okrs"
  | "validador-metodologico-okrs" // NOVO
  | "analista-kpis"
  // ...

export const VIC_AGENTS: Record<VicAgentSlug, { name: string; description: string; icon: string }> = {
  // ...
  "validador-metodologico-okrs": {
    name: "Validador Metodológico de OKRs",
    description: "Avalia aderência metodológica de OKRs já escritos",
    icon: "ClipboardCheck",
  },
  // ...
};
```

---

### Fase 3: Atualizar Mapeamento de Wizards

**Arquivo:** `src/modules/vic/types/ask-to-vic.ts`

**Alterações no `WIZARD_AGENT_MAP`:**
- Substituir `coach-okrs` por `validador-metodologico-okrs` nos steps de **criação** do wizard `creation`
- Manter `coach-okrs` para steps de check-in (onde o coaching ainda faz sentido)

```typescript
export const WIZARD_AGENT_MAP: Record<OkrWizardType, Record<string, VicAgentSlug>> = {
  'creation': {
    'intro': 'onboarding-buddy',
    'context': 'analista-kpis',
    'retrospective': 'analista-kpis',
    'objective': 'validador-metodologico-okrs',     // ALTERADO
    'sharing': 'alinhamento-estrategico',
    'kr-type': 'validador-metodologico-okrs',       // ALTERADO
    'kr-detail': 'validador-metodologico-okrs',     // ALTERADO
    'dependencies': 'alinhamento-estrategico',
    'initiatives': 'validador-metodologico-okrs',   // ALTERADO
    'share': 'revisor-comunicacao',
    'default': 'validador-metodologico-okrs',       // ALTERADO
  },
  // ... outros wizards mantidos
};
```

**Alterações no `MODULE_AGENT_MAP`:**
- Manter `coach-okrs` como padrão do módulo (para contextos gerais)
- A orquestração por wizard/step já usa o validador nos contextos certos

---

### Fase 4: Atualizar Wizard Components

**4.1 `TeamOkrIntroStep.tsx` (linha 88)**
- Trocar `coach-okrs` → `validador-metodologico-okrs`

```typescript
const greetingResponse = await invokeVic(
  'validador-metodologico-okrs', // ALTERADO
  'okr-create-objective',
  { type: 'wizard-intro', additionalData: { userName, teamName } },
  'Gere uma saudação breve e calorosa para um líder que vai criar OKRs.',
  { silent: true }
);
```

**4.2 `TeamOkrObjectiveStep.tsx` (linha 97)**
- Trocar `coach-okrs` → `validador-metodologico-okrs`

```typescript
const response = await invokeVic(
  'validador-metodologico-okrs', // ALTERADO
  'okr-review-quality',
  // ...
);
```

**4.3 `TeamOkrShareStep.tsx` (linha 104)**
- Trocar `coach-okrs` → `validador-metodologico-okrs`

**4.4 `TeamOkrSharingStep.tsx` (linha 435)**
- Trocar `agentSlug="coach-okrs"` → `agentSlug="validador-metodologico-okrs"`

---

### Fase 5: Atualizar Hooks de Validação

**5.1 `useInitiativeNameValidation.ts` (linha 94)**
- Trocar `coach-okrs` → `validador-metodologico-okrs`

```typescript
const response = await invoke(
  'validador-metodologico-okrs', // ALTERADO
  'okr-initiative-review',
  // ...
);
```

**5.2 `useWizardAI.ts` (linha 125)**
- Trocar default de `coach-okrs` → `validador-metodologico-okrs`

```typescript
let agentSlug: VicAgentSlug = 'validador-metodologico-okrs'; // ALTERADO
if (persona === 'managers-checkin' || persona === 'clevel-checkin') {
  agentSlug = 'alinhamento-estrategico';
}
```

---

### Fase 6: Atualizar Edge Function de Construction Review

**Arquivo:** `supabase/functions/okr-construction-review/index.ts`

**6.1 Linha 423 (team-analysis mode):**
```typescript
body: JSON.stringify({
  buId,
  agentSlug: "validador-metodologico-okrs", // ALTERADO
  actionContext: "okr_team_analysis",
  // ...
}),
```

**6.2 Linha 534 (objective mode):**
```typescript
body: JSON.stringify({
  buId,
  agentSlug: "validador-metodologico-okrs", // ALTERADO
  actionContext: "okr_construction_review",
  // ...
}),
```

---

### Fase 7: Atualizar Agent Loader

**Arquivo:** `supabase/functions/_shared/agent-loader.ts` (linha 29-37)

```typescript
const AGENT_SLUGS: Record<string, string> = {
  cultura: "Guardião da Cultura",
  "coach-okrs": "Coach de OKRs",
  "validador-metodologico-okrs": "Validador Metodológico de OKRs", // NOVO
  "analista-kpis": "Analista de KPIs",
  // ...
};
```

---

### Fase 8: Atualizar Página de Construction Review

**Arquivo:** `src/modules/okrs/pages/OkrConstructionReviewPage.tsx`

**8.1 Linha 96 (handleAskVicAboutAlignment):**
```typescript
openPanel({
  agentSlug: 'validador-metodologico-okrs', // ALTERADO
  actionContext: 'okr-check-alignment',
  // ...
});
```

**8.2 Linha 120 (handleAskVicAboutCollaboration):**
```typescript
openPanel({
  agentSlug: 'validador-metodologico-okrs', // ALTERADO
  actionContext: 'okr-overview-insights',
  // ...
});
```

---

### Fase 9: Atualizar Componentes de Edição

**9.1 `TeamObjectiveCard.tsx` (linha 171)**
```typescript
openPanel({
  agentSlug: "validador-metodologico-okrs", // ALTERADO
  actionContext: "okr-review-quality",
  // ...
});
```

**9.2 `TeamObjectiveFormFields.tsx` (linha 238)**
```typescript
<VicActionButton
  agentSlug="validador-metodologico-okrs" // ALTERADO
  actionContext="okr-create-objective"
  // ...
/>
```

---

### Fase 10: Atualizar useAskToVic

**Arquivo:** `src/modules/vic/hooks/useAskToVic.ts` (linha 34)

**Decisão:** Manter `coach-okrs` como fallback geral porque:
- O validador é específico para contextos de criação/validação
- Contextos gerais (dashboard, check-ins) ainda usam o coach

O WIZARD_AGENT_MAP já sobrescreve para os contextos certos.

---

## 4. Arquivos Modificados/Criados

| Arquivo | Operação | Propósito |
|---------|----------|-----------|
| `supabase/migrations/YYYYMMDD_add_validador_slug.sql` | Criar | Define slug do agente |
| `src/modules/vic/types.ts` | Modificar | Adicionar type e metadata |
| `src/modules/vic/types/ask-to-vic.ts` | Modificar | Atualizar mapeamentos |
| `src/modules/vic/hooks/useAskToVic.ts` | Manter | Fallback continua coach-okrs |
| `src/modules/okrs/hooks/useWizardAI.ts` | Modificar | Trocar default |
| `src/modules/okrs/hooks/useInitiativeNameValidation.ts` | Modificar | Trocar agente |
| `src/modules/okrs/components/wizards/team-okr-creation/TeamOkrIntroStep.tsx` | Modificar | Trocar agente |
| `src/modules/okrs/components/wizards/team-okr-creation/TeamOkrObjectiveStep.tsx` | Modificar | Trocar agente |
| `src/modules/okrs/components/wizards/team-okr-creation/TeamOkrShareStep.tsx` | Modificar | Trocar agente |
| `src/modules/okrs/components/wizards/team-okr-creation/TeamOkrSharingStep.tsx` | Modificar | Trocar agente |
| `src/modules/okrs/pages/OkrConstructionReviewPage.tsx` | Modificar | Trocar agente |
| `src/modules/okrs/components/TeamObjectiveCard.tsx` | Modificar | Trocar agente |
| `src/modules/okrs/components/team-objective-form/TeamObjectiveFormFields.tsx` | Modificar | Trocar agente |
| `supabase/functions/okr-construction-review/index.ts` | Modificar | Trocar agente |
| `supabase/functions/_shared/agent-loader.ts` | Modificar | Adicionar mapeamento |

---

## 5. O que NÃO muda

O agente `coach-okrs` continua sendo usado em:

| Contexto | Justificativa |
|----------|---------------|
| Dashboard (VicCard.tsx) | Análise geral de OKRs, não validação metodológica |
| Check-ins de time/colaborador | Foco em acompanhamento, não validação de construção |
| Fallback geral do módulo OKRs | Contextos não mapeados |

---

## 6. Diferença Conceitual

| Agente | Papel | Quando Usar |
|--------|-------|-------------|
| **Coach de OKRs** | Ajuda a **pensar e construir** | Brainstorming, check-ins, coaching |
| **Validador Metodológico** | **Valida** o que foi construído | Criação de OKRs, construction review |

Esta separação está alinhada com o prompt do Validador:
> "O Coach de OKRs ajuda a pensar e construir. Você valida o que foi construído."

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Agente não ativado em alguma BU | Média | Médio | Fallback para coach-okrs no frontend |
| Prompt do validador muito rigoroso | Baixa | Baixo | Ajustar prompt via admin se necessário |
| Cache de agente stale | Baixa | Baixo | TTL de 60s já implementado |

---

## 8. Compatibilidade

| Padrão | Status |
|--------|--------|
| TCR v2.74.0 | ✅ Compatível |
| DEVELOPMENT_STANDARDS v1.17.0 | ✅ Seguido |
| Vic Module Pattern | ✅ Compatível |

---

## 9. Ordem de Execução

1. **Migration SQL** — Definir slug do agente no banco
2. **Types** — Adicionar ao VicAgentSlug e VIC_AGENTS
3. **Agent Loader** — Adicionar mapeamento de slug
4. **Ask-to-Vic types** — Atualizar WIZARD_AGENT_MAP
5. **Hooks** — useWizardAI, useInitiativeNameValidation
6. **Wizard Components** — TeamOkrIntroStep, ObjectiveStep, ShareStep, SharingStep
7. **Edge Function** — okr-construction-review
8. **Pages** — OkrConstructionReviewPage
9. **Components** — TeamObjectiveCard, TeamObjectiveFormFields

---

## 10. Validação Pós-Implementação

Cenários de teste:

1. ✅ Wizard de criação de OKRs usa validador metodológico
2. ✅ Página /construction-review usa validador metodológico
3. ✅ Dropdown "Melhorar" em objetivo usa validador metodológico
4. ✅ Dashboard VicCard continua usando coach-okrs
5. ✅ Check-ins continuam usando coach-okrs
6. ✅ Fallback funciona se agente não estiver ativado na BU
