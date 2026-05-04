import type { UseFormReturn } from "react-hook-form";
import {
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
import { UnitSelect } from "@/components/selects";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import {
  FREQUENCY_VALUE_LABELS,
  type KpiFrequencyValue,
} from "../../../types";
import { FREQUENCY_ORDER, getValidUpdateFrequencies } from "../../../utils/frequency";
import type { CreateKpiFormValues } from "../schema";

interface Props {
  form: UseFormReturn<CreateKpiFormValues>;
}

export function UnitFrequencySection({ form }: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidade</FormLabel>
              <FormControl>
                <UnitSelect
                  value={field.value}
                  onChange={field.onChange}
                  showLabel={false}
                  showCustomOption
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="consolidation_frequency"
          render={({ field }) => {
            const currentUpdate = form.getValues("update_frequency") as KpiFrequencyValue;
            return (
              <FormItem>
                <FormLabel>
                  Frequência de consolidação
                  <HelpTooltip content="Periodicidade em que o valor é fechado oficialmente. Ex: MRR consolida mensalmente." />
                </FormLabel>
                <Select
                  onValueChange={(v) => {
                    field.onChange(v);
                    const valid = getValidUpdateFrequencies(v as KpiFrequencyValue);
                    if (!valid.includes(currentUpdate)) {
                      form.setValue("update_frequency", v as KpiFrequencyValue, {
                        shouldDirty: true,
                      });
                    }
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FREQUENCY_ORDER.map((freq) => (
                      <SelectItem key={freq} value={freq}>
                        {FREQUENCY_VALUE_LABELS[freq]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="update_frequency"
          render={({ field }) => {
            const cons = form.watch("consolidation_frequency") as KpiFrequencyValue;
            const validUpdates = getValidUpdateFrequencies(cons);
            const isIntermediate = field.value && cons && field.value !== cons;
            return (
              <FormItem>
                <FormLabel>
                  Frequência de atualização
                  <HelpTooltip content="Periodicidade em que novos valores são lançados (pode ser mais frequente que a consolidação — inputs intermediários viram projeção)." />
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FREQUENCY_ORDER.map((freq) => (
                      <SelectItem
                        key={freq}
                        value={freq}
                        disabled={!validUpdates.includes(freq)}
                      >
                        {FREQUENCY_VALUE_LABELS[freq]}
                        {!validUpdates.includes(freq) && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            (inválido)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isIntermediate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Inputs intermediários serão tratados como projeção.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>
    </>
  );
}
