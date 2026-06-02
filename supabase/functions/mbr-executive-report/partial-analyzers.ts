// ============================================================================
// MBR Executive Report — Partial analyzers (map phase of map-reduce)
//
// Each function makes ONE small LLM call producing a focused JSON fragment.
// Failures degrade gracefully to neutral text so the final report still renders.
// ============================================================================

import { llmComplete, type LLMConfig, type LLMMessage } from "../_shared/llm-client.ts";
import { tryParseAiJson } from "../_shared/ai-json.ts";

const PARTIAL_MAX_TOKENS = 3500;
const PARTIAL_TEMPERATURE = 0.45;

const PARTIAL_SYSTEM = `Você é um consultor estratégico sênior (ex-McKinsey/BCG) preparando partes de um relatório executivo MENSAL (MBR) para o CEO.
Escreva em português brasileiro, tom executivo, denso e analítico — NÃO descritivo.

Estilo OBRIGATÓRIO:
- Vá além de listar fatos: explique CAUSAS, PADRÕES TRANSVERSAIS, IMPLICAÇÕES de 2ª ordem e o "e daí?".
- Cruze informações entre times/áreas sempre que possível (ex.: "três times citam a mesma dependência de Produto").
- Quantifique quando os dados permitirem (use números do payload — % de atingimento, contagens, RAG).
- Use SEMPRE as justificativas declaradas pelos líderes — não invente causas; quando faltar dado, diga "líderes não declararam causa".
- NUNCA use linguagem punitiva — prefira "abaixo do ritmo esperado", "demanda ajuste de rota".
- Frases curtas, parágrafos longos. Sem bullets dentro dos campos de texto (a menos que o schema peça lista).
- Sem markdown, sem títulos, sem emojis.

Responda APENAS com JSON válido.`;

async function callPartial<T>(
  llmConfig: LLMConfig,
  userPrompt: string,
  fallback: T,
  requestId: string,
  label: string,
): Promise<T> {
  const messages: LLMMessage[] = [
    { role: "system", content: PARTIAL_SYSTEM },
    { role: "user", content: userPrompt },
  ];
  try {
    const response = await llmComplete(
      { ...llmConfig, maxTokens: PARTIAL_MAX_TOKENS, temperature: PARTIAL_TEMPERATURE },
      messages,
      { maxTokens: PARTIAL_MAX_TOKENS, temperature: PARTIAL_TEMPERATURE },
    );
    if (!response.content) {
      console.warn(`[${requestId}] [${label}] Empty content, using fallback`);
      return fallback;
    }
    const parsed = tryParseAiJson<T>(response.content, null);
    if (!parsed) {
      console.warn(`[${requestId}] [${label}] Parse failed, using fallback. Raw:`, response.content.slice(0, 500));
      return fallback;
    }
    console.log(`[${requestId}] [${label}] OK`);
    return parsed;
  } catch (err) {
    const error = err as Error;
    console.warn(`[${requestId}] [${label}] LLM call failed:`, error?.message || err);
    return fallback;
  }
}

// ----------------------------------------------------------------------------
// Partial 1: Projects analysis
// ----------------------------------------------------------------------------
export interface ProjectsPartial { projectsAnalysis: string }

export async function analyzeProjects(
  llmConfig: LLMConfig,
  projectIssues: unknown,
  requestId: string,
): Promise<ProjectsPartial> {
  const items = Array.isArray(projectIssues) ? projectIssues : [];
  if (items.length === 0) return { projectsAnalysis: "" };

  const prompt = `Abaixo estão projetos e marcos com atraso ou risco no mês, com as justificativas declaradas pelos líderes.

=== PROJETOS / MARCOS COM ISSUES (${items.length} no total) ===
${JSON.stringify(items.slice(0, 30))}

Produza uma análise EXECUTIVA E ANALÍTICA (não descritiva). Cubra, em ordem:
1. PADRÕES TRANSVERSAIS nas causas declaradas — agrupe em 2-4 temas (ex.: dependência cruzada de Produto, capacidade técnica, escopo subdimensionado, bloqueios externos). Cite a frequência de cada tema.
2. CONCENTRAÇÃO — quais áreas/times concentram os atrasos e por quê.
3. IMPLICAÇÕES — quais OKRs/compromissos ficam em risco se nada mudar.
4. RECOMENDAÇÕES — 2-3 movimentos concretos que o CEO pode endossar (não genéricos).

Tamanho-alvo: 12-18 linhas em UM único parágrafo denso (sem bullets, sem markdown). Não liste projetos um a um — use exemplos só para ilustrar padrões.

Gere JSON:
{
  "projectsAnalysis": "parágrafo único, denso, analítico"
}`;

  return await callPartial<ProjectsPartial>(
    llmConfig,
    prompt,
    { projectsAnalysis: "" },
    requestId,
    "analyzeProjects",
  );
}

