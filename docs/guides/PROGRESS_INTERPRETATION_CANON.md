# Governança de Interpretação de OKRs, KRs e KPIs

**Versão:** 2.0.0  
**Data:** 2026-02-07  
**Status:** ✅ Canônico  
**Trecho Oficial do TCR / Hub da Jetimob**

---

## 1. Objetivo

Estabelecer uma regra única, consistente e obrigatória para a interpretação de OKRs, KRs e KPIs em todo o Hub da Jetimob, garantindo leituras corretas de progresso ao longo do tempo e evitando análises distorcidas de metas de médio e longo prazo.

Este padrão se aplica a **todas as camadas do sistema**, incluindo:

- Wizards de gestão
- Dashboards narrativos
- E-mails automáticos (ex: resumo pós check-in)
- Relatórios
- Agentes de IA
- Insights e recomendações geradas automaticamente

---

## 2. Princípio Central

> **KPIs não têm significado isolado.**  
> **O tempo pertence à KR.**  
> **O progresso deve ser interpretado pelo ritmo do ciclo, não pela distância da meta final.**

O Hub **não é um sistema de cobrança**, e sim um **sistema de navegação estratégica**.

---

## 3. Definições Fundamentais

### 3.1 KPI (Key Performance Indicator)

- KPIs são **sinais contínuos**.
- **Não possuem ciclo próprio**.
- **Não devem** ser classificados isoladamente como "atrasados" ou "adiantados".

### 3.2 KR (Key Result)

- KRs são os elementos que **definem o ciclo temporal** (mensal, trimestral, anual).
- Toda interpretação de progresso **deve partir do ciclo da KR**.

### 3.3 OKR Organizacional, de Time ou Individual

- O nível do OKR define **prioridade contextual**, não regra temporal.
- A regra temporal **sempre vem da KR**.

---

## 4. Regra Canônica de Interpretação Temporal

### 4.1 Fonte do Ciclo

- O ciclo **sempre é herdado da KR**.
- KPIs vinculados a uma KR passam a ser interpretados dentro do ciclo daquela KR.

### 4.2 KPIs Vinculados a Múltiplas KRs

Quando um KPI estiver associado a mais de uma KR:

**Ordem de prioridade para interpretação:**
1. KR organizacional (quando o contexto for organizacional)
2. KR do time (quando o contexto for do time)
3. KR individual (quando o contexto for individual)

**Ordem de granularidade temporal:**
- Anual > Trimestral > Mensal

O Hub deve sempre escolher o **ciclo mais relevante** para o contexto da análise.

---

## 5. Avaliação por Ritmo (Obrigatória)

**É proibido** interpretar progresso apenas com base no valor final da meta.

Toda análise **deve considerar**:
- Quanto do ciclo já transcorreu
- Qual seria o progresso esperado até este ponto
- Qual é a tendência atual (aceleração, estabilidade, desaceleração)

### Classificações Permitidas

| Status | Descrição |
|--------|-----------|
| ✅ Acima do ritmo esperado | Progresso superior ao esperado para este ponto do ciclo |
| ✅ Dentro do ritmo esperado | Progresso compatível com o tempo transcorrido |
| ✅ Abaixo do ritmo esperado | Progresso inferior, com contexto temporal explícito |

### Classificações Proibidas

| Status | Motivo |
|--------|--------|
| ❌ "Atrasado" | Sem contexto temporal, implica falha |
| ❌ "Fracasso" | Julgamento prematuro e punitivo |
| ❌ Alertas negativos automáticos | Proibidos no início de ciclos longos |

---

## 6. Metas Acumulativas de Longo Prazo (Ex: Anuais)

Para metas acumulativas (ex: incremento anual de receita):

- A interpretação **deve ser proporcional** ao tempo decorrido.
- O sistema deve enfatizar:
  - **Ritmo de acumulação**
  - **Tendência**
  - **Consistência**

**É esperado que metas anuais:**
- Estejam distantes da meta final nos primeiros meses
- **Não disparem alertas negativos automáticos** por esse motivo

### Exemplo Prático

