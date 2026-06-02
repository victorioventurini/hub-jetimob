// ============================================================================
// QBR Executive Report — LLM prompt builders
// ============================================================================

export const QBR_EXEC_SYSTEM_PROMPT =
  `Você é um consultor estratégico preparando um relatório executivo de QBR para o CEO de uma empresa.
Escreva em português brasileiro, tom executivo e direto.
NUNCA use linguagem punitiva — use "abaixo do ritmo esperado" em vez de "atrasado" ou "fracasso".
Nunca limite progresso a 100% — 156% é uma superação real e deve ser celebrada.
Responda APENAS com JSON válido, sem markdown, sem explicações adicionais.`;

export interface PromptInputs {
  cycleName: string;
  teamHealthSummary: unknown;
  overallAchievement: unknown;
  kpisSummary: unknown;
  leaderLearnings: unknown;
  nextCycleProposals: unknown;
  cLevelFlags: unknown;
  pendingDecisions: unknown;
  orgObjectivesSummary: unknown;
}

export function buildQbrExecUserPrompt(inputs: PromptInputs): string {
  const {
    cycleName,
    teamHealthSummary,
    overallAchievement,
    kpisSummary,
    leaderLearnings,
    nextCycleProposals,
    cLevelFlags,
    pendingDecisions,
    orgObjectivesSummary,
  } = inputs;

  return `Gere o relatório executivo para o ciclo "${cycleName}".

=== % DE ATINGIMENTO DOS OKRs (NÚMEROS OFICIAIS — USE EXATAMENTE ESTES) ===
${JSON.stringify(overallAchievement)}

REGRA OBRIGATÓRIA: ao citar qualquer % de atingimento (geral, por time ou por
objetivo) use EXATAMENTE os valores acima. Não recalcule, não estime, não
arredonde de forma diferente. Estes números seguem a Progress Canon do produto
(igual ao que aparece em /okrs) e são a única fonte de verdade.

=== ENTREGA DOS TIMES (contexto qualitativo — buckets RAG) ===
${JSON.stringify(teamHealthSummary)}

=== KPIs ORGANIZACIONAIS ===
${JSON.stringify(kpisSummary)}

=== APRENDIZADOS DOS LÍDERES (qbr-pre) ===
${JSON.stringify((leaderLearnings as unknown[]).slice(0, 10))}

=== PROPOSTAS PARA O PRÓXIMO CICLO ===
${JSON.stringify((nextCycleProposals as unknown[]).slice(0, 15))}

=== FLAGS DO C-LEVEL ===
${JSON.stringify(cLevelFlags)}

=== DECISÕES PENDENTES ===
${JSON.stringify((pendingDecisions as unknown[]).slice(0, 10))}

=== OKRs ORGANIZACIONAIS ===
${JSON.stringify(orgObjectivesSummary)}

Gere o relatório em JSON com exatamente esta estrutura:
{
  "quarterNarrative": "parágrafo de 5-8 linhas interpretando o quarter — cite o overallProgress quando relevante",
  "proposalsAnalysis": "parágrafo de 4-6 linhas analisando as propostas do próximo ciclo",
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
