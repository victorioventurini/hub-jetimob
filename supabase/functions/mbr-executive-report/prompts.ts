// ============================================================================
// MBR Executive Report — LLM prompt builders
// ============================================================================

export const MBR_EXEC_SYSTEM_PROMPT =
  `Você é um consultor estratégico preparando um relatório executivo MENSAL (MBR) para o CEO de uma empresa.
Escreva em português brasileiro, tom executivo e direto.
O recorte é o MÊS de referência informado — não o quarter inteiro. Quando comparar, refira-se ao "mês" (não ao "quarter").
NUNCA use linguagem punitiva — use "abaixo do ritmo esperado" em vez de "atrasado" ou "fracasso".
Nunca limite progresso a 100% — 156% é uma superação real e deve ser celebrada.
Responda APENAS com JSON válido, sem markdown, sem explicações adicionais.`;

export interface PromptInputs {
  cycleName: string;
  monthLabel: string;
  teamHealthSummary: unknown;
  kpisSummary: unknown;
  teamHighlights: unknown;
  teamCommitments: unknown;
  pendingDecisions: unknown;
  orgObjectivesSummary: unknown;
}

export function buildMbrExecUserPrompt(inputs: PromptInputs): string {
  const {
    cycleName,
    monthLabel,
    teamHealthSummary,
    kpisSummary,
    teamHighlights,
    teamCommitments,
    pendingDecisions,
    orgObjectivesSummary,
  } = inputs;

  return `Gere o relatório executivo do MÊS "${monthLabel}" (dentro do ciclo "${cycleName}").

=== ENTREGA DOS TIMES NO QUARTER (contexto) ===
${JSON.stringify(teamHealthSummary)}

=== KPIs ORGANIZACIONAIS (consolidados até o fim de ${monthLabel}) ===
${JSON.stringify(kpisSummary)}

=== DESTAQUES DO MÊS POR TIME (MBR-pré) ===
${JSON.stringify((teamHighlights as unknown[]).slice(0, 15))}

=== COMPROMISSOS DOS TIMES PARA O PRÓXIMO MÊS (MBR-pré) ===
${JSON.stringify((teamCommitments as unknown[]).slice(0, 15))}

=== DECISÕES PENDENTES DO MÊS ===
${JSON.stringify((pendingDecisions as unknown[]).slice(0, 10))}

=== OKRs ORGANIZACIONAIS (referência do trimestre) ===
${JSON.stringify(orgObjectivesSummary)}

Gere o relatório em JSON com exatamente esta estrutura:
{
  "monthNarrative": "parágrafo de 5-8 linhas interpretando o mês — saúde dos OKRs, ritmo, principais movimentos e ofensores",
  "commitmentsAnalysis": "parágrafo de 4-6 linhas analisando os compromissos dos times para o próximo mês (foco, dependências cruzadas, riscos)",
  "kpiInsights": {
    "healthy": "1-2 linhas sobre os KPIs em boa forma (omitir se não houver)",
    "atRisk": "1-2 linhas sobre os KPIs que merecem atenção (omitir se não houver)",
    "critical": "1-2 linhas sobre os KPIs críticos (omitir se não houver)"
  },
  "decisionsNeeded": [
    "item 1 — direto ao ponto",
    "item 2"
  ]
}`;
}
