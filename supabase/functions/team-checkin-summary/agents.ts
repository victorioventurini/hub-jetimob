// AI agent orchestration for team-checkin-summary
import type { EdgeSupabaseClient } from "../_shared/types/common.ts";
import { invokeAgentDirect } from "../_shared/invoke-agent.ts";
import { extractSettled, tryParseAiJson } from "../_shared/ai-json.ts";
import type { AgentContextData, AgentSections } from "./types.ts";

export async function orchestrateAgents(
  serviceClient: EdgeSupabaseClient,
  buId: string,
  agentContext: AgentContextData,
  requestId: string,
): Promise<AgentSections> {
  const contextJson = JSON.stringify(agentContext);

  const [analistaResult, facilitadorResult, culturaResult, revisorResult] = await Promise.allSettled([
    invokeAgentDirect(
      serviceClient,
      'analista-kpis',
      `Contexto do check-in:\n${contextJson}\n\nGere um resumo executivo do check-in do time focando em exceções.
Retorne em formato JSON com as chaves:
- objectives_summary: resumo dos objetivos (2-3 frases)
- krs_highlight: KRs em destaque formatados como lista markdown
- kpis_summary: indicadores relevantes formatados como lista markdown
Foque apenas no que está fora do esperado. Não seja punitivo.`,
      buId,
      requestId,
    ),
    invokeAgentDirect(
      serviceClient,
      'facilitador-decisoes',
      `Contexto do check-in:\n${contextJson}\n\nAnalise as decisões e riscos do check-in.
Retorne em formato JSON com as chaves:
- initiatives_summary: resumo das iniciativas e decisões (2-3 frases)
- risks_summary: até 3 riscos/bloqueios formatados como lista markdown
- next_focus: 2-4 próximos focos práticos formatados como lista markdown
Linguagem construtiva, orientada a ação.`,
      buId,
      requestId,
    ),
    invokeAgentDirect(
      serviceClient,
      'cultura',
      `Contexto: culture_message
Time: ${agentContext.teamName}, Ciclo: ${agentContext.cycleName}
Tem riscos: ${agentContext.krsHighlight.some((kr) => kr.status === 'fora da trilha')}

Gere uma mensagem cultural curta (máximo 60 caracteres).
Deve ser inspiradora, contextual ao momento do time.
Tom positivo, orientado a aprendizado. Sem aspas.`,
      buId,
      requestId,
    ),
    invokeAgentDirect(
      serviceClient,
      'revisor-comunicacao',
      `Contexto: abertura e encerramento do e-mail de check-in
Time: ${agentContext.teamName}, Ciclo: ${agentContext.cycleName}, BU: ${agentContext.buName}

Crie abertura e encerramento para o e-mail de resumo do check-in.
Retorne em formato JSON com as chaves:
- opening_text: 2-3 frases de abertura contextualizando o fechamento do check-in
- closing_text: 1-2 frases de encerramento com tom positivo
Linguagem humana, sem burocracia. Não mencione "Next" na abertura.`,
      buId,
      requestId,
    ),
  ]);

  const sections: AgentSections = {
    opening_text: 'Este é o resumo do check-in mais recente do seu time.',
    objectives_summary: 'Sem objetivos em destaque neste ciclo.',
    krs_highlight: '',
    kpis_summary: '',
    initiatives_summary: 'Sem iniciativas registradas.',
    risks_summary: 'Nenhum risco identificado.',
    next_focus: '- Manter o foco na execução',
    culture_message: 'Juntos construímos resultados.',
    closing_text: 'Bom trabalho, time!',
  };

  const analista = tryParseAiJson<Partial<AgentSections>>(extractSettled(analistaResult), {});
  if (analista.objectives_summary) sections.objectives_summary = analista.objectives_summary;
  if (analista.krs_highlight) sections.krs_highlight = analista.krs_highlight;
  if (analista.kpis_summary) sections.kpis_summary = analista.kpis_summary;
  // Plain-text fallback if model returned non-JSON
  if (!analista.objectives_summary) {
    const raw = extractSettled(analistaResult);
    if (raw && !raw.trim().startsWith('{')) sections.objectives_summary = raw;
  }

  const facilitador = tryParseAiJson<Partial<AgentSections>>(extractSettled(facilitadorResult), {});
  if (facilitador.initiatives_summary) sections.initiatives_summary = facilitador.initiatives_summary;
  if (facilitador.risks_summary) sections.risks_summary = facilitador.risks_summary;
  if (facilitador.next_focus) sections.next_focus = facilitador.next_focus;

  const culturaContent = extractSettled(culturaResult, sections.culture_message);
  if (culturaContent && culturaContent.length <= 100) {
    sections.culture_message = culturaContent.replace(/^["']|["']$/g, '').trim();
  }

  const revisor = tryParseAiJson<Partial<AgentSections>>(extractSettled(revisorResult), {});
  if (revisor.opening_text) sections.opening_text = revisor.opening_text;
  if (revisor.closing_text) sections.closing_text = revisor.closing_text;

  return sections;
}
