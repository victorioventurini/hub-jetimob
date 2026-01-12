/**
 * Structured Logging for Edge Functions
 * 
 * Provides consistent, JSON-structured logging with:
 * - Correlation ID tracking
 * - Log levels (debug, info, warn, error)
 * - Contextual metadata
 * - Performance timing
 */

// =============================================================================
// TYPES
// =============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId: string;
  functionName: string;
  userId?: string;
  buId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId: string;
  functionName: string;
  userId?: string;
  buId?: string;
  durationMs?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, unknown>;
}

// =============================================================================
// LOGGER CLASS
// =============================================================================

export class Logger {
  private context: LogContext;
  private startTime: number;

  constructor(context: LogContext) {
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * Create a logger from request context
   */
  static fromRequest(
    requestId: string,
    functionName: string,
    userId?: string,
    buId?: string
  ): Logger {
    return new Logger({
      requestId,
      functionName,
      userId,
      buId,
    });
  }

  /**
   * Get elapsed time since logger creation
   */
  private getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Format and output a log entry
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.context.requestId,
      functionName: this.context.functionName,
      userId: this.context.userId,
      buId: this.context.buId,
      durationMs: this.getElapsedMs(),
    };

    if (metadata && Object.keys(metadata).length > 0) {
      entry.metadata = metadata;
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    // Output as JSON for structured logging
    const output = JSON.stringify(entry);

    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "debug":
        // Only log debug in development
        if (Deno.env.get("ENVIRONMENT") !== "production") {
          console.debug(output);
        }
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Debug level log (only in non-production)
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log("debug", message, metadata);
  }

  /**
   * Info level log
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log("info", message, metadata);
  }

  /**
   * Warning level log
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log("warn", message, metadata);
  }

  /**
   * Error level log
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log("error", message, metadata, error);
  }

  /**
   * Log request start
   */
  requestStart(method: string, path?: string): void {
    this.info("Request started", { method, path });
  }

  /**
   * Log request completion
   */
  requestComplete(status: "success" | "error", statusCode?: number, details?: string): void {
    const metadata: Record<string, unknown> = {
      status,
      statusCode,
      totalDurationMs: this.getElapsedMs(),
    };

    if (details) {
      metadata.details = details;
    }

    if (status === "error") {
      this.error("Request completed with error", undefined, metadata);
    } else {
      this.info("Request completed", metadata);
    }
  }

  /**
   * Log database operation
   */
  dbOperation(operation: string, table: string, durationMs?: number, rowCount?: number): void {
    this.debug("Database operation", {
      operation,
      table,
      durationMs,
      rowCount,
    });
  }

  /**
   * Log external API call
   */
  externalApiCall(
    service: string,
    endpoint: string,
    statusCode?: number,
    durationMs?: number
  ): void {
    this.info("External API call", {
      service,
      endpoint,
      statusCode,
      durationMs,
    });
  }

  /**
   * Log AI/LLM operation
   */
  llmOperation(
    model: string,
    operation: "complete" | "stream",
    tokensUsed?: number,
    durationMs?: number
  ): void {
    this.info("LLM operation", {
      model,
      operation,
      tokensUsed,
      durationMs,
    });
  }

  /**
   * Add context to logger (returns new logger instance)
   */
  withContext(additionalContext: Partial<LogContext>): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Create a child logger for a specific operation
   */
  child(operationName: string): Logger {
    return new Logger({
      ...this.context,
      functionName: `${this.context.functionName}:${operationName}`,
    });
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Create a simple log entry (for one-off logging without a Logger instance)
 */
export function logSimple(
  level: LogLevel,
  message: string,
  requestId: string,
  metadata?: Record<string, unknown>
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId,
    ...metadata,
  };

  const output = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Measure and log duration of an async operation
 */
export async function withTiming<T>(
  logger: Logger,
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logger.debug(`${operationName} completed`, { durationMs: Date.now() - start });
    return result;
  } catch (error) {
    logger.error(`${operationName} failed`, error as Error, { durationMs: Date.now() - start });
    throw error;
  }
}
