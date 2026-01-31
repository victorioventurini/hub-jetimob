/**
 * Hub Tools - Query tools for AI agents to access HUB data
 * 
 * This module provides structured access to Hub operational data for AI agents.
 * All queries are BU-scoped for multi-tenant security.
 * 
 * @module hub-tools
 * @see docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md §6 Edge Functions Standards
 * 
 * ## Available Tools
 * 
 * - **query_okrs** - Fetches OKRs (Objectives and Key Results) with optional filters
 * - **query_kpis** - Fetches KPIs with historical values and trend analysis
 * - **query_teams** - Fetches team structure with member counts
 * 
 * ## Usage Example
 * 
 * ```typescript
 * import { executeHubTool, HUB_TOOL_DEFINITIONS } from "../_shared/hub-tools.ts";
 * 
 * // Get tool definitions for LLM function calling
 * const tools = HUB_TOOL_DEFINITIONS;
 * 
 * // Execute a tool
 * const result = await executeHubTool(supabase, "query_okrs", { teamId: "..." }, buId);
 * ```
 * 
 * ## Security
 * 
 * - All queries are scoped by `buId` parameter
 * - Uses authenticated Supabase client passed by caller
 * - Respects RLS policies on underlying tables
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Filter options for OKR queries
 */
export interface OkrFilters {
  /** Filter by specific team ID */
  teamId?: string;
  /** Filter by cycle ID */
  cycleId?: string;
  /** Filter by objective status: draft, active, completed, cancelled */
  status?: string[];
  /** Filter by RAG status: green, yellow, red, not_started */
  ragStatus?: string[];
  /** Maximum number of results (default: 20, max: 50) */
  limit?: number;
}

/**
 * Filter options for KPI queries
 */
export interface KpiFilters {
  /** Filter by KPI category: growth, retention, productivity, financial, operational */
  category?: string;
  /** Filter by team ID */
  teamId?: string;
  /** Filter by KPI status */
  status?: string[];
  /** Include historical values (default: true) */
  includeValues?: boolean;
  /** Number of historical values to fetch per KPI (default: 6) */
  valuesLimit?: number;
  /** Maximum number of KPIs (default: 15, max: 30) */
  limit?: number;
}

/**
 * Filter options for team queries
 */
export interface TeamFilters {
  /** Filter by team status: active, archived */
  status?: string[];
  /** Maximum number of teams (default: 20, max: 50) */
  limit?: number;
}

/**
 * Configuration for bulk Hub context data fetching
 */
export interface HubContextConfig {
  /** Tables to fetch: "okrs", "kpis", "teams" */
  tables: string[];
  /** Optional filters per table type */
  filters?: {
    okrs?: OkrFilters;
    kpis?: KpiFilters;
    teams?: TeamFilters;
  };
  /** Maximum rows per table (default: 50) */
  max_rows?: number;
}

/**
 * OpenAI-compatible tool definitions for LLM function calling
 * 
 * These definitions follow the OpenAI function calling schema and can be
 * passed directly to LLM APIs that support tool/function calling.
 */
