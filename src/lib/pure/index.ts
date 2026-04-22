/**
 * src/lib/pure — Re-exports de utilitários puros (sem domínio, sem UI).
 * Renomeado de `utils/` para evitar conflito com o arquivo `src/lib/utils.ts`.
 * Veja `src/lib/domain/index.ts` para a convenção completa.
 */
export * from "../utils";
export { logger } from "../logger";
export * from "../lazyWithRetry";
export * from "../supabaseGuard";
export * from "../queryCacheConfig";
