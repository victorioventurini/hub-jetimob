/**
 * Dialog para criar/editar subcategoria de avaliação.
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AssessmentSubcategory,
  useCreateAssessmentSubcategory,
  useUpdateAssessmentSubcategory,
} from "../../hooks/useAssessmentCategoriesData";

const formSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(120, "Máximo 120 caracteres"),
  status: z.enum(["active", "inactive"]),
});
type FormData = z.infer<typeof formSchema>;

interface AssessmentSubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subcategory: AssessmentSubcategory | null;
  categoryId: string | null;
  categoryName?: string;
}

export function AssessmentSubcategoryDialog({
  open,
  onOpenChange,
  subcategory,
  categoryId,
  categoryName,
}: AssessmentSubcategoryDialogProps) {
  const { mutate: createSubcategory, isPending: isCreating } = useCreateAssessmentSubcategory();
  const { mutate: updateSubcategory, isPending: isUpdating } = useUpdateAssessmentSubcategory();
  const isPending = isCreating || isUpdating;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", status: "active" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      subcategory
        ? { name: subcategory.name, status: subcategory.status }
        : { name: "", status: "active" },
    );
  }, [open, subcategory, form]);

  const onSubmit = (data: FormData) => {
    if (subcategory) {
      updateSubcategory(
        { id: subcategory.id, name: data.name, status: data.status },
        { onSuccess: () => onOpenChange(false) },
      );
    } else if (categoryId) {
      createSubcategory(
        { category_id: categoryId, name: data.name, status: data.status },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {subcategory ? "Editar Subcategoria" : "Nova Subcategoria"}
            {categoryName ? <span className="text-muted-foreground font-normal"> · {categoryName}</span> : null}
          </DialogTitle>
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
                    <Input placeholder="Nome da subcategoria" maxLength={120} {...field} />
                  </FormControl>
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
                  <FormDescription>Subcategorias inativas não aparecem nos seletores ao criar provas.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !categoryId}>
                {subcategory ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
