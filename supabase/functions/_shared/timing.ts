/**
 * timing.ts — Wrapper de medição de latência para Edge Functions
 *
 * Padronizado em W2 do plano de performance. Use para envelopar handlers
 * (ou chamadas LLM) e emitir um log estruturado consumível por
 * `function_edge_logs` / observabilidade.
 *
 * Exemplo:
 *   const result = await withTiming(
 *     "qbr-executive-report",
 *     { model: config.model },
 *     () => buildReport()
 *   );
 *
 * Saída no console:
 *   [timing] qbr-executive-report duration_ms=12345 model=google/gemini-2.5-pro
 */

export interface TimingMetadata {
  model?: string;
  tokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  bu_id?: string;
  agent?: string;
  /** Identificador opcional para correlacionar com outros logs. */
  requestId?: string;
}

export interface TimingResult<T> {
  result: T;
  durationMs: number;
}

/**
 * Executa `fn` e loga `{ function, duration_ms, ...metadata }` ao final.
 * Mesmo em erro o tempo é logado (com `status: error`) para diagnosticar
 * timeouts e falhas lentas.
 */
export async function withTiming<T>(
  functionName: string,
  metadata: TimingMetadata,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    console.log(
      `[timing] ${functionName} duration_ms=${durationMs} ${formatMeta(metadata)} status=ok`,
    );
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    console.log(
      `[timing] ${functionName} duration_ms=${durationMs} ${formatMeta(metadata)} status=error`,
    );
    throw err;
  }
}

/**
 * Variante que retorna duração junto com o resultado (sem logar).
 * Útil quando o caller quer compor a métrica em outro log estruturado.
 */
export async function measure<T>(fn: () => Promise<T>): Promise<TimingResult<T>> {
  const start = Date.now();
  const result = await fn();
  return { result, durationMs: Date.now() - start };
}

function formatMeta(meta: TimingMetadata): string {
  const parts: string[] = [];
  if (meta.model) parts.push(`model=${meta.model}`);
  if (meta.tokens != null) parts.push(`tokens=${meta.tokens}`);
  if (meta.inputTokens != null) parts.push(`input_tokens=${meta.inputTokens}`);
  if (meta.outputTokens != null) parts.push(`output_tokens=${meta.outputTokens}`);
  if (meta.agent) parts.push(`agent=${meta.agent}`);
  if (meta.bu_id) parts.push(`bu=${meta.bu_id}`);
  if (meta.requestId) parts.push(`req=${meta.requestId}`);
  return parts.join(" ");
}
