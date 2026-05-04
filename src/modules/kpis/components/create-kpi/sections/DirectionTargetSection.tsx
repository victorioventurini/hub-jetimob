import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
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
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { DIRECTION_LABELS, type KpiDirection } from "../../../types";
import type { CreateKpiFormValues } from "../schema";

interface Props {
  form: UseFormReturn<CreateKpiFormValues>;
}

export function DirectionTargetSection({ form }: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Direção
                <HelpTooltip
                  content={
                    <div className="space-y-1">
                      <p>
                        <strong>Maior é melhor:</strong> Valores acima da meta são
                        positivos (ex: NPS, receita).
                      </p>
                      <p>
                        <strong>Menor é melhor:</strong> Valores abaixo da meta são
                        positivos (ex: churn, CAC).
                      </p>
                    </div>
                  }
                />
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
          name="target_value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Meta ou Benchmark <span className="text-destructive">*</span>
                <HelpTooltip
                  content={
                    <div className="space-y-1">
                      <p>Valor de referência usado para avaliar o desempenho deste indicador.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pode ser uma meta interna, um benchmark de mercado, um recorde
                        histórico da empresa ou outra referência estratégica.
                      </p>
                    </div>
                  }
                />
              </FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="Ex: 70" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="target_source"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Fonte da Meta ou Benchmark <span className="text-destructive">*</span>
              <HelpTooltip
                content={
                  <div className="space-y-1">
                    <p>Explique de onde vem esta referência.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Exemplos: estudo de mercado, benchmark setorial, OKR do ciclo,
                      decisão estratégica interna, recorde histórico ou link para
                      material de referência.
                    </p>
                  </div>
                }
              />
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Ex: OKR Q1 2026, Benchmark Gartner, Decisão Board..."
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
