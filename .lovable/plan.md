

## Plano: Ajustar textos do Step de Análise Estratégica — QBR Pre C-Level

### Contexto
Mudança puramente de copy/UX no componente `QbrCLevelStrategicStep.tsx`. Sem impacto em lógica, validação, tipos ou snapshot `reflection_data`.

### Arquivo impactado
`src/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelStrategicStep.tsx`

### Mudanças

**Campo 1 — Alinhamento (linhas 84-96)**
- Label: `"Alinhamento com a Estratégia"` → `"Alinhamento estratégico"`
- Substituir a pergunta-guia única por dois blocos de microcopy antes do Textarea:

```
Sobre o quarter que encerrou
"Os OKRs executados moveram a empresa na direção certa? O que ficou desalinhado com a estratégia?"

Sobre o próximo quarter
"As propostas dos times cobrem as prioridades estratégicas da empresa? Existe alguma prioridade sem time responsável?"
```

Implementação: dois `<div>` com sub-título em `text-xs font-medium` e pergunta em `text-xs text-muted-foreground`, substituindo o `<p>` atual.

**Campo 2 — Sinais (linhas 101-113)**
- Label: `"Sinais que os Times Não Viram"` → `"O que você está vendo que os times não veem"`
- Pergunta-guia: `"Correlações e padrões..."` → `"Que movimentos de mercado, padrões entre áreas ou riscos sistêmicos você está enxergando de cima que os times não conseguem ver de dentro?"`
- Placeholder: `"Tendências de mercado..."` → `"Movimentos de mercado, padrões entre áreas, riscos que só se veem de cima..."`

**Campo 3 — Vetos (linhas 118-130)**
- Label: `"O que NÃO Fazer"` → `"Vetos estratégicos"`
- Pergunta-guia: `"Explicitamente: o que não entra..."` → `"O que a empresa não deve fazer no próximo ciclo, mesmo que pareça importante ou urgente? Seja explícito — vetos não ditos viram trabalho desperdiçado."`
- Placeholder: `"Projetos, iniciativas..."` → `"Iniciativas, direções ou investimentos que não são prioridade agora..."`

### O que NÃO muda
- Ícones (CheckCircle2, Eye, Ban) e suas cores
- Estrutura de 3 campos com mesmo Textarea cada
- Validação (`hasContent` — qualquer campo preenchido habilita "Continuar")
- `InlineDecisionInput` no rodapé
- Chaves do snapshot (`alignmentAssessment`, `signalsTeamsMissed`, `whatNotToDo`)
- Tooltip do header (`qbr-clevel-strategic`)
- Nenhum outro arquivo é alterado