export const HUB_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "query_okrs",
      description: "Busca OKRs (Objetivos e Key Results) do HUB. Use para análise de progresso, identificar gaps ou sugerir melhorias.",
      parameters: {
        type: "object",
        properties: {
          teamId: {
            type: "string",
            description: "ID do time para filtrar (opcional)"
          },
          status: {
            type: "array",
            items: { type: "string" },
            description: "Status dos OKRs: draft, active, completed, cancelled"
          },
          ragStatus: {
            type: "array",
            items: { type: "string" },
            description: "Status RAG: green, yellow, red, not_started"
          },
          limit: {
            type: "number",
            description: "Máximo de resultados (default: 20, max: 50)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_kpis",
      description: "Busca KPIs e seus valores históricos do HUB. Use para análise de tendências, variações e diagnósticos.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Categoria do KPI: growth, retention, productivity, financial, operational"
          },
          teamId: {
            type: "string",
            description: "ID do time para filtrar (opcional)"
          },
          includeValues: {
            type: "boolean",
            description: "Incluir valores históricos (default: true)"
          },
          limit: {
            type: "number",
            description: "Máximo de KPIs (default: 15, max: 30)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_teams",
      description: "Busca informações dos times do HUB. Use para entender estrutura organizacional e responsabilidades.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "array",
            items: { type: "string" },
            description: "Status dos times: active, archived"
          },
          limit: {
            type: "number",
            description: "Máximo de times (default: 20, max: 50)"
          }
        },
        required: []
      }
    }
  }
];

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Query OKRs (Team Objectives and Key Results) for a Business Unit
 * 
 * Fetches team objectives with their associated key results, formatted
 * as human-readable text suitable for AI agent consumption.
 * 
 * @param supabase - Authenticated Supabase client
 * @param buId - Business Unit ID for scoping
 * @param filters - Optional filters for team, status, RAG status, and limit
 * @returns Formatted text representation of OKRs
 * 
 * @example
 * ```typescript
 * const result = await queryOkrs(supabase, buId, { 
 *   status: ["active"], 
 *   ragStatus: ["red", "yellow"] 
 * });
 * ```
 */
