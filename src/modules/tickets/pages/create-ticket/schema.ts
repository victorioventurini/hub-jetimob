import { z } from "zod";

export const createTicketSchema = z.object({
  type: z.enum(["internal", "external"]),
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  external_company_id: z.string().optional(),
  visibility: z.enum(["bu_all", "teams", "users", "private"], {
    required_error: "Selecione uma opção de visibilidade",
  }),
  expected_due_at: z.date().optional(),
  initial_message: z.string().min(1, "Mensagem inicial é obrigatória"),
});

export type CreateTicketFormData = z.infer<typeof createTicketSchema>;

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_FILES = 5;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
