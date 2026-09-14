import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, clampLimit, jsonResult } from "../lib/result";
import { buArg, limitArg, searchArg } from "../lib/args";

export default defineTool({
  name: "list_partners",
  title: "Listar empresas parceiras",
  description:
    "Lista as empresas parceiras vinculadas à unidade, com razão social, documento, situação e os contatos externos de cada uma.",
  inputSchema: {
    bu: buArg,
    status: z.enum(["active", "inactive"]).optional(),
    busca: searchArg,
    incluir_contatos: z.boolean().optional().describe("Padrão: verdadeiro."),
    limite: limitArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bu, status, busca, incluir_contatos, limite }, ctx) => {
    const scope = await resolveScope(ctx, bu);

    const { data: associations, error: assocError } = await scope.supabase
      .from("external_company_bu_associations")
      .select("external_company_id")
      .eq("bu_id", scope.buId)
      .limit(500);
    assertNoError(assocError, "parceiros da unidade");
    const associated = (associations ?? []).map((a) => a.external_company_id as string);

    let query = scope.supabase
      .from("external_companies")
      .select("id, name, legal_name, document, document_type, person_type, status, notes, created_at")
      .is("deleted_at", null)
      .order("name")
      .limit(clampLimit(limite, 100));
    if (associated.length) query = query.in("id", associated);
    if (status) query = query.eq("status", status);
    if (busca) query = query.or([`name.ilike.%${busca}%`, `legal_name.ilike.%${busca}%`].join(","));

    const { data: companies, error } = await query;
    assertNoError(error, "empresas parceiras");

    const ids = (companies ?? []).map((c) => c.id as string);
    const wantContacts = incluir_contatos !== false && ids.length > 0;
    const { data: contacts } = wantContacts
      ? await scope.supabase
          .from("partner_contacts")
          .select("id, external_company_id, name, email, phone, status, can_view_company_tickets, user_id")
          .in("external_company_id", ids)
          .is("deleted_at", null)
          .limit(500)
      : { data: [] };

    return jsonResult({
      unidade: scope.buName,
      empresas: (companies ?? []).map((c) => ({
        id: c.id,
        nome: c.name,
        razao_social: c.legal_name,
        documento: c.document,
        tipo_documento: c.document_type,
        tipo_pessoa: c.person_type,
        status: c.status,
        observacoes: c.notes,
        contatos: wantContacts
          ? (contacts ?? [])
              .filter((k) => k.external_company_id === c.id)
              .map((k) => ({
                id: k.id,
                nome: k.name,
                email: k.email,
                telefone: k.phone,
                status: k.status,
                ve_tickets_da_empresa: k.can_view_company_tickets,
                tem_acesso: !!k.user_id,
              }))
          : undefined,
      })),
    });
  },
});