// ----------------------------------------------------------------------------
// Partial 2: KR issues analysis
// ----------------------------------------------------------------------------
export interface KrIssuesPartial { krIssuesAnalysis: string }

export async function analyzeKrIssues(
  llmConfig: LLMConfig,
  krIssues: unknown,
  orgObjectivesSummary: unknown,
  requestId: string,
): Promise<KrIssuesPartial> {
  const items = Array.isArray(krIssues) ? krIssues : [];
  if (items.length === 0) return { krIssuesAnalysis: "" };

  const prompt = `Abaixo estão KRs fora da meta com as justificativas dos líderes, e o contexto dos OKRs organizacionais.

=== KRs FORA DA META (${items.length} no total) ===
${JSON.stringify(items.slice(0, 30))}

=== OKRs ORGANIZACIONAIS (referência) ===
${JSON.stringify(orgObjectivesSummary)}

Produza uma análise EXECUTIVA E ANALÍTICA (não descritiva). Cubra:
1. CAUSAS-RAIZ AGRUPADAS — agrupe as justificativas em 3-5 padrões (capacidade, dependências, escopo, premissa errada, mudança de prioridade, etc.) e diga quantos KRs caem em cada. Inclua a leitura: "é problema de execução, premissa ou priorização?".
2. CONEXÃO COM OKRs ORGANIZACIONAIS — quais OKRs org estão sendo puxados para baixo por esses KRs e qual a magnitude (use o progresso/atingimento informado).
3. RISCO DE CICLO — quais KRs ainda têm tempo de virar e quais já estão estruturalmente comprometidos.
4. RECOMENDAÇÕES — 2-3 movimentos concretos (re-baseline, realocação, kill, ajuste de meta).

Tamanho-alvo: 14-20 linhas em UM único parágrafo denso (sem bullets, sem markdown).

Gere JSON:
{
  "krIssuesAnalysis": "parágrafo único, denso, analítico"
}`;

  return await callPartial<KrIssuesPartial>(
    llmConfig,
    prompt,
    { krIssuesAnalysis: "" },
    requestId,
    "analyzeKrIssues",
  );
}

// ----------------------------------------------------------------------------
// Partial 3: KPI insights
// ----------------------------------------------------------------------------
export interface KpiInsightsPartial {
  kpiInsights: { healthy: string; atRisk: string; critical: string };
}

export async function analyzeKpis(
  llmConfig: LLMConfig,
  kpisSummary: unknown,
  kpiIssues: unknown,
  kpisToCreate: unknown,
  monthLabel: string,
  requestId: string,
): Promise<KpiInsightsPartial> {
  const summary = Array.isArray(kpisSummary) ? kpisSummary : [];
  const issues = Array.isArray(kpiIssues) ? kpiIssues : [];
  if (summary.length === 0 && issues.length === 0) {
    return { kpiInsights: { healthy: "", atRisk: "", critical: "" } };
  }

  const prompt = `Abaixo está o status dos KPIs organizacionais até o fim de ${monthLabel}.

=== KPIs ORGANIZACIONAIS (${summary.length}) ===
${JSON.stringify(summary)}

=== KPIs COM JUSTIFICATIVA OU SEM DADOS (por time) ===
${JSON.stringify(issues.slice(0, 20))}

=== NOVOS KPIs SUGERIDOS PELOS LÍDERES ===
${JSON.stringify(Array.isArray(kpisToCreate) ? kpisToCreate.slice(0, 10) : [])}

Para CADA bucket, escreva um parágrafo analítico (não um bullet) de 4-7 linhas que:
- nomeie os KPIs relevantes (com o número quando útil — currentValue vs targetValue, RAG),
- explique POR QUE estão nesse estado (causas declaradas ou inferidas com cuidado),
- aponte SINAIS LIDERANÇA (tendência: melhorando, estagnado, piorando) e
- termine com a IMPLICAÇÃO para o ciclo (o que isso significa para o CEO).

Use string vazia ("") quando não houver KPI naquele bucket.

Gere JSON:
{
  "kpiInsights": {
    "healthy":  "parágrafo denso de 4-7 linhas (ou string vazia)",
    "atRisk":   "parágrafo denso de 4-7 linhas (ou string vazia)",
    "critical": "parágrafo denso de 4-7 linhas (ou string vazia)"
  }
}`;

  return await callPartial<KpiInsightsPartial>(
    llmConfig,
    prompt,
    { kpiInsights: { healthy: "", atRisk: "", critical: "" } },
    requestId,
    "analyzeKpis",
  );
}

