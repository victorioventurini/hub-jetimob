import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VicActionButton } from "@/modules/vic";
import type { CreateKpiFormValues } from "../schema";

interface Props {
  form: UseFormReturn<CreateKpiFormValues>;
}

export function IdentitySection({ form }: Props) {
  const watchIndicatorType = form.watch("indicator_type");
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Nome do Indicador</FormLabel>
              {field.value && (
                <VicActionButton
                  agentSlug="analista-kpis"
                  actionContext="kpi-create"
                  context={{
                    type: watchIndicatorType === "kpi" ? "KPI" : "Métrica",
                    title: field.value,
                    description: form.watch("description") || undefined,
                    targetValue: form.watch("target_value") || undefined,
                    unit: form.watch("unit"),
                    additionalData: {
                      direction: form.watch("direction"),
                      consolidation_frequency: form.watch("consolidation_frequency"),
                      update_frequency: form.watch("update_frequency"),
                      indicator_type: form.watch("indicator_type"),
                    },
                  }}
                  label="Validar"
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
                placeholder="Defina como esse indicador é calculado..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
