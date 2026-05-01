/**
 * KpiValueEntryForm — SSOT compartilhado para registrar valor de KPI.
 *
 * Consumidores:
 *  - `AddKpiValueDialog` (modal do módulo /kpis).
 *  - `CollaboratorKpiStep` (rito de check-in colaborador).
 *  - Qualquer rito futuro que precise registrar valor de KPI.
 *
 * Princípios:
 *  - Não duplicar schema/validação. Use `kpiValueEntrySchema`.
 *  - Sugestão automática de `input_type` via `suggestInputType` quando o
 *    consumidor passar `consolidationFrequency`.
 *  - Submit é externo (footer do wizard). O componente expõe `formId` e
 *    chama `onValidSubmit` quando o form é válido.
 *
 * Conforme TCR v3.30.0, o campo `input_type` precisa SEMPRE ser enviado no
 * insert em `kpi_values`. O conceito de `confidence` foi removido de KPIs
 * (era autoavaliação subjetiva, redundante com input_type + source).
 */
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, subDays } from 'date-fns';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

import {
  FREQUENCY_VALUE_LABELS,
  type KpiFrequencyValue,
  type KpiInputType,
} from '../../types';
import { isUpdateFrequencyValid } from '../../utils/frequency';
import {
  kpiValueEntrySchema,
  type KpiValueEntryFormValues,
} from './kpiValueEntrySchema';

export interface KpiValueEntryFormProps {
  /** Unidade do KPI, exibida ao lado do label "Valor". */
  unit: string;
  /**
   * Frequência de consolidação do KPI. Quando informada, habilita a sugestão
   * automática de `input_type` (consolidated × partial) via `suggestInputType`.
   */
  consolidationFrequency?: KpiFrequencyValue | null;
  /**
   * Frequência de update do KPI. Combinada com `consolidationFrequency`,
   * habilita o banner explicativo "consolida X mas atualiza Y".
   */
  updateFrequency?: KpiFrequencyValue | null;
  /** Valor sugerido como placeholder (ex.: target). */
  placeholderValue?: string | number;
  /**
   * `formId` do `<form>` interno — permite que um botão fora do componente
   * (ex.: footer do wizard) submeta via `<button form={formId} type="submit">`.
   */
  formId?: string;
  /** Slot extra renderizado abaixo do campo "Valor" (ex.: indicador de delta + RAG estimado). */
  valueAdornmentSlot?: React.ReactNode;
  /** Slot opcional renderizado acima do campo de Observações (ex.: legenda de notas obrigatórias). */
  notesHeaderSlot?: React.ReactNode;
  /** Marca o campo Observações como obrigatório (validação extra é responsabilidade do consumidor). */
  notesRequired?: boolean;
  /** Placeholder customizado para Observações. */
  notesPlaceholder?: string;
  /** Callback quando o form é submetido válido. */
  onValidSubmit: (values: KpiValueEntryFormValues) => void | Promise<void>;
  /** Permite ao consumidor observar mudanças de valor (ex.: para RAG estimado). */
  onValueChange?: (value: number | undefined) => void;
  /** Permite ao consumidor reagir ao input_type efetivo (após sugestão). */
  onInputTypeChange?: (inputType: KpiInputType) => void;
  /** className do `<form>` raiz. */
  className?: string;
}

export function KpiValueEntryForm({
  unit,
  consolidationFrequency,
  updateFrequency,
  placeholderValue,
  formId,
  valueAdornmentSlot,
  notesHeaderSlot,
  notesRequired = false,
  notesPlaceholder,
  onValidSubmit,
  onValueChange,
  onInputTypeChange,
  className,
}: KpiValueEntryFormProps) {
  // Data máxima permitida: ontem (regra v3.0.0 — Primary KPIs / KPI inputs restricted to past dates)
  const maxDate = useMemo(() => format(subDays(new Date(), 1), 'yyyy-MM-dd'), []);

  const form = useForm<KpiValueEntryFormValues>({
    resolver: zodResolver(kpiValueEntrySchema),
    defaultValues: {
      value: '' as unknown as number,
      reference_date: maxDate,
      input_type: undefined as unknown as KpiInputType,
      notes: '',
    },
  });

  // Notify upstream
  const watchedValue = form.watch('value');
  useEffect(() => {
    if (!onValueChange) return;
    const num = typeof watchedValue === 'number' ? watchedValue : Number(watchedValue);
    onValueChange(Number.isFinite(num) ? num : undefined);
  }, [watchedValue, onValueChange]);

  const watchedInputType = form.watch('input_type');
  useEffect(() => {
    if (onInputTypeChange && watchedInputType) onInputTypeChange(watchedInputType);
  }, [watchedInputType, onInputTypeChange]);

  const isIntermediateAllowed =
    consolidationFrequency && updateFrequency
      ? isUpdateFrequencyValid(consolidationFrequency, updateFrequency) &&
        updateFrequency !== consolidationFrequency
      : false;

  const placeholder = placeholderValue !== undefined && placeholderValue !== null
    ? `Ex: ${placeholderValue}`
    : `Ex: ${unit === '%' ? '75.5' : unit === 'R$' ? '150000' : '42'}`;

  const handleSubmit = form.handleSubmit(async (values) => {
    await onValidSubmit(values);
  });

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={handleSubmit}
        className={cn('space-y-4', className)}
      >
        {/* Valor + Data — lado a lado em ≥sm, empilhados no mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor ({unit})</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={placeholder}
                      {...field}
                    />
                  </div>
                </FormControl>
                {valueAdornmentSlot}
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
        </div>

        {/* Tipo do input — Consolidado / Parcial */}
        <FormField
          control={form.control}
          name="input_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Tipo do input <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-start gap-2">
                    <RadioGroupItem
                      value="consolidated"
                      id={`${formId ?? 'kpi-value'}-it-consolidated`}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`${formId ?? 'kpi-value'}-it-consolidated`}
                      className="font-normal cursor-pointer"
                    >
                      <span className="font-medium">Consolidado</span>
                      <span className="block text-xs text-muted-foreground">
                        Valor final do período fechado.
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem
                      value="partial"
                      id={`${formId ?? 'kpi-value'}-it-partial`}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`${formId ?? 'kpi-value'}-it-partial`}
                      className="font-normal cursor-pointer"
                    >
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

        {/* Observações */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Observações {notesRequired ? <span className="text-destructive">*</span> : '(opcional)'}
              </FormLabel>
              {notesHeaderSlot}
              <FormControl>
                <Textarea
                  placeholder={
                    notesPlaceholder ?? 'Contexto adicional sobre este valor...'
                  }
                  className={cn(notesRequired && 'border-warning')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
