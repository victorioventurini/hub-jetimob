/**
 * team-checkin-summary - Orchestrates AI agents to send team check-in summary email
 * 
 * Flow:
 * 1. Validates auth + BU via middleware
 * 2. Checks idempotency via summary_sent_at
 * 3. Loads team data, members, OKRs, KRs, KPIs in parallel
 * 4. Filters exceptions (management by exception)
 * 5. Orchestrates 4 AI agents in parallel via direct LLM calls
 * 6. Emits notification via canonical emit_notification_event RPC
 * 7. Marks session as summary sent
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  withMiddleware,
  createServiceClient,
  logRequestCompletion,
  type RequestContext,
} from "../_shared/middleware.ts";
import {
  successResponse,
  errorResponse,
} from "../_shared/response.ts";
import { loadAgent, buildSystemPrompt } from "../_shared/agent-loader.ts";
import { resolveLLMConfig, llmComplete, type LLMMessage } from "../_shared/llm-client.ts";

// ============================================================================
// Types
// ============================================================================

interface TeamCheckinSummaryRequest {
  teamId: string;
  cycleId: string;
  sessionId: string;
  bu_id: string;
}

interface CycleInfo {
  id: string;
  name: string;
  type: 'month' | 'quarter' | 'semester' | 'year';
  startDate: Date;
  endDate: Date;
}

interface PaceAnalysis {
  status: 'above_pace' | 'on_pace' | 'below_pace' | 'not_started' | 'completed';
  label: string;
  expectedProgress: number;
  cycleElapsed: number;
  interpretation: string;
}

interface AgentContextData {
  teamName: string;
  cycleName: string;
  cycleType: string;
  cycleElapsedPercent: number;
  buName: string;
  objectives: ObjectiveSummary[];
  krsHighlight: KrHighlight[];
  kpisRelevant: KpiSummary[];
  decisions: DecisionSummary[];
  pendingUpdates: PendingUpdate[];
  paceGuidance: string;
}

interface ObjectiveSummary {
  title: string;
  status: string;
  progress: number;
  paceStatus: string;
  paceInterpretation: string;
}

interface KrHighlight {
  title: string;
  objectiveTitle: string;
  status: string;
  currentValue: number | null;
  targetValue: number | null;
  progress: number;
  paceStatus: string;
  paceInterpretation: string;
}

interface KpiSummary {
  name: string;
  currentValue: number | null;
  targetValue: number | null;
  status: string;
  isPrimary: boolean;
  linkedKrCycle?: string;
}

interface DecisionSummary {
  text: string;
  type: 'decision' | 'initiative' | 'risk';
}

interface PendingUpdate {
  entityType: 'kr' | 'kpi';
  title: string;
  lastUpdated: string | null;
}

interface AgentSections {
  opening_text: string;
  objectives_summary: string;
  krs_highlight: string;
  kpis_summary: string;
  initiatives_summary: string;
  risks_summary: string;
  next_focus: string;
  culture_message: string;
  closing_text: string;
}

// ============================================================================
// Helper Functions - Canonical Progress Interpretation
// ============================================================================

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateExpectedProgress(
  cycleStart: Date,
  cycleEnd: Date,
  referenceDate: Date = new Date()
): number {
  const start = cycleStart.getTime();
  const end = cycleEnd.getTime();
  const now = referenceDate.getTime();
  
  if (now < start) return 0;
  if (now > end) return 100;
  
  const totalDuration = end - start;
  const elapsed = now - start;
  
  return Math.round((elapsed / totalDuration) * 100);
}

function analyzePace(
  actualProgress: number,
  cycleStart: Date,
  cycleEnd: Date,
  cycleType: string,
  tolerancePercent: number = 10
): PaceAnalysis {
  const expectedProgress = calculateExpectedProgress(cycleStart, cycleEnd);
  const cycleElapsed = expectedProgress;
  const gap = actualProgress - expectedProgress;
  
  const cycleLabels: Record<string, string> = {
    month: 'mensal',
    quarter: 'trimestral',
    semester: 'semestral',
    year: 'anual',
  };
  const cycleLabel = cycleLabels[cycleType] || cycleType;
  
  if (actualProgress >= 100) {
    return {
      status: 'completed',
      label: 'Meta atingida',
      expectedProgress,
      cycleElapsed,
      interpretation: `Meta do ciclo ${cycleLabel} já foi atingida.`,
    };
  }
  
  if (actualProgress === 0 && cycleElapsed > 10) {
    return {
      status: 'not_started',
      label: 'Não iniciado',
      expectedProgress,
      cycleElapsed,
      interpretation: `KR ainda não iniciou, com ${cycleElapsed}% do ciclo ${cycleLabel} transcorrido.`,
    };
  }
  
  if (cycleElapsed <= 15) {
    return {
      status: 'on_pace',
      label: 'Início do ciclo',
      expectedProgress,
      cycleElapsed,
      interpretation: `Ciclo ${cycleLabel} ainda no início. Progresso atual: ${actualProgress}%.`,
    };
  }
  
  if (gap >= tolerancePercent) {
    return {
      status: 'above_pace',
      label: 'Acima do ritmo',
      expectedProgress,
      cycleElapsed,
      interpretation: `Acima do ritmo esperado para este ponto do ciclo ${cycleLabel} (+${gap.toFixed(0)}%).`,
    };
  }
  
  if (gap <= -tolerancePercent) {
    return {
      status: 'below_pace',
      label: 'Abaixo do ritmo',
      expectedProgress,
      cycleElapsed,
      interpretation: `Abaixo do ritmo esperado para este ponto do ciclo ${cycleLabel} (${gap.toFixed(0)}%).`,
    };
  }
  
  return {
    status: 'on_pace',
    label: 'Dentro do ritmo',
    expectedProgress,
    cycleElapsed,
    interpretation: `Dentro do ritmo esperado para o ciclo ${cycleLabel}.`,
  };
}

function getKrStatus(progress: number, updatedRecently: boolean): string {
  if (!updatedRecently) return 'desatualizado';
  if (progress >= 100) return 'atingido';
  if (progress >= 70) return 'no ritmo';
  if (progress >= 40) return 'atenção';
  return 'fora da trilha';
}

function generatePaceGuidance(cycleType: string, cycleElapsed: number): string {
  const cycleLabels: Record<string, string> = {
    month: 'mensal',
    quarter: 'trimestral',
    semester: 'semestral',
    year: 'anual',
  };
  const cycleLabel = cycleLabels[cycleType] || cycleType;
  
  return `
CONTEXTO TEMPORAL OBRIGATÓRIO:
- Ciclo: ${cycleLabel}
- Tempo transcorrido: ${cycleElapsed}%
- Progresso esperado neste ponto: ~${cycleElapsed}%

REGRAS DE INTERPRETAÇÃO:
1. Avalie progresso em relação ao RITMO, não ao valor final
2. Use: "dentro do ritmo", "acima do ritmo", "abaixo do ritmo"
3. NUNCA use: "atrasado", "falhou", "insuficiente"
4. Para metas de longo prazo, considere a proporcionalidade
5. Início de ciclo (<15%): não fazer julgamentos negativos
`;
}

function extractOrFallback(
  result: PromiseSettledResult<string>,
  fallback: string
): string {
  if (result.status === 'fulfilled' && result.value) {
    return result.value;
  }
  return fallback;
}

/**
 * Sanitize JSON response from AI agents that may wrap output in markdown code fences.
 * E.g. ```json\n{...}\n``` → {...}
 */
function sanitizeJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  return cleaned.trim();
}

// ============================================================================
// Agent Invocation — Direct LLM (no HTTP invoke-vic dependency)
// ============================================================================

/**
 * Invoke an AI agent directly using shared modules.
 * This bypasses invoke-vic HTTP calls and doesn't require a user JWT.
 * Respects model/provider configured in hub_integrations_global_config.
 */
async function invokeAgentDirect(
  serviceClient: any,
  agentSlug: string,
  userPromptContent: string,
  buId: string,
  requestId: string
): Promise<string> {
  // 1. Load agent config (cached)
  const loaded = await loadAgent(serviceClient, agentSlug, buId, requestId);
  if (!loaded) {
    console.warn(`[${requestId}] Agent ${agentSlug} not found or disabled, using fallback`);
    return '';
  }

  if (!loaded.isEnabledInBu) {
    console.warn(`[${requestId}] Agent ${agentSlug} disabled for BU ${buId}`);
    return '';
  }

  // 2. Resolve LLM config (respects hub integration settings)
  const llmConfig = await resolveLLMConfig(serviceClient, loaded.agent.model_name);
  if (!llmConfig) {
    console.error(`[${requestId}] No LLM config resolved for agent ${agentSlug}`);
    throw new Error(`NO_LLM_CONFIG for ${agentSlug}`);
  }

  // 3. Build system prompt (with Vic persona, canonical rules, documents, instruction sources)
  const systemPrompt = await buildSystemPrompt(
    serviceClient,
    loaded.agent,
    loaded.effectiveSystemPrompt,
    buId,
    requestId
  );

  // 4. Call LLM
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPromptContent },
  ];

  const maxTokens = loaded.agent.max_tokens || llmConfig.maxTokens;
  const temperature = loaded.agent.temperature ?? llmConfig.temperature;

  console.log(`[${requestId}] Calling LLM for agent ${agentSlug} (model: ${llmConfig.model})`);
  const response = await llmComplete(llmConfig, messages, { maxTokens, temperature });

  return response.content || '';
}

