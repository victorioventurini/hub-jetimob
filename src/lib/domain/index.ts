/**
 * src/lib/domain — Re-exports de utilitários de DOMÍNIO (regras de negócio).
 *
 * Convenção (FRONTEND_ARCHITECTURE.md):
 * - `domain/`: lógica de negócio reusável entre módulos (parser de IA, identidade, links compartilháveis)
 * - `ui/`:     helpers de apresentação (cores semânticas, dialog sizes, mentions)
 * - `utils/`:  utilitários puros sem domínio (logger, retry, fetch guard)
 *
 * Os arquivos físicos seguem em `src/lib/*` para preservar imports existentes.
 * Novos consumidores devem importar via os sub-barrels:
 *   import { tryParseAiJson } from "@/lib/domain";
 *   import { statusTone }     from "@/lib/ui";
 *   import { logger }         from "@/lib/utils";
 */
export { tryParseAiJson, stripJsonNoise } from "../aiResponseParser";
export * from "../authRedirect";
export * from "../idTypes";
export * from "../participantTypes";
export * from "../shareableLinks";
export * from "../nameUtils";
export * from "../phone";
export * from "../validationMessages";
export * from "../errorMessages";
