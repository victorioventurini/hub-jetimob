import { z } from "zod";

/** Argumento comum: unidade de negócio (id, slug ou nome). */
export const buArg = z
  .string()
  .optional()
  .describe("Unidade de negócio (nome, slug ou id). Omita para usar a sua unidade padrão.");

export const limitArg = z
  .number()
  .int()
  .positive()
  .optional()
  .describe("Quantidade máxima de registros (padrão 50, máximo 200).");

export const searchArg = z.string().optional().describe("Texto para filtrar por nome/título.");
