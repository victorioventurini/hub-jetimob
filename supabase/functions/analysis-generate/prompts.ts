// Prompt builders for analysis-generate
import { CANONICAL_PROGRESS_INTERPRETATION_RULES } from "../_shared/agent-loader.ts";
import type {
  CollectedData,
  GenerateRequest,
  KpisModule,
  OkrsModule,
  PeriodWindow,
  ProjectsModule,
} from "./types.ts";

export function buildModuleSuggestionPrompt(premise: string): string {
  return `Premissa: ${premise}

Liste os módulos do hub que devem ser cruzados para responder essa premissa estrategicamente.
Módulos possíveis: kpis, okrs, projects, initiatives, checkins, wizards.

Retorne APENAS JSON no formato:
{"modules": ["kpis","okrs"], "rationale": "..."}`;
}

export function buildAnalysisPrompt(req: GenerateRequest, data: CollectedData, win: PeriodWindow): string {
  const ctxBlock = req.additional_context?.trim()
    ? `=== CONTEXTO ADICIONAL FORNECIDO PELO USUÁRIO (PRIORITÁRIO) ===\n${req.additional_context.trim()}\n\nUse este contexto ANTES de qualquer dado estruturado para interpretar a situação.\n\n`
    : "";

  return `${ctxBlock}=== PREMISSA ===
${req.premise}

=== JANELA TEMPORAL ===
${win.from} → ${win.to}  (depth=${req.depth})

=== DADOS ESTRUTURADOS COLETADOS ===
${JSON.stringify(data, null, 2)}

${CANONICAL_PROGRESS_INTERPRETATION_RULES}

TAREFA:
Gere uma análise estratégica considerando o contexto de SaaS para o mercado imobiliário brasileiro (sazonalidade trimestral de transações).
Seja específico, acionável, identifique causas-raiz e correlações cross-módulo.

Retorne APENAS JSON no formato:
{
  "title": "string curta (até 80 chars)",
  "key_metrics": [{"label":"string","value":"string","reference":"string","delta":"string"}],
  "insights": [{"type":"info|warning|positive","title":"string","body":"string"}],
  "body": "texto corrido conectando insights, tom consultivo (até 4 parágrafos)",
  "sources": [{"module":"string","label":"string"}]
}
Máximo 5 insights. Métricas-chave apenas as 3 mais relevantes.`;
}

export function buildActionsPrompt(req: GenerateRequest, data: CollectedData): string {
  return `Premissa estratégica: ${req.premise}

Contexto (resumo):
${JSON.stringify({
    modules: req.modules,
    scope: req.scope,
    period: req.period,
    depth: req.depth,
    sample: {
      kpis_count: (data.kpis as KpisModule | undefined)?.kpis?.length ?? 0,
      okrs_count: (data.okrs as OkrsModule | undefined)?.teamObjectives?.length ?? 0,
      projects_count: (data.projects as ProjectsModule | undefined)?.projects?.length ?? 0,
      checkins_count: Array.isArray(data.checkins) ? data.checkins.length : 0,
    },
  })}

TAREFA: Gere 3 a 5 ações sugeridas, acionáveis e específicas, para destravar/avançar nessa premissa.
Cada ação pode ser:
- "open_resource": navegar para entidade existente (project, kr, kpi)
- "register_decision": registrar uma decisão formal

Retorne APENAS JSON:
{
  "actions": [
    {"type":"open_resource","label":"Ver projeto X","entity":"project","entityId":"<uuid ou null>"},
    {"type":"register_decision","label":"Definir dono do KR Y","suggestedCategory":"decision","suggestedText":"..."}
  ]
}`;
}