export async function queryOkrs(
  supabase: SupabaseClient,
  buId: string,
  filters: OkrFilters = {}
): Promise<string> {
  const limit = Math.min(filters.limit || 20, 50);

  let objectivesQuery = supabase
    .from("okr_team_objectives")
    .select(`
      id,
      title,
      description,
      status,
      team:teams!inner(id, name, bu_id),
      cycle:cycles(name, start_date, end_date)
    `)
    .eq("teams.bu_id", buId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.teamId) {
    objectivesQuery = objectivesQuery.eq("team_id", filters.teamId);
  }
  if (filters.status?.length) {
    objectivesQuery = objectivesQuery.in("status", filters.status);
  }

  const { data: objectives, error: objError } = await objectivesQuery;

  if (objError) {
    console.error("Error querying OKR objectives:", objError);
    return `Erro ao buscar OKRs: ${objError.message}`;
  }

  if (!objectives?.length) {
    return "Nenhum OKR encontrado com os filtros especificados.";
  }

  const objectiveIds = objectives.map((o: any) => o.id);
  
  let krsQuery = supabase
    .from("okr_team_key_results")
    .select(`
      id,
      title,
      baseline,
      current_value,
      target,
      direction,
      unit,
      status,
      type,
      team_objective_id,
      team:teams(name)
    `)
    .in("team_objective_id", objectiveIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (filters.ragStatus?.length) {
    krsQuery = krsQuery.in("status", filters.ragStatus);
  }

  const { data: keyResults } = await krsQuery;

  let output = "=== OKRs DO HUB ===\n\n";

  for (const obj of objectives as any[]) {
    const teamName = obj.team?.name || "Time não identificado";
    const cycleName = obj.cycle?.name || "Sem ciclo";
    
    output += `📎 OBJETIVO: ${obj.title}\n`;
    output += `   Time: ${teamName} | Ciclo: ${cycleName} | Status: ${obj.status}\n`;
    
    if (obj.description) {
      output += `   Descrição: ${obj.description}\n`;
    }

    const objKrs = keyResults?.filter((kr: any) => kr.team_objective_id === obj.id) || [];
    
    if (objKrs.length > 0) {
      output += `   Key Results (${objKrs.length}):\n`;
      
      for (const kr of objKrs) {
        const progress = calculateProgress(kr.baseline, kr.current_value, kr.target, kr.direction);
        const statusEmoji = getStatusEmoji(kr.status);
        
        output += `     ${statusEmoji} ${kr.title}\n`;
        output += `        ${kr.current_value}${kr.unit} de ${kr.target}${kr.unit} (${progress}% progresso)\n`;
        output += `        Tipo: ${kr.type} | Direção: ${kr.direction}\n`;
      }
    }
    
    output += "\n";
  }

  return output;
}

/**
 * Query KPIs with optional historical values for a Business Unit
 * 
 * Fetches KPI definitions and their historical values, with trend analysis.
 * Output is formatted as human-readable text for AI agent consumption.
 * 
 * @param supabase - Authenticated Supabase client
 * @param buId - Business Unit ID for scoping
 * @param filters - Optional filters for category, team, status, and value history
 * @returns Formatted text representation of KPIs with trends
 * 
 * @example
 * ```typescript
 * const result = await queryKpis(supabase, buId, { 
 *   category: "financial",
 *   includeValues: true,
 *   valuesLimit: 12 
 * });
 * ```
 */
export async function queryKpis(
  supabase: SupabaseClient,
  buId: string,
  filters: KpiFilters = {}
): Promise<string> {
  const limit = Math.min(filters.limit || 15, 30);
  const includeValues = filters.includeValues !== false;
  const valuesLimit = filters.valuesLimit || 6;

  let query = supabase
    .from("kpi_metrics")
    .select(`
      id,
      name,
      description,
      category,
      unit,
      direction,
      frequency,
      target_value,
      status,
      team:teams(id, name, bu_id),
      owner:profiles!owner_user_id(first_name, last_name)
    `)
    .eq("teams.bu_id", buId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.category) {
    query = query.eq("category", filters.category);
  }
  if (filters.teamId) {
    query = query.eq("team_id", filters.teamId);
  }
  if (filters.status?.length) {
    query = query.in("status", filters.status);
  }

  const { data: kpis, error: kpiError } = await query;

  if (kpiError) {
    console.error("Error querying KPIs:", kpiError);
    return `Erro ao buscar KPIs: ${kpiError.message}`;
  }

  if (!kpis?.length) {
    return "Nenhum KPI encontrado com os filtros especificados.";
  }

  let valuesMap: Record<string, any[]> = {};
  
  if (includeValues) {
    const kpiIds = kpis.map((k: any) => k.id);
    
    const { data: values } = await supabase
      .from("kpi_values")
      .select("kpi_id, value, reference_date, source, notes")
      .in("kpi_id", kpiIds)
      .order("reference_date", { ascending: false })
      .limit(kpiIds.length * valuesLimit);

    if (values) {
      for (const v of values) {
        if (!valuesMap[v.kpi_id]) {
          valuesMap[v.kpi_id] = [];
        }
        if (valuesMap[v.kpi_id].length < valuesLimit) {
          valuesMap[v.kpi_id].push(v);
        }
      }
    }
  }

  let output = "=== KPIs DO HUB ===\n\n";

  for (const kpi of kpis as any[]) {
    const teamName = kpi.team?.name || "Sem time";
    const ownerName = kpi.owner ? `${kpi.owner.first_name} ${kpi.owner.last_name}` : "Sem owner";
    const targetStr = kpi.target_value ? `Meta: ${kpi.target_value}${kpi.unit}` : "Sem meta definida";
    
    output += `📊 ${kpi.name}\n`;
    output += `   Categoria: ${kpi.category} | Time: ${teamName}\n`;
    output += `   ${targetStr} | Direção: ${kpi.direction} | Frequência: ${kpi.frequency}\n`;
    output += `   Responsável: ${ownerName} | Status: ${kpi.status}\n`;
    
    if (kpi.description) {
      output += `   Descrição: ${kpi.description}\n`;
    }

    const kpiValues = valuesMap[kpi.id] || [];
    if (kpiValues.length > 0) {
      output += `   Histórico (últimos ${kpiValues.length} registros):\n`;
      
      for (const v of kpiValues) {
        const dateStr = new Date(v.reference_date).toLocaleDateString("pt-BR");
        output += `     • ${dateStr}: ${v.value}${kpi.unit}`;
        if (v.notes) output += ` (${v.notes})`;
        output += "\n";
      }
      
      if (kpiValues.length >= 2) {
        const trend = calculateTrend(kpiValues, kpi.direction);
        output += `   Tendência: ${trend}\n`;
      }
    }
    
    output += "\n";
  }

  return output;
}

/**
 * Query Teams with member counts for a Business Unit
 * 
 * Fetches team structure including leaders and member counts.
 * Output is formatted as human-readable text for AI agent consumption.
 * 
 * @param supabase - Authenticated Supabase client
 * @param buId - Business Unit ID for scoping
 * @param filters - Optional filters for status and limit
 * @returns Formatted text representation of teams
 * 
 * @example
 * ```typescript
 * const result = await queryTeams(supabase, buId, { status: ["active"] });
 * ```
 */
export async function queryTeams(
  supabase: SupabaseClient,
  buId: string,
  filters: TeamFilters = {}
): Promise<string> {
  const limit = Math.min(filters.limit || 20, 50);

  let query = supabase
    .from("teams")
    .select(`
      id,
      name,
      description,
      status,
      leader:profiles!leader_user_id(id, first_name, last_name, email)
    `)
    .eq("bu_id", buId)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(limit);

  if (filters.status?.length) {
    query = query.in("status", filters.status);
  }

  const { data: teams, error: teamError } = await query;

  if (teamError) {
    console.error("Error querying teams:", teamError);
    return `Erro ao buscar times: ${teamError.message}`;
  }

  if (!teams?.length) {
    return "Nenhum time encontrado.";
  }

  const teamIds = teams.map((t: any) => t.id);
  
  const { data: memberships } = await supabase
    .from("user_team_memberships")
    .select("team_id")
    .in("team_id", teamIds)
    .is("left_at", null);

  const memberCounts: Record<string, number> = {};
  if (memberships) {
    for (const m of memberships) {
      memberCounts[m.team_id] = (memberCounts[m.team_id] || 0) + 1;
    }
  }

  let output = "=== TIMES DO HUB ===\n\n";

  for (const team of teams as any[]) {
    const leaderName = team.leader 
      ? `${team.leader.first_name} ${team.leader.last_name}`
      : "Sem líder";
    const memberCount = memberCounts[team.id] || 0;
    
    output += `👥 ${team.name}\n`;
    output += `   Líder: ${leaderName} | Membros: ${memberCount}\n`;
    output += `   Status: ${team.status}\n`;
    
    if (team.description) {
      output += `   Descrição: ${team.description}\n`;
    }
    
    output += "\n";
  }

  return output;
}

// =============================================================================
// EXECUTE TOOL
// =============================================================================

/**
 * Execute a Hub tool by name with arguments
 * 
 * This is the main entry point for AI agents to execute Hub data queries.
 * It routes tool calls to the appropriate query function based on tool name.
 * 
 * @param supabase - Authenticated Supabase client
 * @param toolName - Name of the tool to execute (query_okrs, query_kpis, query_teams)
 * @param args - Tool-specific arguments (filters)
 * @param buId - Business Unit ID for scoping
 * @returns Formatted text result from the tool execution
 * 
 * @example
 * ```typescript
 * // In LLM function calling handler:
 * const result = await executeHubTool(
 *   supabase,
 *   toolCall.function.name,
 *   JSON.parse(toolCall.function.arguments),
 *   buId
 * );
 * ```
 */
export async function executeHubTool(
  supabase: SupabaseClient,
  toolName: string,
  args: Record<string, any>,
  buId: string
): Promise<string> {
  console.log(`Executing hub tool: ${toolName} with args:`, args);

  switch (toolName) {
    case "query_okrs":
      return await queryOkrs(supabase, buId, args as OkrFilters);
    
    case "query_kpis":
      return await queryKpis(supabase, buId, args as KpiFilters);
    
    case "query_teams":
      return await queryTeams(supabase, buId, args as TeamFilters);
    
    default:
      return `Tool desconhecida: ${toolName}`;
  }
}

/**
 * Get Hub context data based on configuration
 * 
 * Fetches multiple types of Hub data in a single call, useful for
 * building comprehensive context for AI agents from instruction sources.
 * 
 * @param supabase - Authenticated Supabase client
 * @param config - Configuration specifying which tables to fetch and filters
 * @param buId - Business Unit ID for scoping
 * @returns Combined formatted text from all requested data sources
 * 
 * @example
 * ```typescript
 * const context = await getHubContextData(supabase, {
 *   tables: ["okrs", "kpis"],
 *   filters: { okrs: { status: ["active"] } },
 *   max_rows: 25
 * }, buId);
 * ```
 */
export async function getHubContextData(
  supabase: SupabaseClient,
  config: HubContextConfig,
  buId: string
): Promise<string> {
  const results: string[] = [];
  const maxRows = config.max_rows || 50;

  for (const table of config.tables) {
    switch (table) {
      case "okrs":
        const okrFilters = { ...config.filters?.okrs, limit: maxRows };
        results.push(await queryOkrs(supabase, buId, okrFilters));
        break;
      
      case "kpis":
        const kpiFilters = { ...config.filters?.kpis, limit: maxRows };
        results.push(await queryKpis(supabase, buId, kpiFilters));
        break;
      
      case "teams":
        const teamFilters = { ...config.filters?.teams, limit: maxRows };
        results.push(await queryTeams(supabase, buId, teamFilters));
        break;
    }
  }

  return results.join("\n\n");
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Calculate KR progress percentage with direction-aware formula
 * 
 * For "up" direction: Progress = (current - baseline) / (target - baseline) × 100
 * For "down" direction: Progress = (baseline - current) / (baseline - target) × 100
 * For maintenance KRs (baseline = target): Returns 0% or 100% (binary)
 * 
 * @param baseline - Starting value
 * @param current - Current value
 * @param target - Target value
 * @param direction - "up" for increase goals, "down" for decrease goals
 * @returns Progress percentage clamped between 0 and 100
 */
function calculateProgress(
  baseline: number,
  current: number,
  target: number,
  direction: string
): number {
  if (direction === "up") {
    if (target === baseline) {
      return current >= target ? 100 : 0;
    }
    const progress = ((current - baseline) / (target - baseline)) * 100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  } else {
    if (baseline === target) {
      return current <= target ? 100 : 0;
    }
    const progress = ((baseline - current) / (baseline - target)) * 100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }
}

/**
 * Get emoji indicator for RAG status
 * 
 * @param status - RAG status string
 * @returns Colored circle emoji representing the status
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case "green": return "🟢";
    case "yellow": return "🟡";
    case "red": return "🔴";
    case "not_started": return "⚪";
    default: return "⚫";
  }
}

/**
 * Calculate trend indicator from historical values
 * 
 * Compares the two most recent values to determine if metric is
 * improving, declining, or stable relative to its direction goal.
 * 
 * @param values - Array of historical values (most recent first)
 * @param direction - "up" for increase goals, "down" for decrease goals
 * @returns Formatted trend string with emoji and percentage change
 */
function calculateTrend(values: any[], direction: string): string {
  if (values.length < 2) return "Dados insuficientes";
  
  const recent = values[0].value;
  const previous = values[1].value;
  const diff = recent - previous;
  const percentChange = previous !== 0 ? ((diff / previous) * 100).toFixed(1) : "N/A";
  
  const isPositive = direction === "up" ? diff > 0 : diff < 0;
  const emoji = diff === 0 ? "➡️" : (isPositive ? "📈" : "📉");
  
  if (diff === 0) return `${emoji} Estável`;
  
  const changeStr = diff > 0 ? `+${diff}` : diff.toString();
  return `${emoji} ${changeStr} (${percentChange}%)`;
}
