import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateTicketSubcategory, useUpdateTicketSubcategory } from "../../hooks";
import { TicketSubcategory } from "../../types";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

type FormData = z.infer<typeof formSchema>;

interface SubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subcategory: TicketSubcategory | null;
  categoryId: string | null;
}

export function SubcategoryDialog({
  open,
  onOpenChange,
  subcategory,
  categoryId,
}: SubcategoryDialogProps) {
  const { mutate: createSubcategory, isPending: isCreating } = useCreateTicketSubcategory();
  const { mutate: updateSubcategory, isPending: isUpdating } = useUpdateTicketSubcategory();
  const isPending = isCreating || isUpdating;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (subcategory) {
        form.reset({
          name: subcategory.name,
        });
      } else {
        form.reset({
          name: "",
        });
      }
    }
  }, [open, subcategory, form]);

  const onSubmit = (data: FormData) => {
    if (subcategory) {
      updateSubcategory(
        { id: subcategory.id, name: data.name },
        { onSuccess: () => onOpenChange(false) }
      );
    } else if (categoryId) {
      createSubcategory(
        { category_id: categoryId, name: data.name },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {subcategory ? "Editar Subcategoria" : "Nova Subcategoria"}
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
                    <Input placeholder="Nome da subcategoria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
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
