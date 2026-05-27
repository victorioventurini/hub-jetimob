/**
 * Logger central — Next da Jet
 *
 * Wrapper fino sobre `console` que silencia logs informativos em produção
 * mas preserva avisos e erros (que continuam úteis para diagnóstico no
 * Sentry/console do navegador).
 *
 * Uso:
 *   import { logger } from "@/lib/logger";
 *   logger.debug("[modulo] mensagem", payload);
 *   logger.info("[modulo] info");
 *   logger.warn("[modulo] aviso", err);
 *   logger.error("[modulo] erro", err);
 *
 * Regras:
 * - `debug` e `info` são no-op em produção (`import.meta.env.PROD`).
 * - `warn` e `error` sempre passam.
 * - Não substitua `console.error` em catch blocks que precisam de stack.
 */

const isDev = import.meta.env?.DEV ?? false;

function noop(): void {
  /* no-op em produção */
}

export const logger = {
  debug: isDev ? console.debug.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
  log: isDev ? console.log.bind(console) : noop,
  warn: console.warn.bind(console),
  error: console.error.bind(console),
} as const;

export type Logger = typeof logger;
