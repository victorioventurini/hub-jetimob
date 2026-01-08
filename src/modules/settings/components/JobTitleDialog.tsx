import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCreateJobTitle, useUpdateJobTitle } from "../hooks/useJobTitles";
import type { JobTitleWithUsageCount } from "../types";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface JobTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingJobTitle: JobTitleWithUsageCount | null;
}

export function JobTitleDialog({ open, onOpenChange, editingJobTitle }: JobTitleDialogProps) {
  const isEditing = !!editingJobTitle;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  const createMutation = useCreateJobTitle();
  const updateMutation = useUpdateJobTitle();

  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (editingJobTitle) {
        form.reset({
          name: editingJobTitle.name,
          description: editingJobTitle.description || "",
          is_active: editingJobTitle.is_active,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [open, editingJobTitle, form]);

  const handleSubmit = (values: FormValues) => {
    if (isEditing) {
      updateMutation.mutate(
        {
          id: editingJobTitle.id,
          name: values.name,
          description: values.description,
          is_active: values.is_active,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createMutation.mutate({
        name: values.name,
        description: values.description,
        is_active: values.is_active,
      }, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cargo" : "Novo Cargo"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do cargo"
              : "Crie um novo cargo padronizado para esta BU"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cargo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Analista de Marketing" {...field} />
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
                    <Textarea
                      placeholder="Descrição opcional do cargo..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Uma breve descrição das responsabilidades do cargo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Cargo Ativo</FormLabel>
                    <FormDescription>
                      Cargos inativos não aparecem para seleção em novos usuários
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
