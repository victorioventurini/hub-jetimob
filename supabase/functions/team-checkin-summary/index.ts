/**
 * team-checkin-summary - Orchestrates AI agents to send team check-in summary email
 * 
 * Flow:
 * 1. Validates auth + BU via middleware
 * 2. Checks idempotency via summary_sent_at
 * 3. Loads team data, members, OKRs, KRs, KPIs in parallel
 * 4. Filters exceptions (management by exception)
 * 5. Orchestrates 4 AI agents in parallel via invoke-vic
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

// ============================================================================
// Types
// ============================================================================

interface TeamCheckinSummaryRequest {
  teamId: string;
  cycleId: string;
  sessionId: string;
  bu_id: string;
}

interface AgentContext {
  teamName: string;
  cycleName: string;
  buName: string;
  objectives: ObjectiveSummary[];
  krsHighlight: KrHighlight[];
  kpisRelevant: KpiSummary[];
  decisions: DecisionSummary[];
  pendingUpdates: PendingUpdate[];
}

interface ObjectiveSummary {
  title: string;
  status: string;
  progress: number;
}

interface KrHighlight {
  title: string;
  objectiveTitle: string;
  status: string;
  currentValue: number | null;
  targetValue: number | null;
  progress: number;
}

interface KpiSummary {
  name: string;
  currentValue: number | null;
  targetValue: number | null;
  status: string;
  isPrimary: boolean;
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
// Helper Functions
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

function getKrStatus(progress: number, updatedRecently: boolean): string {
  if (!updatedRecently) return 'desatualizado';
  if (progress >= 100) return 'atingido';
  if (progress >= 70) return 'no ritmo';
  if (progress >= 40) return 'atenção';
  return 'fora da trilha';
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

// ============================================================================
// Agent Invocation
// ============================================================================

async function invokeVicAgent(
  supabaseUrl: string,
  authHeader: string,
  agentSlug: string,
  actionContext: string,
  context: Record<string, unknown>,
  buId: string
): Promise<string> {
  const response = await fetch(`${supabaseUrl}/functions/v1/invoke-vic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({
      agentSlug,
      actionContext,
      context,
      bu_id: buId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Agent ${agentSlug} failed:`, response.status, errorText);
    throw new Error(`Agent ${agentSlug} failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.content || data.content || '';
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
  cycle: { id: string; name: string };
  buName: string;
  members: string[]; // auth.users.id
  objectives: ObjectiveSummary[];
  krsHighlight: KrHighlight[];
  kpisRelevant: KpiSummary[];
}> {
  // Load all data in parallel
  const [
    teamResult,
    cycleResult,
    buResult,
    membersResult,
    objectivesResult,
  ] = await Promise.all([
    // Team info
    serviceClient
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single(),
    
    // Cycle info
    serviceClient
      .from('okr_cycles')
      .select('id, name')
      .eq('id', cycleId)
      .single(),
    
    // BU name
    serviceClient
      .from('bu_units')
      .select('name')
      .eq('id', buId)
      .single(),
    
    // Team members (returns auth.users.id per IDENTITY_CONVENTION)
    serviceClient.rpc('get_team_member_auth_ids', { p_team_id: teamId }),
    
    // Team objectives with KRs
    serviceClient
      .from('okr_objectives')
      .select(`
        id, title, progress,
        okr_key_results!inner (
          id, title, current_value, target_value, progress, updated_at
        )
      `)
      .eq('owner_team_id', teamId)
      .eq('cycle_id', cycleId)
      .is('deleted_at', null),
  ]);

  // Load KPIs for team
  const { data: kpisData } = await serviceClient
    .from('kpis')
    .select('id, name, current_value, target_value, is_primary, updated_at')
    .eq('owner_team_id', teamId)
    .is('deleted_at', null);

  const team = teamResult.data || { id: teamId, name: 'Time' };
  const cycle = cycleResult.data || { id: cycleId, name: 'Ciclo' };
  const buName = buResult.data?.name || 'Empresa';
  
  // Get auth user IDs - fallback to manual query if RPC doesn't exist
  let memberAuthIds: string[] = [];
  if (membersResult.data) {
    memberAuthIds = membersResult.data;
  } else {
    // Fallback: manual query following IDENTITY_CONVENTION
    const { data: membersManual } = await serviceClient
      .from('user_team_memberships')
      .select('profiles!inner(user_id)')
      .eq('team_id', teamId)
      .is('deleted_at', null);
    
    if (membersManual) {
      memberAuthIds = membersManual
        .map((m: any) => m.profiles?.user_id)
        .filter(Boolean);
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
    
    // Deduplicate
    memberAuthIds = [...new Set(memberAuthIds)];
  }

  // Process objectives and KRs
  const objectives: ObjectiveSummary[] = [];
  const krsHighlight: KrHighlight[] = [];
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const obj of (objectivesResult.data || [])) {
    objectives.push({
      title: obj.title,
      status: obj.progress >= 70 ? 'no ritmo' : obj.progress >= 40 ? 'atenção' : 'fora da trilha',
      progress: obj.progress || 0,
    });

    // Filter KRs for exceptions only
    for (const kr of (obj.okr_key_results || [])) {
      const updatedAt = kr.updated_at ? new Date(kr.updated_at) : null;
      const updatedRecently = updatedAt ? updatedAt > oneWeekAgo : false;
      const progress = kr.progress || 0;
      const status = getKrStatus(progress, updatedRecently);

      // Include only exceptions: off track, stagnant, exceeded, not updated
      if (status !== 'no ritmo' || progress >= 100) {
        krsHighlight.push({
          title: kr.title,
          objectiveTitle: obj.title,
          status,
          currentValue: kr.current_value,
          targetValue: kr.target_value,
          progress,
        });
      }
    }
  }

  // Process KPIs - only primary or with issues
  const kpisRelevant: KpiSummary[] = [];
  for (const kpi of (kpisData || [])) {
    const updatedAt = kpi.updated_at ? new Date(kpi.updated_at) : null;
    const updatedRecently = updatedAt ? updatedAt > oneWeekAgo : false;
    const hasTarget = kpi.target_value !== null;
    const onTarget = hasTarget && kpi.current_value !== null 
      ? kpi.current_value >= kpi.target_value 
      : true;

    // Include if primary, off target, or not updated
    if (kpi.is_primary || !onTarget || !updatedRecently) {
      kpisRelevant.push({
        name: kpi.name,
        currentValue: kpi.current_value,
        targetValue: kpi.target_value,
        status: !updatedRecently ? 'desatualizado' : onTarget ? 'ok' : 'atenção',
        isPrimary: kpi.is_primary || false,
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

  // Extract decisions from wizard data structure
  if (reflectionData.data?.decisions) {
    for (const decision of reflectionData.data.decisions) {
      decisions.push({
        text: decision.text || decision.description || '',
        type: decision.type || 'decision',
      });
    }
  }

  return decisions;
}

// ============================================================================
// Agent Orchestration
// ============================================================================

async function orchestrateAgents(
  supabaseUrl: string,
  authHeader: string,
  buId: string,
  agentContext: AgentContext
): Promise<AgentSections> {
  const contextJson = JSON.stringify(agentContext);

  // Parallel agent invocations with Promise.allSettled for resilience
  const [
    analistaResult,
    facilitadorResult,
    culturaResult,
    revisorResult,
  ] = await Promise.allSettled([
    // Analista de KPIs - objectives, KRs, KPIs analysis
    invokeVicAgent(supabaseUrl, authHeader, 'analista-kpis', 'checkin_summary', {
      type: 'checkin_summary',
      teamName: agentContext.teamName,
      cycleName: agentContext.cycleName,
      objectives: agentContext.objectives,
      krs: agentContext.krsHighlight,
      kpis: agentContext.kpisRelevant,
      pendingUpdates: agentContext.pendingUpdates,
      instructions: `Gere um resumo executivo do check-in do time focando em exceções.
Retorne em formato JSON com as chaves:
- objectives_summary: resumo dos objetivos (2-3 frases)
- krs_highlight: KRs em destaque formatados como lista markdown
- kpis_summary: indicadores relevantes formatados como lista markdown
Foque apenas no que está fora do esperado. Não seja punitivo.`,
    }, buId),

    // Facilitador de Decisões - risks, initiatives, next focus
    invokeVicAgent(supabaseUrl, authHeader, 'facilitador-decisoes', 'risks_focus', {
      type: 'risks_focus',
      teamName: agentContext.teamName,
      decisions: agentContext.decisions,
      krsAtRisk: agentContext.krsHighlight.filter(kr => kr.status === 'fora da trilha'),
      instructions: `Analise as decisões e riscos do check-in.
Retorne em formato JSON com as chaves:
- initiatives_summary: resumo das iniciativas e decisões (2-3 frases)
- risks_summary: até 3 riscos/bloqueios formatados como lista markdown
- next_focus: 2-4 próximos focos práticos formatados como lista markdown
Linguagem construtiva, orientada a ação.`,
    }, buId),

    // Guardião da Cultura - cultural message
    invokeVicAgent(supabaseUrl, authHeader, 'cultura', 'culture_message', {
      type: 'culture_message',
      teamName: agentContext.teamName,
      cycleName: agentContext.cycleName,
      hasRisks: agentContext.krsHighlight.some(kr => kr.status === 'fora da trilha'),
      instructions: `Gere uma mensagem cultural curta (máximo 60 caracteres).
Deve ser inspiradora, contextual ao momento do time.
Tom positivo, orientado a aprendizado. Sem aspas.`,
    }, buId),

    // Revisor de Comunicação - opening and closing
    invokeVicAgent(supabaseUrl, authHeader, 'revisor-comunicacao', 'opening_closing', {
      type: 'opening_closing',
      teamName: agentContext.teamName,
      cycleName: agentContext.cycleName,
      buName: agentContext.buName,
      instructions: `Crie abertura e encerramento para o e-mail de resumo do check-in.
Retorne em formato JSON com as chaves:
- opening_text: 2-3 frases de abertura contextualizando o fechamento do check-in
- closing_text: 1-2 frases de encerramento com tom positivo
Linguagem humana, sem burocracia. Não mencione "Hub" na abertura.`,
    }, buId),
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
    const analistaContent = extractOrFallback(analistaResult, '{}');
    const analistaJson = JSON.parse(analistaContent);
    if (analistaJson.objectives_summary) sections.objectives_summary = analistaJson.objectives_summary;
    if (analistaJson.krs_highlight) sections.krs_highlight = analistaJson.krs_highlight;
    if (analistaJson.kpis_summary) sections.kpis_summary = analistaJson.kpis_summary;
  } catch (e) {
    console.warn('Failed to parse analista response:', e);
    // Use raw content if not JSON
    const raw = extractOrFallback(analistaResult, '');
    if (raw && !raw.startsWith('{')) {
      sections.objectives_summary = raw;
    }
  }

  // Parse Facilitador response
  try {
    const facilitadorContent = extractOrFallback(facilitadorResult, '{}');
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
    const revisorContent = extractOrFallback(revisorResult, '{}');
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
    requireAuth: true,
    requireBu: true,
    validateBuAccess: true,
    logRequest: true,
  });

  if (!mw.success) {
    return mw.error!;
  }

  const ctx = mw.context as RequestContext;
  const requestId = ctx.requestId;
  const userId = ctx.user!.id;
  const buId = ctx.buId!;
  const serviceClient = ctx.serviceClient;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization')!;

  try {
    // Parse request body
    const body: TeamCheckinSummaryRequest = await req.json();
    const { teamId, cycleId, sessionId } = body;

    if (!teamId || !cycleId || !sessionId) {
      return errorResponse('Missing required fields: teamId, cycleId, sessionId', 400, {
        requestId,
        error: 'MISSING_FIELDS',
      });
    }

    console.log(`[${requestId}] Team checkin summary: team=${teamId}, cycle=${cycleId}, session=${sessionId}`);

    // Check idempotency - skip if already sent
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
    const agentContext: AgentContext = {
      teamName: teamData.team.name,
      cycleName: teamData.cycle.name,
      buName: teamData.buName,
      objectives: teamData.objectives,
      krsHighlight: teamData.krsHighlight,
      kpisRelevant: teamData.kpisRelevant,
      decisions,
      pendingUpdates,
    };

    // Orchestrate AI agents
    console.log(`[${requestId}] Orchestrating AI agents...`);
    const sections = await orchestrateAgents(supabaseUrl, authHeader, buId, agentContext);

    // Build notification metadata
    const currentDatetime = formatDate(new Date());
    const contextUrl = `/go/wizard-session/${sessionId}`;

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
    const { error: notifyError } = await serviceClient.rpc('emit_notification_event', {
      p_event_slug: 'team.checkin.summary',
      p_bu_id: buId,
      p_recipient_user_ids: teamData.members,
      p_actor_id: userId,
      p_title: `Check-in do time ${teamData.team.name}`,
      p_message: `Resumo do check-in do ciclo ${teamData.cycle.name}`,
      p_context_type: 'team_checkin',
      p_context_id: sessionId,
      p_context_url: contextUrl,
      p_metadata: metadata,
    });

    if (notifyError) {
      console.error(`[${requestId}] Notification emit failed:`, notifyError);
      // Continue anyway - mark as sent to avoid retries
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