// ============================================================================
// Data Loading
// ============================================================================

async function loadTeamData(
  serviceClient: any,
  teamId: string,
  cycleId: string,
  buId: string
): Promise<{
  team: { id: string; name: string };
  cycle: CycleInfo;
  buName: string;
  members: string[]; // auth.users.id
  objectives: ObjectiveSummary[];
  krsHighlight: KrHighlight[];
  kpisRelevant: KpiSummary[];
  cycleElapsedPercent: number;
  paceGuidance: string;
}> {
  // Load all data in parallel
  const [
    teamResult,
    cycleResult,
    buResult,
    membersResult,
    objectivesResult,
    kpisResult,
    krMetricsResult,
  ] = await Promise.all([
    // Team info
    serviceClient
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single(),
    
    // Cycle info with dates for pace calculation
    serviceClient
      .from('cycles')
      .select('id, name, type, start_date, end_date')
      .eq('id', cycleId)
      .single(),
    
    // BU name
    serviceClient
      .from('bu_units')
      .select('name')
      .eq('id', buId)
      .single(),
    
    // Team members via user_team_memberships + profiles (IDENTITY_CONVENTION)
    // Note: user_team_memberships has no deleted_at column; existence = active
    serviceClient
      .from('user_team_memberships')
      .select('profiles!inner(user_id)')
      .eq('team_id', teamId),
    
    // Team objectives with KRs
    serviceClient
      .from('okr_team_objectives')
      .select(`
        id, title, progress,
        okr_team_key_results!inner (
          id, title, current_value, target_value, progress, updated_at
        )
      `)
      .eq('team_id', teamId)
      .eq('cycle_id', cycleId)
      .is('deleted_at', null),

    // KPIs: kpi_metrics + latest kpi_values
    serviceClient
      .from('kpi_metrics')
      .select('id, name, target_value, updated_at, team_id, direction, kpi_values(value, reference_date, rag_status)')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('reference_date', { referencedTable: 'kpi_values', ascending: false })
      .limit(1, { referencedTable: 'kpi_values' }),

    // KR-KPI links to determine primary KPIs
    serviceClient
      .from('okr_kr_metrics')
      .select('kpi_metric_id, role')
      .eq('role', 'primary'),
  ]);

  const team = teamResult.data || { id: teamId, name: 'Time' };
  const cycleData = cycleResult.data;
  
  const cycle: CycleInfo = {
    id: cycleData?.id || cycleId,
    name: cycleData?.name || 'Ciclo',
    type: cycleData?.type || 'quarter',
    startDate: cycleData?.start_date ? new Date(cycleData.start_date) : new Date(),
    endDate: cycleData?.end_date ? new Date(cycleData.end_date) : new Date(),
  };
  
  const buName = buResult.data?.name || 'Empresa';
  
  const cycleElapsedPercent = calculateExpectedProgress(cycle.startDate, cycle.endDate);
  const paceGuidance = generatePaceGuidance(cycle.type, cycleElapsedPercent);
  
  // Build member auth IDs from user_team_memberships (with fallback to profiles.team_id)
  let memberAuthIds: string[] = [];
  if (membersResult.data && membersResult.data.length > 0) {
    memberAuthIds = membersResult.data
      .map((m: any) => m.profiles?.user_id)
      .filter(Boolean);
  } else {
    // Fallback: profiles.team_id (canonical source when junction table is empty)
    console.log(`[loadTeamData] user_team_memberships empty for team ${teamId}, falling back to profiles.team_id`);
    const { data: profileMembers } = await serviceClient
      .from('profiles')
      .select('user_id')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .not('user_id', 'is', null);

    if (profileMembers) {
      memberAuthIds = profileMembers.map((p: any) => p.user_id).filter(Boolean);
    }
  }
  
  // Add team leader
  const { data: teamLeader } = await serviceClient
    .from('teams')
    .select('profiles!leader_user_id(user_id)')
    .eq('id', teamId)
    .single();
  
  if (teamLeader?.profiles?.user_id) {
    memberAuthIds.push(teamLeader.profiles.user_id);
  }

  // ── Expand recipients: include members of direct sub-teams WITHOUT own OKRs ──
  const { data: directSubteams } = await serviceClient
    .from('teams')
    .select('id, name, leader_user_id')
    .eq('parent_team_id', teamId)
    .eq('status', 'active')
    .is('deleted_at', null);

  if (directSubteams && directSubteams.length > 0) {
    const subteamIds = directSubteams.map((s: any) => s.id);

    // Check which sub-teams have their own OKRs in the current cycle
    const { data: subteamOkrs } = await serviceClient
      .from('okr_team_objectives')
      .select('team_id')
      .in('team_id', subteamIds)
      .eq('cycle_id', cycleId)
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled","discarded")');

    const subteamsWithOkrs = new Set((subteamOkrs || []).map((o: any) => o.team_id));
    const subteamsWithoutOkrs = directSubteams.filter((s: any) => !subteamsWithOkrs.has(s.id));

    if (subteamsWithoutOkrs.length > 0) {
      const subteamIdsWithoutOkrs = subteamsWithoutOkrs.map((s: any) => s.id);
      console.log(`[loadTeamData] Including members from ${subteamsWithoutOkrs.length} sub-team(s) without own OKRs: ${subteamsWithoutOkrs.map((s: any) => s.name).join(', ')}`);

      // Fetch members via user_team_memberships (canonical)
      const { data: subMembers } = await serviceClient
        .from('user_team_memberships')
        .select('profiles!inner(user_id)')
        .in('team_id', subteamIdsWithoutOkrs);

      if (subMembers && subMembers.length > 0) {
        const subMemberIds = subMembers
          .map((m: any) => m.profiles?.user_id)
          .filter(Boolean);
        memberAuthIds.push(...subMemberIds);
      } else {
        // Fallback: profiles.team_id
        console.log(`[loadTeamData] user_team_memberships empty for sub-teams, falling back to profiles.team_id`);
        const { data: subProfileMembers } = await serviceClient
          .from('profiles')
          .select('user_id')
          .in('team_id', subteamIdsWithoutOkrs)
          .is('deleted_at', null)
          .not('user_id', 'is', null);

        if (subProfileMembers) {
          memberAuthIds.push(...subProfileMembers.map((p: any) => p.user_id).filter(Boolean));
        }
      }

      // Include leaders of sub-teams without OKRs
      for (const sub of subteamsWithoutOkrs) {
        if (sub.leader_user_id) {
          // leader_user_id is profiles.id, resolve to auth user_id
          const { data: leaderProfile } = await serviceClient
            .from('profiles')
            .select('user_id')
            .eq('id', sub.leader_user_id)
            .single();

          if (leaderProfile?.user_id) {
            memberAuthIds.push(leaderProfile.user_id);
          }
        }
      }
    }
  }

  // Deduplicate
  memberAuthIds = [...new Set(memberAuthIds)];

  // Build set of primary KPI IDs
  const primaryKpiIds = new Set<string>();
  if (krMetricsResult.data) {
    for (const link of krMetricsResult.data) {
      primaryKpiIds.add(link.kpi_metric_id);
    }
  }

  // Process objectives and KRs
  const objectives: ObjectiveSummary[] = [];
  const krsHighlight: KrHighlight[] = [];
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const obj of (objectivesResult.data || [])) {
    const objPace = analyzePace(obj.progress || 0, cycle.startDate, cycle.endDate, cycle.type);
    objectives.push({
      title: obj.title,
      status: objPace.label,
      progress: obj.progress || 0,
      paceStatus: objPace.status,
      paceInterpretation: objPace.interpretation,
    });

    for (const kr of (obj.okr_team_key_results || [])) {
      const updatedAt = kr.updated_at ? new Date(kr.updated_at) : null;
      const updatedRecently = updatedAt ? updatedAt > oneWeekAgo : false;
      const progress = kr.progress || 0;
      const status = getKrStatus(progress, updatedRecently);
      const krPace = analyzePace(progress, cycle.startDate, cycle.endDate, cycle.type);

      if (status !== 'no ritmo' || progress >= 100) {
        krsHighlight.push({
          title: kr.title,
          objectiveTitle: obj.title,
          status,
          currentValue: kr.current_value,
          targetValue: kr.target_value,
          progress,
          paceStatus: krPace.status,
          paceInterpretation: krPace.interpretation,
        });
      }
    }
  }

  // Process KPIs from kpi_metrics + kpi_values
  const kpisRelevant: KpiSummary[] = [];
  for (const kpi of (kpisResult.data || [])) {
    const latestValue = kpi.kpi_values?.[0] || null;
    const currentValue = latestValue?.value ?? null;
    const ragStatus = latestValue?.rag_status || null;
    const hasTarget = kpi.target_value !== null;
    const isPrimary = primaryKpiIds.has(kpi.id);

    // Determine update freshness
    const referenceDate = latestValue?.reference_date ? new Date(latestValue.reference_date) : null;
    const updatedRecently = referenceDate ? referenceDate > oneWeekAgo : false;

    // Determine status from rag_status or compute
    let status = 'ok';
    if (!updatedRecently) {
      status = 'desatualizado';
    } else if (ragStatus === 'red') {
      status = 'atenção';
    } else if (ragStatus === 'yellow') {
      status = 'atenção';
    }

    // Include if primary, off target, or not updated
    if (isPrimary || status !== 'ok') {
      kpisRelevant.push({
        name: kpi.name,
        currentValue,
        targetValue: kpi.target_value,
        status,
        isPrimary,
      });
    }
  }

  return {
    team,
    cycle,
    buName,
    members: memberAuthIds,
    objectives,
    krsHighlight,
    kpisRelevant,
    cycleElapsedPercent,
    paceGuidance,
  };
}

