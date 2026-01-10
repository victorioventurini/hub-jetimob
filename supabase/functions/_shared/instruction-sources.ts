/**
 * Instruction Sources Manager
 * 
 * Handles fetching and assembling instructions from multiple sources:
 * - api: External HTTP APIs
 * - document: Uploaded documents (ai_agent_documents)
 * - hub_context: Internal HUB data (OKRs, KPIs, Teams)
 * - template: Static text templates
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getHubContextData, type HubContextConfig } from "./hub-tools.ts";

// =============================================================================
// TYPES
// =============================================================================

export type InstructionSourceType = "api" | "document" | "hub_context" | "template";

export interface InstructionSource {
  id: string;
  agent_id: string;
  source_type: InstructionSourceType;
  name: string;
  description: string | null;
  priority: number;
  is_enabled: boolean;
  config: Record<string, any>;
  last_fetch_at: string | null;
  last_fetch_status: "success" | "error" | "pending" | null;
  last_fetch_error: string | null;
  cached_content: string | null;
}

export interface ApiSourceConfig {
  url: string;
  method?: "GET" | "POST" | "PUT";
  headers?: Record<string, string>;
  body_template?: Record<string, any>;
  refresh_interval_seconds?: number;
  auth_type?: "none" | "bearer" | "api_key";
  auth_header_name?: string;
  // Note: Actual secrets should come from encrypted storage
}

export interface DocumentSourceConfig {
  document_ids: string[];
}

export interface TemplateSourceConfig {
  template_content: string;
}

// =============================================================================
// FETCH SOURCES
// =============================================================================

/**
 * Load all enabled instruction sources for an agent
 */
export async function loadInstructionSources(
  supabase: SupabaseClient,
  agentId: string
): Promise<InstructionSource[]> {
  const { data, error } = await supabase
    .from("ai_agent_instruction_sources")
    .select("id, agent_id, source_type, name, description, priority, is_enabled, config, last_fetch_at, last_fetch_status, last_fetch_error, cached_content")
    .eq("agent_id", agentId)
    .eq("is_enabled", true)
    .order("priority", { ascending: true });

  if (error) {
    console.error("Error loading instruction sources:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch content from an API source
 */
async function fetchApiSource(
  supabase: SupabaseClient,
  source: InstructionSource
): Promise<string> {
  const config = source.config as ApiSourceConfig;
  
  // Check cache validity
  if (source.cached_content && source.last_fetch_at) {
    const refreshInterval = config.refresh_interval_seconds || 300; // 5 min default
    const lastFetch = new Date(source.last_fetch_at).getTime();
    const now = Date.now();
    
    if ((now - lastFetch) / 1000 < refreshInterval) {
      console.log(`Using cached content for API source: ${source.name}`);
      return source.cached_content;
    }
  }

  try {
    console.log(`Fetching API source: ${source.name} from ${config.url}`);
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(config.headers || {})
    };

    const fetchOptions: RequestInit = {
      method: config.method || "GET",
      headers,
    };

    if (config.method !== "GET" && config.body_template) {
      fetchOptions.body = JSON.stringify(config.body_template);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(config.url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    let content: string;

    if (contentType.includes("application/json")) {
      const json = await response.json();
      content = JSON.stringify(json, null, 2);
    } else {
      content = await response.text();
    }

    // Update cache
    await supabase
      .from("ai_agent_instruction_sources")
      .update({
        cached_content: content,
        last_fetch_at: new Date().toISOString(),
        last_fetch_status: "success",
        last_fetch_error: null,
      })
      .eq("id", source.id);

    return content;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error fetching API source ${source.name}:`, errorMsg);

    // Update error status
    await supabase
      .from("ai_agent_instruction_sources")
      .update({
        last_fetch_at: new Date().toISOString(),
        last_fetch_status: "error",
        last_fetch_error: errorMsg,
      })
      .eq("id", source.id);

    // Return cached content if available, otherwise error message
    if (source.cached_content) {
      return `[Usando cache - Erro na atualização: ${errorMsg}]\n${source.cached_content}`;
    }

    return `[Erro ao buscar fonte ${source.name}: ${errorMsg}]`;
  }
}

/**
 * Get content from document sources
 */
async function fetchDocumentSource(
  supabase: SupabaseClient,
  source: InstructionSource
): Promise<string> {
  const config = source.config as DocumentSourceConfig;
  
  if (!config.document_ids?.length) {
    return "";
  }

  const { data: documents, error } = await supabase
    .from("ai_agent_documents")
    .select("name, extracted_content")
    .in("id", config.document_ids)
    .eq("status", "ready");

  if (error) {
    console.error("Error fetching documents:", error);
    return `[Erro ao buscar documentos: ${error.message}]`;
  }

  if (!documents?.length) {
    return "";
  }

  return documents
    .filter((doc: any) => doc.extracted_content)
    .map((doc: any) => `=== ${doc.name} ===\n${doc.extracted_content}`)
    .join("\n\n");
}

/**
 * Get content from hub context source
 */
async function fetchHubContextSource(
  supabase: SupabaseClient,
  source: InstructionSource,
  buId: string
): Promise<string> {
  const config = source.config as HubContextConfig;
  
  if (!config.tables?.length) {
    return "";
  }

  return await getHubContextData(supabase, config, buId);
}

/**
 * Get content from template source
 */
function fetchTemplateSource(source: InstructionSource): string {
  const config = source.config as TemplateSourceConfig;
  return config.template_content || "";
}

// =============================================================================
// ASSEMBLE INSTRUCTIONS
// =============================================================================

/**
 * Assemble all instruction content from sources
 */
export async function assembleInstructionContent(
  supabase: SupabaseClient,
  sources: InstructionSource[],
  buId?: string
): Promise<string> {
  if (!sources.length) {
    return "";
  }

  const contents: { name: string; content: string }[] = [];

  for (const source of sources) {
    let content = "";

    switch (source.source_type) {
      case "api":
        content = await fetchApiSource(supabase, source);
        break;

      case "document":
        content = await fetchDocumentSource(supabase, source);
        break;

      case "hub_context":
        if (buId) {
          content = await fetchHubContextSource(supabase, source, buId);
        } else {
          content = "[Contexto HUB não disponível: BU não especificada]";
        }
        break;

      case "template":
        content = fetchTemplateSource(source);
        break;
    }

    if (content.trim()) {
      contents.push({ name: source.name, content });
    }
  }

  if (!contents.length) {
    return "";
  }

  // Format all sources into a single block
  const sections = contents.map(
    ({ name, content }) => `--- ${name} ---\n${content}`
  );

  return `\n=== FONTES DE CONHECIMENTO ===\n\n${sections.join("\n\n")}`;
}