// ----------------------------------------------------------------------------
// Partial 4: Decisions + agenda
// ----------------------------------------------------------------------------
export interface DecisionsPartial { decisionsNeeded: string[] }

export async function analyzeDecisions(
  llmConfig: LLMConfig,
  pendingDecisions: unknown,
  agendaSuggestions: unknown,
  requestId: string,
): Promise<DecisionsPartial> {
  const decisions = Array.isArray(pendingDecisions) ? pendingDecisions : [];
  const agenda = Array.isArray(agendaSuggestions) ? agendaSuggestions : [];
  if (decisions.length === 0 && agenda.length === 0) return { decisionsNeeded: [] };

  const prompt = `Abaixo estão decisões pendentes do mês e sugestões de pauta dos líderes.

=== DECISÕES PENDENTES ===
${JSON.stringify(decisions.slice(0, 15))}

=== SUGESTÕES DE PAUTA ===
${JSON.stringify(agenda.slice(0, 15))}

Gere até 8 itens priorizados (mais relevantes primeiro). Cada item deve:
- ser direto e acionável (começar com verbo: "Decidir...", "Aprovar...", "Definir...", "Realocar..."),
- explicitar o TRADE-OFF central (ex.: "Decidir entre acelerar X sacrificando Y, ou manter o ritmo atual aceitando atraso em Z"),
- ter 1-3 linhas. Evite itens genéricos como "Discutir prioridades".

Gere JSON:
{
  "decisionsNeeded": ["item 1 (1-3 linhas com trade-off)", "item 2", "..."]
}`;

  const result = await callPartial<DecisionsPartial>(
    llmConfig,
    prompt,
    { decisionsNeeded: [] },
    requestId,
    "analyzeDecisions",
  );
  return {
    decisionsNeeded: Array.isArray(result?.decisionsNeeded) ? result.decisionsNeeded : [],
  };
}

// ----------------------------------------------------------------------------
// Reduce: Consolidation (narrative + commitments + leader signals)
// ----------------------------------------------------------------------------
export interface ConsolidationPartial {
  monthNarrative: string;
  commitmentsAnalysis: string;
  leaderSignals: string;
}

export interface ConsolidationInputs {
  cycleName: string;
  monthLabel: string;
  overallAchievement: unknown;
  teamHealthSummary: unknown;
  teamHighlights: unknown;
  teamCommitments: unknown;
  monthAnalyses: unknown;
  projectsAnalysis: string;
  krIssuesAnalysis: string;
  kpiInsights: { healthy: string; atRisk: string; critical: string };
  decisionsNeeded: string[];
}

const CONSOLIDATION_SYSTEM = `Você é um consultor estratégico sênior (ex-McKinsey/BCG) finalizando o relatório executivo MENSAL (MBR) para o CEO.
Tom executivo, denso, ANALÍTICO — não descritivo. Português brasileiro.
O recorte é o MÊS de referência informado — não o quarter inteiro. Refira-se ao "mês" (não ao "quarter") quando estiver falando do período coberto.
Estilo:
- Vá além de relatar o que aconteceu: explique POR QUE aconteceu, o QUE ISSO SIGNIFICA e O QUE FAZER.
- Cruze times/áreas/projetos/KRs sempre que possível.
- Quantifique sempre que os dados permitirem.
- Frases curtas, parágrafos longos. Sem bullets, sem markdown, sem títulos, sem emojis.
NUNCA use linguagem punitiva — prefira "abaixo do ritmo esperado".
Nunca limite progresso a 100% — 156% é superação real.
Use SEMPRE os números oficiais informados — não recalcule.
Responda APENAS com JSON válido.`;

