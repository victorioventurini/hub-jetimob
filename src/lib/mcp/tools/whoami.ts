import { defineTool } from "@lovable.dev/mcp-js";
import { resolveIdentity } from "../lib/context";
import { jsonResult } from "../lib/result";

export default defineTool({
  name: "whoami",
  title: "Quem sou eu no Next",
  description:
    "Retorna o perfil do usuário conectado e as unidades de negócio a que ele tem acesso. Use antes das outras ferramentas quando não souber qual unidade usar.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const identity = await resolveIdentity(ctx);
    return jsonResult({
      perfil: {
        id: identity.profileId,
        nome: identity.displayName,
        email: identity.email,
        tipo: identity.userType,
      },
      unidades: identity.bus.map((b) => ({
        id: b.id,
        nome: b.name,
        slug: b.slug,
        papel: b.role_in_bu,
        padrao: b.is_default,
      })),
    });
  },
});