| Meta Anual | Resultado em Março | Ciclo Transcorrido | Progresso | Interpretação Correta |
|------------|--------------------|--------------------|-----------|------------------------|
| R$ 12.000.000 | R$ 2.500.000 | 25% | ~21% | "Ligeiramente abaixo do ritmo, mas dentro da margem esperada para o início do ciclo anual" |

**Interpretação ERRADA:** "Atrasado, apenas 21% da meta"

---

## 7. Aplicação em Comunicação e Relatórios

### 7.1 E-mails Automáticos (Resumo de Check-in)

Ao gerar e-mails automáticos:

1. **KPIs devem ser descritos com contexto temporal explícito**
   - Exemplo: "Dentro do ritmo esperado considerando o ciclo anual da KR."

2. **Iniciativas e textos escritos pela liderança:**
   - Devem ser resumidos e contextualizados
   - **Nunca** copiados literalmente sem curadoria

3. **Tarefas pendentes ou itens desatualizados:**
   - Só devem ser citados se houver vínculo direto com KRs ou KPIs críticos
   - Linguagem sempre **informativa**, nunca acusatória

---

## 8. Diretrizes para Agentes de IA

**Todos os agentes do Hub devem obedecer integralmente a este capítulo.**

### Regras Obrigatórias

| Regra | Descrição |
|-------|-----------|
| Contextualização | Sempre contextualizar KPIs com base na KR associada |
| Leitura Estratégica | Priorizar ritmo, sinal, tendência |
| Linguagem | Evitar termos punitivos ou binários |
| Foco | Produzir insights orientados a decisão e foco |

### Agentes Afetados

| Agente | Aplicação |
|--------|-----------|
| Analista de KPIs | Interpretar KRs/KPIs com contexto de ciclo |
| Facilitador de Decisões | Traduzir riscos como sinais, não falhas |
| Guardião da Cultura | Mensagens positivas e orientadas a aprendizado |
| Coach de Produtividade | Dicas contextuais, nunca cobranças |
| Revisor de Comunicação | Tom humano, sem linguagem punitiva |

**Qualquer output que viole essas regras deve ser considerado incorreto.**

---

## 9. Critério de Qualidade das Análises

Uma análise válida no Hub deve responder claramente:

1. **Estamos no ritmo certo para este ponto do ciclo?**
2. **Quais sinais realmente importam agora?**
3. **Onde faz sentido focar energia em seguida?**

Se a análise não responde a essas perguntas, ela **não atende ao padrão do Hub**.

---

## 10. Caráter Canônico

Este capítulo é **canônico** e:

- ✅ Deve ser seguido por todo novo desenvolvimento
- ✅ Deve orientar revisões futuras do Hub
- ✅ Prevalece sobre interpretações ad-hoc ou heurísticas individuais

---

## Fórmulas de Cálculo (Implementação Técnica)

### Progresso Esperado

```typescript
function calculateExpectedProgress(cycle: CycleContext): number {
  const now = Date.now();
  const elapsed = (now - cycle.startDate.getTime()) / 
                  (cycle.endDate.getTime() - cycle.startDate.getTime());
  return Math.round(Math.min(1, Math.max(0, elapsed)) * 100);
}
```

### Análise de Ritmo

```typescript
function analyzePace(actualProgress: number, cycle: CycleContext): PaceStatus {
  const expected = calculateExpectedProgress(cycle);
  const gap = actualProgress - expected;
  const tolerance = 10; // 10% de margem
  
  if (actualProgress >= 100) return 'completed';
  if (gap >= tolerance) return 'above_pace';
  if (gap <= -tolerance) return 'below_pace';
  return 'on_pace';
}
```

---

## Documentos Relacionados

- [WIZARD_DEVELOPMENT_GUIDE.md](./WIZARD_DEVELOPMENT_GUIDE.md)
- [useKrStateInsights.ts](../../src/modules/okrs/hooks/useKrStateInsights.ts)
- [progressCalculation.ts](../../src/modules/okrs/utils/progressCalculation.ts)
- [agent-loader.ts](../../supabase/functions/_shared/agent-loader.ts)

---

*Documento canônico do Hub da Jet — v2.87.0*
