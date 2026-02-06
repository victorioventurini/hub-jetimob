import { z } from "zod";

export const inventoryFormSchema = z.object({
  internal_code: z
    .string()
    .min(1, "Código interno obrigatório")
    .max(20, "Código deve ter no máximo 20 caracteres")
    .regex(/^\d+$/, "Código deve conter apenas números"),
  name: z.string().min(1, "Nome obrigatório").max(200, "Nome muito longo"),
  category_id: z.string().min(1, "Subcategoria obrigatória"),
  home_location_id: z.string().min(1, "Localização obrigatória"),
  room_id: z.string().optional(),
  description: z.string().max(1000, "Descrição muito longa").optional(),
  brand: z.string().max(100, "Marca muito longa").optional(),
  model: z.string().max(100, "Modelo muito longo").optional(),
  acquired_at: z.string().optional(),
  serial_number: z.string().max(100, "Número de série muito longo").optional(),
  no_serial_number: z.boolean().optional(),
  acquisition_value: z.coerce.number().optional(),
  notes: z.string().max(2000, "Observações muito longas").optional(),
  assigned_to_user_id: z.string().optional(),
  due_at: z.string().optional(),
  // Recommendation link (v2.93.0)
  recommendation_id: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.no_serial_number && !data.serial_number?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Número de série obrigatório. Marque 'Não possui' se o item não tem.",
      path: ["serial_number"],
    });
  }
});

export type InventoryFormData = z.infer<typeof inventoryFormSchema>;

export interface SubcategoryItem {
  id: string;
  name: string;
  parentName: string;
}

export function buildSubcategoryList(
  categories: Array<{ id: string; name: string; parent_id: string | null }>
): SubcategoryItem[] {
  const parentMap = new Map<string, string>();
  categories.forEach((cat) => {
    if (!cat.parent_id) {
      parentMap.set(cat.id, cat.name);
    }
  });

  return categories
    .filter((cat) => cat.parent_id !== null)
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      parentName: parentMap.get(cat.parent_id!) || "Sem categoria",
    }))
    .sort((a, b) => {
      const parentCompare = a.parentName.localeCompare(b.parentName);
      if (parentCompare !== 0) return parentCompare;
      return a.name.localeCompare(b.name);
    });
}