export async function consolidateReport(
  llmConfig: LLMConfig,
  inputs: ConsolidationInputs,
  requestId: string,
): Promise<ConsolidationPartial> {
  const slice = (v: unknown, n: number) => Array.isArray(v) ? v.slice(0, n) : v;

  const prompt = `Você está finalizando o relatório executivo do MÊS "${inputs.monthLabel}" (ciclo "${inputs.cycleName}").
As análises de projetos, KRs, KPIs e decisões JÁ FORAM FEITAS — use-as como contexto, NÃO as repita textualmente. Conecte-as numa narrativa única.

=== % DE ATINGIMENTO DOS OKRs (NÚMEROS OFICIAIS — USE EXATAMENTE) ===
${JSON.stringify(inputs.overallAchievement)}

REGRA: ao citar % use EXATAMENTE os valores acima. Não recalcule, não estime.

=== ENTREGA DOS TIMES NO QUARTER (buckets RAG) ===
${JSON.stringify(inputs.teamHealthSummary)}

=== DESTAQUES DO MÊS POR TIME ===
${JSON.stringify(slice(inputs.teamHighlights, 15))}

=== COMPROMISSOS PARA O PRÓXIMO MÊS ===
${JSON.stringify(slice(inputs.teamCommitments, 15))}

=== ANÁLISES MENSAIS IA REVISADAS PELOS LÍDERES ===
${JSON.stringify(slice(inputs.monthAnalyses, 10))}

=== ANÁLISES PARCIAIS JÁ PRODUZIDAS (contexto, não repetir) ===
projectsAnalysis: ${JSON.stringify(inputs.projectsAnalysis)}
krIssuesAnalysis: ${JSON.stringify(inputs.krIssuesAnalysis)}
kpiInsights: ${JSON.stringify(inputs.kpiInsights)}
decisionsNeeded: ${JSON.stringify(inputs.decisionsNeeded)}

Gere JSON com exatamente esta estrutura. CADA campo deve ser denso, analítico e cruzar dados:

{
  "monthNarrative": "Parágrafo único de 15-22 linhas. Estrutura recomendada (sem nomear as partes): (a) abertura com o overallProgress oficial e leitura macro do mês — estamos acelerando, estagnados ou desacelerando? (b) destaques positivos com nomes de times e o motivo do avanço; (c) ofensores principais conectando KRs, projetos e KPIs — não apenas listar, mas mostrar como se reforçam; (d) padrão transversal mais importante do mês (ex.: gargalo cruzado em uma área, mudança de premissa, dependência externa); (e) leitura de risco para o fechamento do ciclo e o que o CEO deveria observar nas próximas semanas. Sem bullets, sem markdown.",

  "commitmentsAnalysis": "Parágrafo único de 10-15 linhas analisando os compromissos para o próximo mês: foco coletivo emergente, dependências cruzadas explícitas ou implícitas entre times, sobrecarga aparente em algum time, compromissos que parecem desconectados dos ofensores deste mês, e a probabilidade realista de cumprimento dado o histórico. Sinalize 1-2 riscos concretos e 1-2 oportunidades de alavancagem.",

  "leaderSignals": "Parágrafo único de 6-10 linhas consolidando o que os líderes pediram coletivamente — pauta sugerida, KPIs a criar, sinais das análises mensais revisadas. Destaque CONVERGÊNCIAS (vários líderes pedindo a mesma coisa) e DIVERGÊNCIAS notáveis. String vazia se não houver sinais relevantes."
}`;

  const messages: LLMMessage[] = [
    { role: "system", content: CONSOLIDATION_SYSTEM },
    { role: "user", content: prompt },
  ];

  const response = await llmComplete(
    { ...llmConfig, maxTokens: 5000, temperature: 0.45 },
    messages,
    { maxTokens: 5000, temperature: 0.45 },
  );
  if (!response.content) {
    throw new Error("Empty consolidation response");
  }
  const parsed = tryParseAiJson<ConsolidationPartial>(response.content, null);
  if (!parsed) {
    console.error(`[${requestId}] [consolidate] Parse failed. Raw:`, response.content.slice(0, 1000));
    throw new Error("Failed to parse consolidation JSON");
  }
  console.log(`[${requestId}] [consolidate] OK`);
  return {
    monthNarrative: parsed.monthNarrative || "",
    commitmentsAnalysis: parsed.commitmentsAnalysis || "",
    leaderSignals: parsed.leaderSignals || "",
  };
}
