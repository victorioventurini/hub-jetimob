// ============================================================================
// MBR Executive Report — LLM prompt builders
// ============================================================================

export const MBR_EXEC_SYSTEM_PROMPT =
  `Você é um consultor estratégico preparando um relatório executivo MENSAL (MBR) para o CEO de uma empresa.
Escreva em português brasileiro, tom executivo e direto.
O recorte é o MÊS de referência informado — não o quarter inteiro. Quando comparar, refira-se ao "mês" (não ao "quarter").
NUNCA use linguagem punitiva — use "abaixo do ritmo esperado" em vez de "atrasado" ou "fracasso".
Nunca limite progresso a 100% — 156% é uma superação real e deve ser celebrada.
Use SEMPRE as justificativas declaradas pelos líderes — não invente causa quando houver texto declarado.
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
  projectIssues: unknown;
  krIssues: unknown;
  kpiIssues: unknown;
  kpisToCreate: unknown;
  agendaSuggestions: unknown;
  monthAnalyses: unknown;
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
    projectIssues,
    krIssues,
    kpiIssues,
    kpisToCreate,
    agendaSuggestions,
    monthAnalyses,
  } = inputs;

  const slice = (v: unknown, n: number) => Array.isArray(v) ? v.slice(0, n) : v;

  return `Gere o relatório executivo do MÊS "${monthLabel}" (dentro do ciclo "${cycleName}").

=== ENTREGA DOS TIMES NO QUARTER (contexto) ===
${JSON.stringify(teamHealthSummary)}

=== KPIs ORGANIZACIONAIS (consolidados até o fim de ${monthLabel}) ===
${JSON.stringify(kpisSummary)}

=== DESTAQUES DO MÊS POR TIME (MBR-pré) ===
${JSON.stringify(slice(teamHighlights, 15))}

=== COMPROMISSOS DOS TIMES PARA O PRÓXIMO MÊS (MBR-pré) ===
${JSON.stringify(slice(teamCommitments, 15))}

=== PROJETOS E MARCOS ATRASADOS — JUSTIFICATIVAS DOS LÍDERES ===
${JSON.stringify(slice(projectIssues, 20))}

=== KRs FORA DA META — JUSTIFICATIVAS DOS LÍDERES ===
${JSON.stringify(slice(krIssues, 20))}

=== KPIs COM JUSTIFICATIVA OU SEM DADOS — POR TIME ===
${JSON.stringify(slice(kpiIssues, 20))}

=== NOVOS KPIs SUGERIDOS PELOS LÍDERES ===
${JSON.stringify(slice(kpisToCreate, 10))}

=== SUGESTÕES DE PAUTA PARA O MBR ===
${JSON.stringify(slice(agendaSuggestions, 10))}

=== ANÁLISES MENSAIS IA REVISADAS PELOS LÍDERES (por time) ===
${JSON.stringify(slice(monthAnalyses, 10))}

=== DECISÕES PENDENTES DO MÊS ===
${JSON.stringify(slice(pendingDecisions, 10))}

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
  "projectsAnalysis": "parágrafo de 3-5 linhas sobre projetos e marcos em atraso, citando padrões nas justificativas dos líderes (omitir se não houver)",
  "krIssuesAnalysis": "parágrafo de 3-5 linhas sobre KRs fora da meta, agrupando causas declaradas pelos líderes (omitir se não houver)",
  "leaderSignals": "parágrafo de 2-4 linhas consolidando o que os líderes pediram — pauta sugerida, KPIs a criar e sinais das análises mensais (omitir se não houver)",
  "decisionsNeeded": [
    "item 1 — direto ao ponto",
    "item 2"
  ]
}`;
}
