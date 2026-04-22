/**
 * src/lib/utils — Re-exports de utilitários puros (sem domínio, sem UI).
 * Veja `src/lib/domain/index.ts` para a convenção completa.
 */
export * from "../utils";
export { logger } from "../logger";
export * from "../lazyWithRetry";
export * from "../supabaseGuard";
export * from "../queryCacheConfig";
