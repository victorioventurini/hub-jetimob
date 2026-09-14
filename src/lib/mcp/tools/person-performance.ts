import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolvePerson, resolveScope } from "../lib/context";
import { buildPersonPerformance } from "../lib/person-performance";
import { jsonResult } from "../lib/result";
import { buArg } from "../lib/args";

export default defineTool({
  name: "person_performance",
  title: "Performance de uma pessoa",
  description:
    "Panorama consolidado de performance de um jetimober: dados de trabalho, objetivos e KRs sob responsabilidade com progresso, check-ins recentes, KPIs com último valor e meta, projetos e marcos, e alertas do que merece atenção.",
  inputSchema: {
    pessoa: z.string().describe("Nome, e-mail ou id da pessoa."),
    bu: buArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ pessoa, bu }, ctx) => {
    const scope = await resolveScope(ctx, bu);
    const person = await resolvePerson(scope, pessoa);
    const performance = await buildPersonPerformance(scope, person.id);
    return jsonResult({ unidade: scope.buName, ...performance });
  },
});