async function loadSessionDecisions(
  serviceClient: any,
  sessionId: string
): Promise<DecisionSummary[]> {
  const { data: session } = await serviceClient
    .from('okr_wizard_sessions')
    .select('reflection_data')
    .eq('id', sessionId)
    .single();

  if (!session?.reflection_data) return [];

  const reflectionData = session.reflection_data as any;
  const decisions: DecisionSummary[] = [];

  const categoryToType: Record<string, string> = {
    decision: 'Decisão',
    focus_adjustment: 'Ajuste de Foco',
    next_step: 'Próximo Passo',
  };

  if (reflectionData.data?.decisions) {
    for (const decision of reflectionData.data.decisions) {
      const rawCategory = decision.category || decision.type || 'decision';
      decisions.push({
        text: decision.text || decision.description || '',
        type: categoryToType[rawCategory] || rawCategory,
      });
    }
  }

  return decisions;
}

// ============================================================================
// Agent Orchestration
// ============================================================================

async function orchestrateAgents(
  serviceClient: any,
  buId: string,
  agentContext: AgentContextData,
  requestId: string
): Promise<AgentSections> {
  const contextJson = JSON.stringify(agentContext);

  // Parallel agent invocations with Promise.allSettled for resilience
  const [
    analistaResult,
    facilitadorResult,
    culturaResult,
    revisorResult,
  ] = await Promise.allSettled([
    // Analista de KPIs
    invokeAgentDirect(serviceClient, 'analista-kpis', 
      `Contexto do check-in:\n${contextJson}\n\nGere um resumo executivo do check-in do time focando em exceções.
Retorne em formato JSON com as chaves:
- objectives_summary: resumo dos objetivos (2-3 frases)
- krs_highlight: KRs em destaque formatados como lista markdown
- kpis_summary: indicadores relevantes formatados como lista markdown
Foque apenas no que está fora do esperado. Não seja punitivo.`,
      buId, requestId),

    // Facilitador de Decisões
    invokeAgentDirect(serviceClient, 'facilitador-decisoes',
      `Contexto do check-in:\n${contextJson}\n\nAnalise as decisões e riscos do check-in.
Retorne em formato JSON com as chaves:
- initiatives_summary: resumo das iniciativas e decisões (2-3 frases)
- risks_summary: até 3 riscos/bloqueios formatados como lista markdown
- next_focus: 2-4 próximos focos práticos formatados como lista markdown
Linguagem construtiva, orientada a ação.`,
      buId, requestId),

    // Guardião da Cultura
    invokeAgentDirect(serviceClient, 'cultura',
      `Contexto: culture_message
Time: ${agentContext.teamName}, Ciclo: ${agentContext.cycleName}
Tem riscos: ${agentContext.krsHighlight.some(kr => kr.status === 'fora da trilha')}

Gere uma mensagem cultural curta (máximo 60 caracteres).
Deve ser inspiradora, contextual ao momento do time.
Tom positivo, orientado a aprendizado. Sem aspas.`,
      buId, requestId),

    // Revisor de Comunicação
    invokeAgentDirect(serviceClient, 'revisor-comunicacao',
      `Contexto: abertura e encerramento do e-mail de check-in
Time: ${agentContext.teamName}, Ciclo: ${agentContext.cycleName}, BU: ${agentContext.buName}

Crie abertura e encerramento para o e-mail de resumo do check-in.
Retorne em formato JSON com as chaves:
- opening_text: 2-3 frases de abertura contextualizando o fechamento do check-in
- closing_text: 1-2 frases de encerramento com tom positivo
Linguagem humana, sem burocracia. Não mencione "Hub" na abertura.`,
      buId, requestId),
  ]);

  // Extract results with fallbacks
  let sections: AgentSections = {
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

  // Parse Analista response
  try {
    const analistaContent = sanitizeJsonResponse(extractOrFallback(analistaResult, '{}'));
    const analistaJson = JSON.parse(analistaContent);
    if (analistaJson.objectives_summary) sections.objectives_summary = analistaJson.objectives_summary;
    if (analistaJson.krs_highlight) sections.krs_highlight = analistaJson.krs_highlight;
    if (analistaJson.kpis_summary) sections.kpis_summary = analistaJson.kpis_summary;
  } catch (e) {
    console.warn('Failed to parse analista response:', e);
    const raw = extractOrFallback(analistaResult, '');
    if (raw && !raw.startsWith('{')) {
      sections.objectives_summary = raw;
    }
  }

  // Parse Facilitador response
  try {
    const facilitadorContent = sanitizeJsonResponse(extractOrFallback(facilitadorResult, '{}'));
    const facilitadorJson = JSON.parse(facilitadorContent);
    if (facilitadorJson.initiatives_summary) sections.initiatives_summary = facilitadorJson.initiatives_summary;
    if (facilitadorJson.risks_summary) sections.risks_summary = facilitadorJson.risks_summary;
    if (facilitadorJson.next_focus) sections.next_focus = facilitadorJson.next_focus;
  } catch (e) {
    console.warn('Failed to parse facilitador response:', e);
  }

  // Parse Cultura response (simple string)
  const culturaContent = extractOrFallback(culturaResult, sections.culture_message);
  if (culturaContent && culturaContent.length <= 100) {
    sections.culture_message = culturaContent.replace(/^["']|["']$/g, '').trim();
  }

  // Parse Revisor response
  try {
    const revisorContent = sanitizeJsonResponse(extractOrFallback(revisorResult, '{}'));
    const revisorJson = JSON.parse(revisorContent);
    if (revisorJson.opening_text) sections.opening_text = revisorJson.opening_text;
    if (revisorJson.closing_text) sections.closing_text = revisorJson.closing_text;
  } catch (e) {
    console.warn('Failed to parse revisor response:', e);
  }

  return sections;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const mw = await withMiddleware(req, {
    requireAuth: false,
    requireBu: true,
    validateBuAccess: false,
    logRequest: true,
  });

  if (!mw.success) {
    return mw.error!;
  }

  const ctx = mw.context as RequestContext;
  const requestId = ctx.requestId;
  const buId = ctx.buId!;
  const serviceClient = ctx.serviceClient;

  try {
    const body: TeamCheckinSummaryRequest = await req.json();
    const { teamId, cycleId, sessionId } = body;

    if (!teamId || !cycleId || !sessionId) {
      return errorResponse('Missing required fields: teamId, cycleId, sessionId', 400, {
        requestId,
        error: 'MISSING_FIELDS',
      });
    }

    console.log(`[${requestId}] Team checkin summary: team=${teamId}, cycle=${cycleId}, session=${sessionId}`);

    // Check idempotency
    const { data: session, error: sessionError } = await serviceClient
      .from('okr_wizard_sessions')
      .select('id, summary_sent_at, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.warn(`[${requestId}] Session not found: ${sessionId}`);
      return successResponse({ skipped: true, reason: 'session_not_found' });
    }

    if (session.summary_sent_at) {
      console.log(`[${requestId}] Summary already sent at ${session.summary_sent_at}`);
      return successResponse({ skipped: true, reason: 'already_sent' });
    }

    // Load data in parallel
    const [teamData, decisions] = await Promise.all([
      loadTeamData(serviceClient, teamId, cycleId, buId),
      loadSessionDecisions(serviceClient, sessionId),
    ]);

    if (teamData.members.length === 0) {
      console.warn(`[${requestId}] No team members found`);
      return successResponse({ skipped: true, reason: 'no_members' });
    }

    // Build pending updates list
    const pendingUpdates: PendingUpdate[] = [
      ...teamData.krsHighlight
        .filter(kr => kr.status === 'desatualizado')
        .map(kr => ({ entityType: 'kr' as const, title: kr.title, lastUpdated: null })),
      ...teamData.kpisRelevant
        .filter(kpi => kpi.status === 'desatualizado')
        .map(kpi => ({ entityType: 'kpi' as const, title: kpi.name, lastUpdated: null })),
    ];

    // Build agent context
    const agentContext: AgentContextData = {
      teamName: teamData.team.name,
      cycleName: teamData.cycle.name,
      cycleType: teamData.cycle.type,
      cycleElapsedPercent: teamData.cycleElapsedPercent,
      buName: teamData.buName,
      objectives: teamData.objectives,
      krsHighlight: teamData.krsHighlight,
      kpisRelevant: teamData.kpisRelevant,
      decisions,
      pendingUpdates,
      paceGuidance: teamData.paceGuidance,
    };

    // Orchestrate AI agents (direct LLM, no HTTP invoke-vic)
    console.log(`[${requestId}] Orchestrating AI agents (direct LLM)...`);
    const sections = await orchestrateAgents(serviceClient, buId, agentContext, requestId);

    // Build notification metadata
    const currentDatetime = formatDate(new Date());
    const contextUrl = `/okrs/ritual-history?session=${sessionId}`;

    const metadata = {
      team_name: teamData.team.name,
      cycle_name: teamData.cycle.name,
      bu_name: teamData.buName,
      current_datetime: currentDatetime,
      opening_text: sections.opening_text,
      objectives_summary: sections.objectives_summary,
      krs_highlight: sections.krs_highlight,
      kpis_summary: sections.kpis_summary,
      initiatives_summary: sections.initiatives_summary,
      risks_summary: sections.risks_summary,
      next_focus: sections.next_focus,
      culture_message: sections.culture_message,
      closing_text: sections.closing_text,
      context_url: contextUrl,
    };

    // Emit notification via canonical RPC
    console.log(`[${requestId}] Emitting notification to ${teamData.members.length} recipients`);
    // Pass null actor_id so the leader (who triggered the check-in) also receives the summary
    const { error: notifyError } = await serviceClient.rpc('emit_notification_event', {
      p_event_slug: 'team.checkin.summary',
      p_bu_id: buId,
      p_recipient_user_ids: teamData.members,
      p_actor_id: null,
      p_title: `Check-in do time ${teamData.team.name}`,
      p_message: `Resumo do check-in do ciclo ${teamData.cycle.name}`,
      p_context_type: 'team_checkin',
      p_context_id: sessionId,
      p_context_url: contextUrl,
      p_metadata: metadata,
    });

    if (notifyError) {
      console.error(`[${requestId}] Notification emit failed:`, notifyError);
    }

    // Mark session as summary sent (idempotency)
    const { error: updateError } = await serviceClient
      .from('okr_wizard_sessions')
      .update({ summary_sent_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (updateError) {
      console.error(`[${requestId}] Failed to mark summary sent:`, updateError);
    }

    logRequestCompletion(ctx, 'success');
    return successResponse({
      success: true,
      recipientCount: teamData.members.length,
      sessionId,
    });

  } catch (error) {
    console.error(`[${requestId}] Team checkin summary error:`, error);
    logRequestCompletion(ctx, 'error', error instanceof Error ? error.message : 'Unknown error');
    
    return errorResponse(
      'Failed to send team checkin summary',
      500,
      { requestId, error: 'SUMMARY_FAILED' }
    );
  }
});
