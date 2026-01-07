import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useKpiData } from "../hooks/useKpiData";
import {
  KpiCategory,
  KpiDirection,
  KpiFrequency,
  CATEGORY_LABELS,
  FREQUENCY_LABELS,
  DIRECTION_LABELS,
} from "../types";
import { VicActionButton } from "@/modules/vic";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().max(500).optional(),
  category: z.enum(["financeiro", "growth", "cs", "produto", "operacoes", "pessoas"]),
  unit: z.string().min(1, "Unidade é obrigatória"),
  direction: z.enum(["up", "down"]),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]),
  team_id: z.string().optional(),
  owner_user_id: z.string().optional(),
  target_value: z.coerce.number().optional(),
});

type DbKpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

type FormValues = z.infer<typeof formSchema>;

interface CreateKpiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateKpiDialog({ open, onOpenChange }: CreateKpiDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createKpi } = useKpiData();
  const { currentBu } = useBu();
  const buId = currentBu?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "financeiro",
      unit: "%",
      direction: "up",
      frequency: "monthly",
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["teams-list", buId],
    queryFn: async () => {
      if (!buId) return [];
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!buId,
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-list", buId],
    queryFn: async () => {
      if (!buId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .eq("employment_status", "active")
        .order("display_name");
      if (error) throw error;
      return data;
    },
    enabled: !!buId,
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await createKpi.mutateAsync({
        name: values.name,
        description: values.description || null,
        category: values.category as KpiCategory,
        unit: values.unit,
        direction: values.direction as KpiDirection,
        frequency: values.frequency as DbKpiFrequency,
        team_id: values.team_id || null,
        owner_user_id: values.owner_user_id || null,
        target_value: values.target_value || null,
        status: "active",
      });
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo KPI</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Nome do KPI</FormLabel>
                    {field.value && (
                      <VicActionButton
                        agentSlug="analista-kpis"
                        actionContext="kpi-create"
                        context={{
                          type: "KPI",
                          title: field.value,
                          description: form.watch("description") || undefined,
                          targetValue: form.watch("target_value") || undefined,
                          unit: form.watch("unit"),
                          additionalData: {
                            category: form.watch("category"),
                            direction: form.watch("direction"),
                            frequency: form.watch("frequency"),
                          },
                        }}
                        label="Validar KPI"
                        compact
                      />
                    )}
                  </div>
                  <FormControl>
                    <Input placeholder="Ex: NPS, CAC, Churn Rate..." {...field} />
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
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Defina como esse KPI é calculado..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(CATEGORY_LABELS) as KpiCategory[]).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {CATEGORY_LABELS[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="%">%</SelectItem>
                        <SelectItem value="R$">R$</SelectItem>
                        <SelectItem value="pontos">Pontos</SelectItem>
                        <SelectItem value="dias">Dias</SelectItem>
                        <SelectItem value="número">Número</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direção</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(DIRECTION_LABELS) as KpiDirection[]).map((dir) => (
                          <SelectItem key={dir} value={dir}>
                            {DIRECTION_LABELS[dir]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(FREQUENCY_LABELS) as KpiFrequency[]).map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {FREQUENCY_LABELS[freq]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="target_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta indicativa (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 70"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams?.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="owner_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {profiles?.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar KPI"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
