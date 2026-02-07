# Regra Canônica de Interpretação de Progresso

**Versão:** 1.0.0  
**Data:** 2026-02-07  
**Status:** ✅ Ativo

---

## Resumo Executivo

Este documento define a regra canônica e obrigatória para interpretação de progresso de OKRs, KRs e KPIs no Hub. Todas as análises do sistema — e-mails automáticos, wizards de gestão, dashboards narrativos e insights de IA — DEVEM seguir estas regras.

---

## Princípio Fundamental

> O Hub interpreta progresso como um **sistema de navegação estratégica**, não como um sistema de cobrança.

Toda análise deve responder:
- Estamos no ritmo certo para este ponto do ciclo?
- Que sinais importam agora?
- Onde focar energia em seguida?

---

## Regras Canônicas

### REGRA 1: KPIs NÃO possuem ciclo próprio

- KPIs são sinais contínuos e atemporais
- **NUNCA** interprete um KPI isoladamente como "atrasado" ou "adiantado"
- O contexto temporal SEMPRE vem da KR vinculada

### REGRA 2: O ciclo vem da KR

Quando um KPI estiver vinculado a uma ou mais KRs:
- A KR empresta o contexto temporal (mensal, trimestral, anual)
- A KR define como o KPI deve ser interpretado naquele momento

**Prioridade de ciclo:**
1. Anual > Trimestral > Mensal
2. Em análises de time: priorizar KRs do próprio time
3. Em análises organizacionais: priorizar KRs organizacionais

### REGRA 3: Avaliação por RITMO, não por valor final

Para KRs com ciclo definido:
- Calcular quanto do ciclo já transcorreu
- Comparar o progresso atual com o progresso esperado até este ponto

**Classificações PERMITIDAS:**
- ✅ "Acima do ritmo esperado"
- ✅ "Dentro do ritmo esperado"
- ✅ "Abaixo do ritmo esperado"

**Classificações PROIBIDAS:**
- ❌ "Atrasado" (implica falha, não contexto)
- ❌ "Falhou" (julgamento prematuro)
- ❌ "Insuficiente" (sem contexto temporal)

### REGRA 4: Metas de longo prazo

Metas acumulativas (ex: anuais) DEVEM ser interpretadas como:
- Progresso proporcional ao tempo
- Tendência (aceleração, estabilidade, desaceleração)

**NUNCA** gerar alertas negativos automáticos apenas nos primeiros meses do ciclo.

**Exemplo:**
- Meta anual: R$ 12.000.000
- Resultado em março: R$ 2.500.000
- Ciclo transcorrido: 25%
- Progresso: ~21%
- **Interpretação correta:** "Ligeiramente abaixo do ritmo, mas dentro da margem esperada para o início do ciclo anual"
- **Interpretação ERRADA:** "Atrasado, apenas 21% da meta"

### REGRA 5: Linguagem estratégica

**USE:**
- Ritmo
- Sinal
- Tendência
- Proporcional
- Trajetória

**EVITE:**
- Atrasado
- Falha
- Fracasso
- Insuficiente
- Problema

---

## Aplicação nos Agentes de IA

Todos os agentes do Hub DEVEM obedecer às regras acima:

| Agente | Aplicação |
|--------|-----------|
| Analista de KPIs | Interpretar KRs/KPIs com contexto de ciclo |
| Facilitador de Decisões | Traduzir riscos como sinais, não falhas |
| Guardião da Cultura | Mensagens positivas e orientadas a aprendizado |
| Coach de Produtividade | Dicas contextuais, nunca cobranças |
| Revisor de Comunicação | Tom humano, sem linguagem punitiva |

---

## Fórmulas de Cálculo

### Progresso Esperado

```typescript
function calculateExpectedProgress(cycle: CycleContext): number {
  const elapsed = (now - cycle.startDate) / (cycle.endDate - cycle.startDate);
  return Math.round(elapsed * 100);
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

## Aplicação no E-mail de Resumo

Ao gerar e-mails automáticos pós check-in:

1. **KPIs e KRs devem ser apresentados como:**
   - "dentro do ritmo esperado para o ciclo"
   - "acima do ritmo esperado"
   - "abaixo do ritmo esperado neste momento do ciclo"

2. **Metas vinculadas a ciclos anuais:**
   - DEVEM mencionar explicitamente o contexto temporal
   - Ex: "considerando o ciclo anual"

3. **Itens desatualizados:**
   - Só citar se houver vínculo direto com KRs ou KPIs críticos
   - Leitura informativa, NUNCA acusatória

---

## Critérios de Sucesso

Uma análise é considerada **correta** quando:

- [ ] Contextualiza KPIs com base no ciclo da KR associada
- [ ] Usa linguagem de ritmo, não de atraso
- [ ] Não gera alertas negativos para início de ciclo
- [ ] Foca em aprendizado e decisão
- [ ] Evita termos punitivos ou conclusões binárias

---

## Documentos Relacionados

- [WIZARD_DEVELOPMENT_GUIDE.md](./WIZARD_DEVELOPMENT_GUIDE.md)
- [useKrStateInsights.ts](../../src/modules/okrs/hooks/useKrStateInsights.ts)
- [progressCalculation.ts](../../src/modules/okrs/utils/progressCalculation.ts)

---

*Documento criado em 2026-02-07 — Hub da Jet v2.87.0*
