/**
 * Dialog para criar/editar categoria de avaliação.
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AssessmentCategory,
  useCreateAssessmentCategory,
  useUpdateAssessmentCategory,
} from "../../hooks/useAssessmentCategoriesData";

const formSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(120, "Máximo 120 caracteres"),
  description: z.string().trim().max(1000, "Máximo 1000 caracteres").optional(),
  status: z.enum(["active", "inactive"]),
});
type FormData = z.infer<typeof formSchema>;

interface AssessmentCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: AssessmentCategory | null;
}

export function AssessmentCategoryDialog({ open, onOpenChange, category }: AssessmentCategoryDialogProps) {
  const { mutate: createCategory, isPending: isCreating } = useCreateAssessmentCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateAssessmentCategory();
  const isPending = isCreating || isUpdating;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", status: "active" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      category
        ? { name: category.name, description: category.description ?? "", status: category.status }
        : { name: "", description: "", status: "active" },
    );
  }, [open, category, form]);

  const onSubmit = (data: FormData) => {
    if (category) {
      updateCategory(
        { id: category.id, name: data.name, description: data.description ?? null, status: data.status },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createCategory(
        { name: data.name, description: data.description ?? null, status: data.status },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{category ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Onboarding" maxLength={120} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição opcional desta categoria" rows={3} {...field} />
                  </FormControl>
                  <FormDescription>Aparece como contexto interno ao escolher a categoria.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="inactive">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Categorias inativas não aparecem nos seletores ao criar provas.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {category ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
