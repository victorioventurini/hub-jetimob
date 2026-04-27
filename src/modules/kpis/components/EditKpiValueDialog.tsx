/**
 * EditKpiValueDialog - Editar um valor já registrado de KPI/Métrica
 */

import { useState, useEffect, useMemo } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format, startOfDay, isBefore } from "date-fns";
import { validation } from "@/lib/validationMessages";
import type { KpiValue, KpiFrequencyValue, KpiInputType, KpiConfidenceLevel } from "../types";
import { FREQUENCY_VALUE_LABELS } from "../types";
import { isUpdateFrequencyValid } from "../utils/frequency";

const formSchema = z.object({
  value: z.coerce.number({ required_error: validation.required("Valor") }),
  reference_date: z.string()
    .min(1, validation.required("Data de referência"))
    .refine((date) => {
      const selectedDate = startOfDay(new Date(date));
      const today = startOfDay(new Date());
      return isBefore(selectedDate, today);
    }, { message: validation.consolidatedDate("Data de referência") }),
  notes: z.string().max(500).optional(),
  input_type: z.enum(['consolidated', 'projection']),
  override_confidence: z.boolean().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditKpiValueDialogProps {
  kpiValue: KpiValue | null;
  kpiName: string;
  unit: string;
  consolidationFrequency?: KpiFrequencyValue | null;
  updateFrequency?: KpiFrequencyValue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: string,
    data: {
      value: number;
      reference_date: string;
      notes?: string;
      input_type?: KpiInputType;
      confidence?: KpiConfidenceLevel;
    },
  ) => Promise<void>;
}

export function EditKpiValueDialog({
  kpiValue,
  kpiName,
  unit,
  consolidationFrequency,
  updateFrequency,
  open,
  onOpenChange,
  onSave,
}: EditKpiValueDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxDate = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: undefined,
      reference_date: maxDate,
      notes: "",
      input_type: 'consolidated',
      override_confidence: false,
      confidence: undefined,
    },
  });

  // Reset form when kpiValue changes — hidrata input_type e confidence existentes.
  useEffect(() => {
    if (kpiValue && open) {
      form.reset({
        value: kpiValue.value,
        reference_date: kpiValue.reference_date,
        notes: kpiValue.notes || "",
        input_type: (kpiValue.input_type ?? 'consolidated') as KpiInputType,
        override_confidence: false,
        confidence: kpiValue.confidence,
      });
    }
  }, [kpiValue, open, form]);

  const overrideConfidence = form.watch('override_confidence');
  const isIntermediateAllowed = useMemo(
    () =>
      consolidationFrequency && updateFrequency
        ? isUpdateFrequencyValid(consolidationFrequency, updateFrequency) &&
          updateFrequency !== consolidationFrequency
        : false,
    [consolidationFrequency, updateFrequency],
  );

  const onSubmit = async (values: FormValues) => {
    if (!kpiValue) return;
    setIsSubmitting(true);
    try {
      await onSave(kpiValue.id, {
        value: values.value,
        reference_date: values.reference_date,
        notes: values.notes || undefined,
        input_type: values.input_type,
        confidence: values.override_confidence ? values.confidence : undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Valor – {kpiName} ({unit})</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor ({unit})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={`Ex: ${unit === "%" ? "75.5" : unit === "R$" ? "150000" : "42"}`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Referência</FormLabel>
                  <FormControl>
                    <Input type="date" max={maxDate} {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Informe o último dia do período consolidado (até ontem)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="input_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo do input</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="consolidated" id="eit-consolidated" className="mt-0.5" />
                        <Label htmlFor="eit-consolidated" className="font-normal cursor-pointer">
                          <span className="font-medium">Consolidado</span>
                          <span className="block text-xs text-muted-foreground">
                            Valor final do período fechado.
                          </span>
                        </Label>
                      </div>
                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="projection" id="eit-projection" className="mt-0.5" />
                        <Label htmlFor="eit-projection" className="font-normal cursor-pointer">
                          <span className="font-medium">Projeção</span>
                          <span className="block text-xs text-muted-foreground">
                            Estimativa enquanto o período ainda não fechou.
                          </span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  {isIntermediateAllowed && consolidationFrequency && updateFrequency && (
                    <p className="text-xs text-muted-foreground">
                      Este KPI consolida{' '}
                      <strong>{FREQUENCY_VALUE_LABELS[consolidationFrequency].toLowerCase()}</strong>{' '}
                      mas é atualizado{' '}
                      <strong>{FREQUENCY_VALUE_LABELS[updateFrequency].toLowerCase()}</strong>.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Contexto adicional sobre este valor..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <details className="rounded-md border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Avançado
              </summary>
              <div className="mt-3 space-y-3">
                <FormField
                  control={form.control}
                  name="override_confidence"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="eit-override-conf"
                        />
                      </FormControl>
                      <Label htmlFor="eit-override-conf" className="font-normal cursor-pointer text-sm">
                        Sobrescrever confidence
                        <span className="block text-xs text-muted-foreground">
                          Atual: <strong>
                            {kpiValue?.confidence === 'high' ? 'Alta'
                              : kpiValue?.confidence === 'low' ? 'Baixa'
                              : 'Média'}
                          </strong>. Padrão: alta para consolidado, média para projeção.
                        </span>
                      </Label>
                    </FormItem>
                  )}
                />
                {overrideConfidence && (
                  <FormField
                    control={form.control}
                    name="confidence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Confidence</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex gap-3"
                          >
                            {(['high', 'medium', 'low'] as const).map((c) => (
                              <div key={c} className="flex items-center gap-1.5">
                                <RadioGroupItem value={c} id={`eit-conf-${c}`} />
                                <Label htmlFor={`eit-conf-${c}`} className="font-normal text-sm cursor-pointer">
                                  {c === 'high' ? 'Alta' : c === 'medium' ? 'Média' : 'Baixa'}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </details>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting} loadingText="Salvando...">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
