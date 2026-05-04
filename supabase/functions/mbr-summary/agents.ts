// AI agent orchestration for mbr-summary
import type { EdgeSupabaseClient } from "../_shared/types/common.ts";
import { invokeAgentDirect } from "../_shared/invoke-agent.ts";
import { extractSettled, tryParseAiJson } from "../_shared/ai-json.ts";
import type { MbrAgentContext, MbrSections } from "./types.ts";

export async function orchestrateAgents(
  serviceClient: EdgeSupabaseClient,
  buId: string,
  agentContext: MbrAgentContext,
  requestId: string,
): Promise<MbrSections> {
  const contextJson = JSON.stringify(agentContext);

  const [analistaResult, facilitadorResult, revisorResult] = await Promise.allSettled([
    invokeAgentDirect(
      serviceClient,
      'analista-kpis',
      `Contexto do MBR (Monthly Business Review):\n${contextJson}\n\nGere um resumo executivo do MBR focando em:
1. KPIs críticos e seu impacto estratégico
2. Estado das OKRs organizacionais
Retorne em formato JSON com as chaves:
- critical_kpis_summary: resumo dos KPIs em risco com impacto (lista markdown)
- monthly_directives: diretrizes estratégicas para o próximo mês (2-4 pontos, lista markdown)
Linguagem executiva, objetiva. Foque no que importa.`,
      buId,
      requestId,
    ),
    invokeAgentDirect(
      serviceClient,
      'facilitador-decisoes',
      `Contexto do MBR (Monthly Business Review):\n${contextJson}\n\nConsolide as decisões estratégicas do MBR.
Retorne em formato JSON com as chaves:
- strategic_decisions: decisões tomadas formatadas como lista markdown
- focus_adjustments: ajustes de foco formatados como lista markdown
- next_steps: próximos passos com responsabilização formatados como lista markdown
Linguagem executiva e orientada a ação.`,
      buId,
      requestId,
    ),
    invokeAgentDirect(
      serviceClient,
      'revisor-comunicacao',
      `Contexto: abertura e encerramento do e-mail de MBR mensal
BU: ${agentContext.buName}, Mês de referência: ${agentContext.referenceMonth}

Crie abertura e encerramento para o e-mail de resumo do MBR.
Retorne em formato JSON com as chaves:
- opening_text: 2-3 frases de abertura contextualizando o fechamento do MBR mensal
- closing_text: 1-2 frases de encerramento com tom positivo e orientado à execução
Linguagem executiva, sem burocracia.`,
      buId,
      requestId,
    ),
  ]);

  const sections: MbrSections = {
    opening_text: 'Este é o resumo do Monthly Business Review mais recente.',
    critical_kpis_summary: 'Sem KPIs críticos identificados.',
    strategic_decisions: 'Sem decisões registradas.',
    focus_adjustments: 'Sem ajustes de foco.',
    next_steps: '- Manter o foco na execução estratégica',
    monthly_directives: '- Manter as prioridades definidas',
    closing_text: 'Bom trabalho, liderança!',
  };

  const analista = tryParseAiJson<Partial<MbrSections>>(extractSettled(analistaResult), {});
  if (analista.critical_kpis_summary) sections.critical_kpis_summary = analista.critical_kpis_summary;
  if (analista.monthly_directives) sections.monthly_directives = analista.monthly_directives;
  if (!analista.critical_kpis_summary) {
    const raw = extractSettled(analistaResult);
    if (raw && !raw.trim().startsWith('{')) sections.critical_kpis_summary = raw;
  }

  const facilitador = tryParseAiJson<Partial<MbrSections>>(extractSettled(facilitadorResult), {});
  if (facilitador.strategic_decisions) sections.strategic_decisions = facilitador.strategic_decisions;
  if (facilitador.focus_adjustments) sections.focus_adjustments = facilitador.focus_adjustments;
  if (facilitador.next_steps) sections.next_steps = facilitador.next_steps;

  const revisor = tryParseAiJson<Partial<MbrSections>>(extractSettled(revisorResult), {});
  if (revisor.opening_text) sections.opening_text = revisor.opening_text;
  if (revisor.closing_text) sections.closing_text = revisor.closing_text;

  return sections;
}
