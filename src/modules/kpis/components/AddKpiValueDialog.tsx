import { useState, useMemo, useEffect } from "react";
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
import { useKpiData } from "../hooks";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, startOfDay, isBefore } from "date-fns";
import { validation } from "@/lib/validationMessages";
import {
  FREQUENCY_VALUE_LABELS,
  type KpiFrequencyValue,
  type KpiInputType,
} from "../types";
import { suggestInputType, isUpdateFrequencyValid } from "../utils/frequency";

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
  input_type: z.enum(['consolidated', 'partial']),
  override_confidence: z.boolean().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddKpiValueDialogProps {
  kpiId: string;
  kpiName: string;
  unit: string;
  /** v3.0.0: passar para habilitar sugestão automática de input_type. */
  consolidationFrequency?: KpiFrequencyValue | null;
  /** v3.0.0: usado para detectar quando inputs são intermediários. */
  updateFrequency?: KpiFrequencyValue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddKpiValueDialog({
  kpiId,
  kpiName,
  unit,
  consolidationFrequency,
  updateFrequency,
  open,
  onOpenChange,
}: AddKpiValueDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addKpiValue } = useKpiData();
  const { profile } = useAuth();

  // Data máxima permitida: ontem (dados consolidados)
  const maxDate = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const defaultInputType: KpiInputType = useMemo(() => {
    if (!consolidationFrequency) return 'consolidated';
    return suggestInputType(
      { consolidation_frequency: consolidationFrequency } as Parameters<typeof suggestInputType>[0],
      new Date(maxDate),
    );
  }, [consolidationFrequency, maxDate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: undefined,
      reference_date: maxDate,
      notes: "",
      input_type: defaultInputType,
      override_confidence: false,
      confidence: undefined,
    },
  });

  // Re-sugerir input_type quando o usuário mudar a data de referência
  const watchedDate = form.watch('reference_date');
  useEffect(() => {
    if (!consolidationFrequency || !watchedDate) return;
    const suggestion = suggestInputType(
      { consolidation_frequency: consolidationFrequency } as Parameters<typeof suggestInputType>[0],
      new Date(watchedDate),
    );
    // Não sobrescrever se o usuário já alterou manualmente — comparamos apenas se difere do default inicial
    form.setValue('input_type', suggestion, { shouldDirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedDate, consolidationFrequency]);

  const overrideConfidence = form.watch('override_confidence');
  const isIntermediateAllowed =
    consolidationFrequency && updateFrequency
      ? isUpdateFrequencyValid(consolidationFrequency, updateFrequency) &&
        updateFrequency !== consolidationFrequency
      : false;

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await addKpiValue.mutateAsync({
        kpi_id: kpiId,
        value: values.value,
        reference_date: values.reference_date,
        notes: values.notes || undefined,
        created_by: profile?.id,
        source: "manual",
        input_type: values.input_type,
        confidence: values.override_confidence ? values.confidence : undefined,
      });
      form.reset({
        value: undefined,
        reference_date: maxDate,
        notes: "",
        input_type: defaultInputType,
        override_confidence: false,
        confidence: undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Registrar Valor - {kpiName}</DialogTitle>
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
                        <RadioGroupItem value="consolidated" id="ait-consolidated" className="mt-0.5" />
                        <Label htmlFor="ait-consolidated" className="font-normal cursor-pointer">
                          <span className="font-medium">Consolidado</span>
                          <span className="block text-xs text-muted-foreground">
                            Valor final do período fechado.
                          </span>
                        </Label>
                      </div>
                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="partial" id="ait-partial" className="mt-0.5" />
                        <Label htmlFor="ait-partial" className="font-normal cursor-pointer">
                          <span className="font-medium">Parcial</span>
                          <span className="block text-xs text-muted-foreground">
                            Valor atingido até a data, antes do período fechar.
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
                      Inputs antes do fechamento são tratados como parciais.
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
                          id="ait-override-conf"
                        />
                      </FormControl>
                      <Label htmlFor="ait-override-conf" className="font-normal cursor-pointer text-sm">
                        Sobrescrever confidence
                        <span className="block text-xs text-muted-foreground">
                          Padrão: <strong>alta</strong> para consolidado, <strong>média</strong> para projeção.
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
                                <RadioGroupItem value={c} id={`ait-conf-${c}`} />
                                <Label htmlFor={`ait-conf-${c}`} className="font-normal text-sm cursor-pointer">
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
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
