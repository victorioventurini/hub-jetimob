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
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Info } from "lucide-react";
import {
  INDICATOR_TYPE_LABELS,
  type KpiIndicatorType,
} from "../../../types";
import type { CreateKpiFormValues } from "../schema";

interface Props {
  form: UseFormReturn<CreateKpiFormValues>;
  canCreateKpi: boolean;
  onIndicatorTypeChange: (type: KpiIndicatorType) => void;
}

export function TypeStatusSection({ form, canCreateKpi, onIndicatorTypeChange }: Props) {
  return (
    <FormField
      control={form.control}
      name="indicator_type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Tipo
            <HelpTooltip
              content={
                <div className="space-y-1">
                  <p>
                    <strong>KPI:</strong> Indicador-chave de performance vinculado a
                    objetivos estratégicos.
                  </p>
                  <p>
                    <strong>Métrica:</strong> Medição operacional usada para
                    monitoramento contínuo.
                  </p>
                  {!canCreateKpi && (
                    <p className="text-muted-foreground text-xs mt-2">
                      <Info className="h-3 w-3 inline mr-1" />
                      KPIs só podem ser criados por líderes ou admins.
                    </p>
                  )}
                </div>
              }
            />
          </FormLabel>
          <Select onValueChange={onIndicatorTypeChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {(Object.keys(INDICATOR_TYPE_LABELS) as KpiIndicatorType[]).map(
                (type) => (
                  <SelectItem
                    key={type}
                    value={type}
                    disabled={type === "kpi" && !canCreateKpi}
                  >
                    {INDICATOR_TYPE_LABELS[type]}
                    {type === "kpi" && !canCreateKpi && (
                      <span className="text-muted-foreground ml-1">(restrito)</span>
                    )}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <FormMessage />
          {!canCreateKpi && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md mt-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>KPIs</strong> são indicadores estratégicos e só podem ser
                criados por <strong>líderes de time</strong> ou{" "}
                <strong>administradores</strong>. Você pode criar{" "}
                <strong>Métricas</strong> para acompanhamento operacional.
              </span>
            </div>
          )}
        </FormItem>
      )}
    />
  );
}
