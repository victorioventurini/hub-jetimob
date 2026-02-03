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
import { useKpiData } from "../hooks";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, startOfDay, isBefore } from "date-fns";
import { validation } from "@/lib/validationMessages";

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
});

type FormValues = z.infer<typeof formSchema>;

interface AddKpiValueDialogProps {
  kpiId: string;
  kpiName: string;
  unit: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddKpiValueDialog({
  kpiId,
  kpiName,
  unit,
  open,
  onOpenChange,
}: AddKpiValueDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addKpiValue } = useKpiData();
  const { profile } = useAuth();

  // Data máxima permitida: ontem (dados consolidados)
  const maxDate = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: undefined,
      reference_date: maxDate,
      notes: "",
    },
  });

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
      });
      form.reset({
        value: undefined,
        reference_date: maxDate,
        notes: "",
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
