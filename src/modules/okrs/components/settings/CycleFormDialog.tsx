import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(["year", "quarter"]),
  start_date: z.string().min(1, "Data de início é obrigatória"),
  end_date: z.string().min(1, "Data de término é obrigatória"),
  planning_date: z.string().optional(),
  review_date: z.string().optional(),
  retro_date: z.string().optional(),
  parent_cycle_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Cycle {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  planning_date: string | null;
  review_date: string | null;
  retro_date: string | null;
  parent_cycle_id: string | null;
}

interface CycleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle?: Cycle | null;
  yearCycles: Cycle[];
}

export function CycleFormDialog({
  open,
  onOpenChange,
  cycle,
  yearCycles,
}: CycleFormDialogProps) {
  const queryClient = useQueryClient();
  const { client: supabase, buId } = useOptionalBuClient();
  const isEditing = !!cycle;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "quarter",
      start_date: "",
      end_date: "",
      planning_date: "",
      review_date: "",
      retro_date: "",
      parent_cycle_id: "",
    },
  });

  const watchType = form.watch("type");

  // Reset form when dialog opens/closes or cycle changes
  useEffect(() => {
    if (open && cycle) {
      form.reset({
        name: cycle.name,
        type: cycle.type as "year" | "quarter",
        start_date: cycle.start_date,
        end_date: cycle.end_date,
        planning_date: cycle.planning_date || "",
        review_date: cycle.review_date || "",
        retro_date: cycle.retro_date || "",
        parent_cycle_id: cycle.parent_cycle_id || "",
      });
    } else if (open && !cycle) {
      form.reset({
        name: "",
        type: "quarter",
        start_date: "",
        end_date: "",
        planning_date: "",
        review_date: "",
        retro_date: "",
        parent_cycle_id: "",
      });
    }
  }, [open, cycle, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!supabase || !buId) throw new Error('Nenhuma BU selecionada');

      const payload = {
        name: values.name,
        type: values.type,
        start_date: values.start_date,
        end_date: values.end_date,
        planning_date: values.planning_date || null,
        review_date: values.review_date || null,
        retro_date: values.retro_date || null,
        parent_cycle_id: values.parent_cycle_id || null,
      };

      if (isEditing && cycle) {
        const { error } = await supabase
          .from("cycles")
          .update(payload)
          .eq("id", cycle.id);
        if (error) throw error;
      } else {
        // bu_id is auto-filled by enforce_bu_scope trigger via x-current-bu-id header
        const { error } = await supabase.from("cycles").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.settingsCycles(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.cyclesList(null) });
      toast.success(isEditing ? "Ciclo atualizado" : "Ciclo criado");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao salvar ciclo");
      console.error(error);
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Ciclo" : "Novo Ciclo"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize as informações do ciclo" : "Configure um novo ciclo para os OKRs"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 2025, Q1 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="year">Anual</SelectItem>
                      <SelectItem value="quarter">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {field.value === "year"
                      ? "Ciclos anuais são usados para Objetivos Organizacionais"
                      : "Ciclos trimestrais são usados para Objetivos de Time"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchType === "quarter" && yearCycles.length > 0 && (
              <FormField
                control={form.control}
                name="parent_cycle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo Anual (opcional)</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um ciclo anual" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {yearCycles.map((y) => (
                          <SelectItem key={y.id} value={y.id}>
                            {y.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Vincule este trimestre a um ciclo anual para melhor organização
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Término</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-3">Datas de Rituais (opcional)</p>
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="planning_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Planejamento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="review_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Revisão</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retro_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Retrospectiva</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
