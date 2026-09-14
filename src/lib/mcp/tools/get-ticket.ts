import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveScope } from "../lib/context";
import { assertNoError, jsonResult } from "../lib/result";
import { buArg } from "../lib/args";

export default defineTool({
  name: "get_ticket",
  title: "Detalhar um ticket",
  description:
    "Retorna os dados de um ticket e o histórico de mensagens da conversa, além dos participantes. Respeita as regras de visibilidade do Next.",
  inputSchema: {
    ticket_id: z.string().describe("Id do ticket."),
    bu: buArg,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ ticket_id, bu }, ctx) => {
    const scope = await resolveScope(ctx, bu);

    const [ticketRes, messagesRes, participantsRes] = await Promise.all([
      scope.supabase
        .from("tickets")
        .select(
          "id, title, type, status, expected_due_at, owner_user_id, created_by_user_id, visibility, external_company_id, created_at, updated_at",
        )
        .eq("id", ticket_id)
        .is("deleted_at", null)
        .maybeSingle(),
      scope.supabase
        .from("ticket_messages")
        .select("id, author_type, author_user_id, author_contact_id, body_richtext, is_pinned, created_at, edited_at")
        .eq("ticket_id", ticket_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(200),
      scope.supabase
        .from("ticket_participants")
        .select("participant_type, role, user_id, contact_id")
        .eq("ticket_id", ticket_id)
        .limit(100),
    ]);

    assertNoError(ticketRes.error, "o ticket");
    if (!ticketRes.data) {
      return jsonResult({ aviso: "Ticket não encontrado ou sem permissão de visualização." });
    }
    assertNoError(messagesRes.error, "as mensagens do ticket");

    return jsonResult({
      unidade: scope.buName,
      ticket: ticketRes.data,
      participantes: participantsRes.data ?? [],
      mensagens: messagesRes.data ?? [],
    });
  },
});
