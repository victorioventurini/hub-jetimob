// AI agent orchestration for collaborator-checkin-summary
import type { EdgeSupabaseClient } from "../_shared/types/common.ts";
import { invokeAgentDirect } from "../_shared/invoke-agent.ts";
import { extractSettled, tryParseAiJson } from "../_shared/ai-json.ts";
import type { CollaboratorAgentContext, CollaboratorSections } from "./types.ts";

export async function orchestrateAgents(
  serviceClient: EdgeSupabaseClient,
  buId: string,
  agentContext: CollaboratorAgentContext,
  requestId: string,
): Promise<CollaboratorSections> {
  const contextJson = JSON.stringify(agentContext);

  const [analistaResult, revisorResult] = await Promise.allSettled([
    invokeAgentDirect(
      serviceClient,
      'analista-kpis',
      `Contexto do check-in individual do colaborador ${agentContext.userName}:\n${contextJson}\n\nGere um resumo do check-in focando em:
1. Progresso dos KRs (destaques positivos e pontos de atenção)
2. Indicadores KPIs relevantes
3. Reflexões e aprendizados do colaborador
Retorne em formato JSON com as chaves:
- kr_summary: resumo dos KRs atualizados (lista markdown, 2-4 itens)
- kpi_summary: indicadores relevantes (lista markdown, se houver)
- reflection_insights: insights das reflexões do colaborador (2-3 frases)
Tom construtivo e encorajador. Foque no progresso, não em críticas.`,
      buId,
      requestId,
    ),
    invokeAgentDirect(
      serviceClient,
      'revisor-comunicacao',
      `Contexto: abertura e encerramento do e-mail de check-in individual
Colaborador: ${agentContext.userName}, Ciclo: ${agentContext.cycleName}, BU: ${agentContext.buName}

Crie abertura e encerramento para o e-mail de resumo do check-in individual.
Retorne em formato JSON com as chaves:
- opening_text: 2-3 frases de abertura contextualizando a conclusão do check-in semanal
- closing_text: 1-2 frases de encerramento com tom positivo e motivacional
Linguagem humana, sem burocracia. Personalize com o nome "{{user_name}}".`,
      buId,
      requestId,
    ),
  ]);

  const sections: CollaboratorSections = {
    opening_text: 'Este é o resumo do seu check-in semanal.',
    kr_summary: 'Sem KRs atualizados neste check-in.',
    kpi_summary: '',
    reflection_insights: '',
    closing_text: 'Continue com o bom trabalho!',
  };

  const analista = tryParseAiJson<Partial<CollaboratorSections>>(extractSettled(analistaResult), {});
  if (analista.kr_summary) sections.kr_summary = analista.kr_summary;
  if (analista.kpi_summary) sections.kpi_summary = analista.kpi_summary;
  if (analista.reflection_insights) sections.reflection_insights = analista.reflection_insights;
  if (!analista.kr_summary) {
    const raw = extractSettled(analistaResult);
    if (raw && !raw.trim().startsWith('{')) sections.kr_summary = raw;
  }

  const revisor = tryParseAiJson<Partial<CollaboratorSections>>(extractSettled(revisorResult), {});
  if (revisor.opening_text) sections.opening_text = revisor.opening_text;
  if (revisor.closing_text) sections.closing_text = revisor.closing_text;

  return sections;
}
