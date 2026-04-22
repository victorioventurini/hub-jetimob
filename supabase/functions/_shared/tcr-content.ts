/**
 * Technical Context Registry (TCR) — Barrel
 *
 * Re-exporta a API pública do TCR a partir de `_shared/tcr/`.
 * Mantido para retrocompatibilidade com importadores existentes
 * (e.g. `get-tcr/index.ts`).
 *
 * Para adicionar/editar seções, edite os arquivos em `_shared/tcr/`.
 */

export {
  TCR_VERSION,
  TCR_UPDATED_AT,
  TCR_SECTIONS,
  buildFullTcr,
  type TcrSection,
} from "./tcr/index.ts";
