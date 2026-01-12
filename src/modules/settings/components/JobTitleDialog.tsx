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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useCreateJobTitle, useUpdateJobTitle } from "../hooks/useJobTitles";
import { useAllBus } from "@/modules/users-global/hooks/useAllBus";
import { useBu } from "@/contexts/BuContext";
import type { JobTitleWithUsageCount } from "../types";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
  is_active: z.boolean(),
  bu_ids: z.array(z.string()).min(1, "Selecione pelo menos uma BU"),
});

type FormValues = z.infer<typeof formSchema>;

interface JobTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingJobTitle: JobTitleWithUsageCount | null;
}

export function JobTitleDialog({ open, onOpenChange, editingJobTitle }: JobTitleDialogProps) {
  const isEditing = !!editingJobTitle;
  const { currentBu } = useBu();
  const { data: allBus = [] } = useAllBus();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
      bu_ids: currentBu?.id ? [currentBu.id] : [],
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
          bu_ids: editingJobTitle.bu_ids || [],
        });
      } else {
        form.reset({
          name: "",
          description: "",
          is_active: true,
          bu_ids: currentBu?.id ? [currentBu.id] : [],
        });
      }
    }
  }, [open, editingJobTitle, form, currentBu?.id]);

  const handleSubmit = (values: FormValues) => {
    if (isEditing) {
      updateMutation.mutate(
        {
          id: editingJobTitle.id,
          name: values.name,
          description: values.description,
          is_active: values.is_active,
          bu_ids: values.bu_ids,
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
        bu_ids: values.bu_ids,
      }, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const selectedBuIds = form.watch("bu_ids");

  const toggleBu = (buId: string) => {
    const current = form.getValues("bu_ids");
    if (current.includes(buId)) {
      form.setValue("bu_ids", current.filter((id) => id !== buId), { shouldValidate: true });
    } else {
      form.setValue("bu_ids", [...current, buId], { shouldValidate: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cargo" : "Novo Cargo"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do cargo"
              : "Crie um novo cargo e selecione em quais BUs ele estará disponível"}
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
              name="bu_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Business Units *</FormLabel>
                  <div className="border rounded-md p-3 space-y-2 max-h-[150px] overflow-y-auto">
                    {allBus.map((bu) => (
                      <label
                        key={bu.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <Checkbox
                          checked={selectedBuIds.includes(bu.id)}
                          onCheckedChange={() => toggleBu(bu.id)}
                        />
                        <span className="text-sm">{bu.name}</span>
                        {bu.id === currentBu?.id && (
                          <Badge variant="secondary" className="text-xs">atual</Badge>
                        )}
                      </label>
                    ))}
                  </div>
                  <FormDescription>
                    Selecione em quais BUs este cargo estará disponível
                  </FormDescription>
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
                      Cargos inativos não aparecem para seleção
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
