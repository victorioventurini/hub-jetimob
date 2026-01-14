/**
 * Edge Function: okr-org-health-review
 * 
 * Avalia a SAÚDE DE EXECUÇÃO das OKRs organizacionais
 * Usa o agente "coach-okrs" configurado no Hub via invoke-vic
 * 
 * Dois modos:
 * - "objective": Analisa saúde de um objetivo específico
 * - "org-analysis": Análise consolidada da organização
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-current-bu-id",
};

// ============================================================
// TYPES
// ============================================================

interface LinkedTeamKr {
  teamId: string;
  teamName: string;
  teamKrTitle: string;
  teamKrProgress: number;
  lastCheckinAt: string | null;
}

interface OrgKr {
  id: string;
  title: string;
  baseline: number | null;
  target: number | null;
  currentValue: number | null;
  unit: string | null;
  progress: number;
  lastCheckinAt: string | null;
  linkedTeams: LinkedTeamKr[];
}

interface ObjectiveData {
  id: string;
  title: string;
  description?: string;
  progress: number;
  keyResults: OrgKr[];
}

interface RequestBody {
  mode: 'objective' | 'org-analysis';
  
  // Modo objective
  objective?: ObjectiveData;
  
  // Modo org-analysis
  objectives?: Array<{
    id: string;
    title: string;
    progress: number;
    healthScore: number;
    healthStatus: 'healthy' | 'attention' | 'risk';
    krCount: number;
    linkedTeamsCount: number;
  }>;
  gaps?: {
    objectivesAtRisk: number;
    objectivesNeedingAttention: number;
    krsWithoutContributions: number;
    krsWithoutRecentCheckins: number;
  };
  scores?: {
    cohesion: number;
    distribution: number;
    coverage: number;
    traceability: number;
    overall: number;
  };
}

// ============================================================
// RESPONSE PARSING
// ============================================================

interface ObjectiveHealthAnalysis {
  healthScore: number;
  status: 'healthy' | 'attention' | 'risk';
  summary: string;
  strengths: string[];
  risks: string[];
  suggestedActions: string[];
  generatedAt: string;
}

interface ConsolidatedAnalysis {
  overallHealthScore: number;
  overallStatus: 'healthy' | 'attention' | 'risk';
  summary: string;
  topRisks: Array<{ objectiveTitle: string; risk: string }>;
  topStrengths: Array<{ objectiveTitle: string; strength: string }>;
  recommendations: string[];
  generatedAt: string;
}

function parseObjectiveAnalysisResponse(content: string): ObjectiveHealthAnalysis {
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    // Fallback
    return {
      healthScore: 50,
      status: 'attention',
      summary: content.substring(0, 300),
      strengths: [],
      risks: ["Não foi possível analisar completamente"],
      suggestedActions: ["Revisar dados e tentar novamente"],
      generatedAt: new Date().toISOString(),
    };
  }
}

function parseConsolidatedResponse(content: string): ConsolidatedAnalysis {
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      overallHealthScore: 50,
      overallStatus: 'attention',
      summary: content.substring(0, 400),
      topRisks: [],
      topStrengths: [],
      recommendations: ["Revisar análise manualmente"],
      generatedAt: new Date().toISOString(),
    };
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  console.log("[okr-org-health-review] Request received:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const buId = req.headers.get("x-current-bu-id");
    const correlationId = req.headers.get("x-correlation-id") || crypto.randomUUID();

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!buId) {
      return new Response(
        JSON.stringify({ error: "BU ID required (x-current-bu-id header)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL não configurada");
    }

    // ────────────────────────────────────────────────────────────
    // MODO: OBJECTIVE (análise de um objetivo específico)
    // ────────────────────────────────────────────────────────────
    if (body.mode === 'objective') {
      console.log("[okr-org-health-review] Mode: objective");
      const { objective } = body;

      if (!objective) {
        return new Response(
          JSON.stringify({ error: "Objective data required for objective mode" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build KR list for analysis
      const krList = (objective.keyResults || []).map((kr, i) => {
        const linkedTeamsList = (kr.linkedTeams || []).map(t => 
          `${t.teamName} (${t.teamKrProgress}% de progresso, último check-in: ${t.lastCheckinAt ? new Date(t.lastCheckinAt).toLocaleDateString('pt-BR') : 'nunca'})`
        ).join(', ') || 'Nenhum time contribuindo';

        return `${i + 1}. **"${kr.title}"**
   - Baseline: ${kr.baseline ?? 'N/A'} → Target: ${kr.target ?? 'N/A'} ${kr.unit || ''}
   - Valor atual: ${kr.currentValue ?? 'N/A'} (${kr.progress}% progresso)
   - Último check-in: ${kr.lastCheckinAt ? new Date(kr.lastCheckinAt).toLocaleDateString('pt-BR') : 'Nunca'}
   - Times contribuindo: ${linkedTeamsList}`;
      }).join('\n\n');

      const userQuestion = `Analise a SAÚDE DE EXECUÇÃO deste OBJETIVO ORGANIZACIONAL e responda OBRIGATORIAMENTE em JSON:

**OBJETIVO:** ${objective.title}
${objective.description ? `**DESCRIÇÃO:** ${objective.description}` : ''}
**PROGRESSO GERAL:** ${objective.progress}%

**KEY RESULTS (${objective.keyResults.length}):**
${krList || 'CRÍTICO: Nenhum KR definido!'}

---

Analise:
1. Score de saúde de 0-100 considerando: progresso vs expectativa, frequência de check-ins, cobertura de contribuições de times
2. Status: "healthy" (>=70), "attention" (40-69), "risk" (<40)
3. Pontos fortes da execução
4. Riscos identificados
5. Ações sugeridas para melhorar a execução

Responda com JSON válido no formato EXATO abaixo:
{
  "healthScore": number (0-100),
  "status": "healthy" | "attention" | "risk",
  "summary": "Resumo da saúde de execução em 2-3 frases",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "risks": ["risco 1", "risco 2"],
  "suggestedActions": ["ação 1", "ação 2", "ação 3"]
}`;

      const contextData = {
        type: "okr_org_health_objective",
        objective: {
          id: objective.id,
          title: objective.title,
          progress: objective.progress,
          krCount: objective.keyResults.length,
        },
      };

      const vicResponse = await fetch(`${supabaseUrl}/functions/v1/invoke-vic`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
          "x-current-bu-id": buId,
          "x-correlation-id": correlationId,
        },
        body: JSON.stringify({
          buId,
          agentSlug: "coach-okrs",
          actionContext: "okr_org_health_objective",
          context: contextData,
          userQuestion,
          stream: false,
        }),
      });

      if (!vicResponse.ok) {
        const errorText = await vicResponse.text();
        console.error("[okr-org-health-review] objective error:", vicResponse.status, errorText);
        throw new Error(`invoke-vic error: ${vicResponse.status}`);
      }

      const vicData = await vicResponse.json();
      const content = vicData.response || vicData.content || vicData.message;

      if (!content) {
        console.error("[okr-org-health-review] objective: empty response", JSON.stringify(vicData));
        throw new Error("Resposta vazia do agente");
      }

      const analysis = parseObjectiveAnalysisResponse(content);
      console.log("[okr-org-health-review] Objective analysis generated, score:", analysis.healthScore);

      return new Response(
        JSON.stringify({ analysis }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ────────────────────────────────────────────────────────────
    // MODO: ORG-ANALYSIS (análise consolidada da organização)
    // ────────────────────────────────────────────────────────────
    if (body.mode === 'org-analysis') {
      console.log("[okr-org-health-review] Mode: org-analysis");
      const { objectives, gaps, scores } = body;

      if (!objectives?.length) {
        return new Response(
          JSON.stringify({ error: "Objectives required for org-analysis mode" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build objectives summary
      const objectivesList = objectives.map((obj, i) => {
        const statusEmoji = obj.healthStatus === 'healthy' ? '🟢' : 
                           obj.healthStatus === 'attention' ? '🟡' : '🔴';
        return `${i + 1}. ${statusEmoji} **"${obj.title}"**
   - Progresso: ${obj.progress}% | Saúde: ${obj.healthScore}/100 (${obj.healthStatus})
   - ${obj.krCount} KRs | ${obj.linkedTeamsCount} times contribuindo`;
      }).join('\n\n');

      const gapsText = gaps ? `
**GAPS IDENTIFICADOS:**
- Objetivos em risco: ${gaps.objectivesAtRisk}
- Objetivos precisando atenção: ${gaps.objectivesNeedingAttention}
- KRs sem contribuição de times: ${gaps.krsWithoutContributions}
- KRs sem check-ins recentes: ${gaps.krsWithoutRecentCheckins}` : '';

      const scoresText = scores ? `
**SCORES DE SAÚDE:**
- Coesão: ${scores.cohesion.toFixed(1)}/10
- Distribuição: ${scores.distribution.toFixed(1)}/10
- Cobertura: ${scores.coverage.toFixed(1)}/10
- Rastreabilidade: ${scores.traceability.toFixed(1)}/10
- **GERAL: ${scores.overall.toFixed(1)}/10**` : '';

      const userQuestion = `Faça uma ANÁLISE CONSOLIDADA da SAÚDE DE EXECUÇÃO das OKRs organizacionais e responda OBRIGATORIAMENTE em JSON:

=== OBJETIVOS ORGANIZACIONAIS (${objectives.length}) ===
${objectivesList}
${gapsText}
${scoresText}

---

Analise:
1. Score geral de saúde de execução (0-100)
2. Status geral: "healthy", "attention" ou "risk"
3. Principais riscos identificados (relacionando com objetivos específicos)
4. Principais fortalezas (relacionando com objetivos específicos)
5. Recomendações estratégicas para melhorar a execução

Responda com JSON válido no formato EXATO abaixo:
{
  "overallHealthScore": number (0-100),
  "overallStatus": "healthy" | "attention" | "risk",
  "summary": "Resumo executivo da saúde das OKRs organizacionais em 3-4 frases",
  "topRisks": [
    { "objectiveTitle": "Título do objetivo", "risk": "Descrição do risco" }
  ],
  "topStrengths": [
    { "objectiveTitle": "Título do objetivo", "strength": "Descrição do ponto forte" }
  ],
  "recommendations": ["recomendação 1", "recomendação 2", "recomendação 3"]
}`;

      const contextData = {
        type: "okr_org_health_consolidated",
        objectivesCount: objectives.length,
        healthySummary: {
          healthy: objectives.filter(o => o.healthStatus === 'healthy').length,
          attention: objectives.filter(o => o.healthStatus === 'attention').length,
          risk: objectives.filter(o => o.healthStatus === 'risk').length,
        },
        gaps,
        scores,
      };

      const vicResponse = await fetch(`${supabaseUrl}/functions/v1/invoke-vic`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
          "x-current-bu-id": buId,
          "x-correlation-id": correlationId,
        },
        body: JSON.stringify({
          buId,
          agentSlug: "coach-okrs",
          actionContext: "okr_org_health_consolidated",
          context: contextData,
          userQuestion,
          stream: false,
        }),
      });

      if (!vicResponse.ok) {
        const errorText = await vicResponse.text();
        console.error("[okr-org-health-review] org-analysis error:", vicResponse.status, errorText);
        throw new Error(`invoke-vic error: ${vicResponse.status}`);
      }

      const vicData = await vicResponse.json();
      const content = vicData.response || vicData.content || vicData.message;

      if (!content) {
        console.error("[okr-org-health-review] org-analysis: empty response", JSON.stringify(vicData));
        throw new Error("Resposta vazia do agente");
      }

      const consolidatedAnalysis = parseConsolidatedResponse(content);
      console.log("[okr-org-health-review] Consolidated analysis generated, score:", consolidatedAnalysis.overallHealthScore);

      return new Response(
        JSON.stringify({ consolidatedAnalysis }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalid mode
    return new Response(
      JSON.stringify({ error: "Invalid mode. Use 'objective' or 'org-analysis'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[okr-org-health-review] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
