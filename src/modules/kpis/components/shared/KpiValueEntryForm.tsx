/**
 * KpiValueEntryForm — SSOT compartilhado para registrar valor de KPI.
 *
 * UX (v3.31): Tipo do registro (Consolidado × Parcial) é pré-selecionado
 * automaticamente via `suggestInputType`, com badge "RECOMENDADO" e
 * descrições contextuais usando o período calculado. Quando o KPI não tem
 * janela parcial (update_frequency === consolidation_frequency), o radio
 * "Parcial" fica desabilitado.
 *
 * Conforme TCR v3.30.0, `input_type` precisa SEMPRE ser enviado no insert
 * em `kpi_values`. `confidence` foi removido (autoavaliação subjetiva).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { type KpiFrequencyValue, type KpiInputType } from '../../types';
import {
  getConsolidationPeriod,
  isUpdateFrequencyValid,
  suggestInputType,
} from '../../utils/frequency';
import {
  kpiValueEntrySchema,
  type KpiValueEntryFormValues,
} from './kpiValueEntrySchema';
import { KpiValueInput } from './KpiValueInput';
import { getMaskConfigForUnit, formatWithMask } from '../../utils/numberFormat';

export interface KpiValueEntryFormProps {
  /** Unidade do KPI, exibida ao lado do label "Valor". */
  unit: string;
  /** Frequência de consolidação do KPI. Habilita sugestão automática e microcopy de período. */
  consolidationFrequency?: KpiFrequencyValue | null;
  /** Frequência de update do KPI. Combinada com consolidação, define se há janela parcial. */
  updateFrequency?: KpiFrequencyValue | null;
  /** Valor sugerido como placeholder (ex.: target). */
  placeholderValue?: string | number;
  /** `formId` para submit externo. */
  formId?: string;
  /** Slot abaixo do campo "Valor" (ex.: delta + RAG estimado). */
  valueAdornmentSlot?: React.ReactNode;
  /** Slot acima de Observações (ex.: legenda de notas obrigatórias). */
  notesHeaderSlot?: React.ReactNode;
  /** Marca Observações como obrigatória (gating real é do consumidor). */
  notesRequired?: boolean;
  notesPlaceholder?: string;
  onValidSubmit: (values: KpiValueEntryFormValues) => void | Promise<void>;
  onValueChange?: (value: number | undefined) => void;
  onInputTypeChange?: (inputType: KpiInputType) => void;
  className?: string;
}

// === Helpers de microcopy ===

function formatPeriodHuman(
  freq: KpiFrequencyValue | null | undefined,
  refDateIso: string,
): { label: string; range: string } | null {
  if (!freq || !refDateIso) return null;
  let date: Date;
  try {
    date = parseISO(refDateIso);
    if (Number.isNaN(date.getTime())) return null;
  } catch {
    return null;
  }
  const period = getConsolidationPeriod(freq, date);

  const labelMap: Record<KpiFrequencyValue, string> = {
    daily: format(period.start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    weekly: `Semana de ${format(period.start, 'dd/MM', { locale: ptBR })}`,
    biweekly: `Quinzena de ${format(period.start, 'dd/MM', { locale: ptBR })}`,
    monthly: format(period.start, "MMMM 'de' yyyy", { locale: ptBR }),
    quarterly: `${format(period.start, 'QQQ', { locale: ptBR })} de ${format(period.start, 'yyyy', { locale: ptBR })}`,
    semiannual: `${format(period.start, 'MM') === '01' ? 'H1' : 'H2'} de ${format(period.start, 'yyyy', { locale: ptBR })}`,
    annual: format(period.start, 'yyyy', { locale: ptBR }),
  };

  const label = labelMap[freq];
  const range = `${format(period.start, 'dd/MM', { locale: ptBR })} → ${format(period.end, 'dd/MM', { locale: ptBR })}`;
  return { label: capitalize(label), range };
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
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
  // Data máxima: ontem (v3.0.0 — KPI inputs restricted to past dates)
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

  // Flag: usuário tocou manualmente no radio → sugestão automática para de sobrescrever
  const [userTouched, setUserTouched] = useState(false);

  // === Cálculos derivados ===

  // KPIs sem janela parcial: update_frequency === consolidation_frequency (ou updateFreq ausente)
  const hasPartialWindow = useMemo(() => {
    if (!consolidationFrequency || !updateFrequency) return false;
    if (!isUpdateFrequencyValid(consolidationFrequency, updateFrequency)) return false;
    return updateFrequency !== consolidationFrequency;
  }, [consolidationFrequency, updateFrequency]);

  const watchedRefDate = form.watch('reference_date');
  const watchedInputType = form.watch('input_type');

  // Sugestão automática (recalcula quando data ou cadências mudam)
  const suggested: KpiInputType = useMemo(() => {
    if (!consolidationFrequency) return 'consolidated';
    let date: Date;
    try {
      date = watchedRefDate ? parseISO(watchedRefDate) : new Date();
      if (Number.isNaN(date.getTime())) date = new Date();
    } catch {
      date = new Date();
    }
    return suggestInputType(
      {
        consolidation_frequency: consolidationFrequency,
        update_frequency: updateFrequency ?? consolidationFrequency,
        frequency: undefined as any,
      },
      date,
    );
  }, [consolidationFrequency, updateFrequency, watchedRefDate]);

  // Pré-seleção / re-sugestão enquanto o usuário não fez override
  const lastSuggestedRef = useRef<KpiInputType | null>(null);
  useEffect(() => {
    if (userTouched) return;
    // KPI sem janela parcial → sempre consolidado
    const effective: KpiInputType = hasPartialWindow ? suggested : 'consolidated';
    if (lastSuggestedRef.current === effective && form.getValues('input_type') === effective) {
      return;
    }
    lastSuggestedRef.current = effective;
    form.setValue('input_type', effective, { shouldDirty: false, shouldValidate: true });
  }, [suggested, hasPartialWindow, userTouched, form]);

  // Period microcopy
  const period = useMemo(
    () => formatPeriodHuman(consolidationFrequency, watchedRefDate),
    [consolidationFrequency, watchedRefDate],
  );

  // Upstream notifications
  const watchedValue = form.watch('value');
  useEffect(() => {
    if (!onValueChange) return;
    const num = typeof watchedValue === 'number' ? watchedValue : Number(watchedValue);
    onValueChange(Number.isFinite(num) ? num : undefined);
  }, [watchedValue, onValueChange]);

  useEffect(() => {
    if (onInputTypeChange && watchedInputType) onInputTypeChange(watchedInputType);
  }, [watchedInputType, onInputTypeChange]);

  const placeholder = (() => {
    if (placeholderValue !== undefined && placeholderValue !== null && placeholderValue !== '') {
      const asNum = typeof placeholderValue === 'number' ? placeholderValue : Number(placeholderValue);
      if (Number.isFinite(asNum)) {
        return `Ex.: ${formatWithMask(asNum, getMaskConfigForUnit(unit))}`;
      }
      return `Ex.: ${placeholderValue}`;
    }
    if (unit === 'R$') return 'Ex.: R$ 1.500,00';
    if (unit === '%') return 'Ex.: 75,5';
    return 'Ex.: 1.500';
  })();

  const handleSubmit = form.handleSubmit(async (values) => {
    await onValidSubmit(values);
  });

  const isAutoSuggested = !userTouched && !!consolidationFrequency;
  const currentSuggestion: KpiInputType = hasPartialWindow ? suggested : 'consolidated';

  const handleInputTypeChange = (next: string) => {
    setUserTouched(true);
    form.setValue('input_type', next as KpiInputType, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // === Descrições contextuais ===

  const partialDesc = period
    ? `O período de ${period.label} ainda está em aberto. Este valor representa o acumulado até a data.`
    : 'Valor parcial: registrado antes do fechamento do período.';

  const consolidatedDesc = period
    ? `Valor final do período. Use apenas se estiver registrando o dado de fechamento de ${period.label}.`
    : 'Valor final do período consolidado.';

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={handleSubmit}
        className={cn('space-y-4', className)}
      >
        {/* Valor + Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder={placeholder}
                    {...field}
                  />
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
                {period ? (
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {period.label} — {period.range}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Informe o último dia do período consolidado (até ontem)
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tipo do registro */}
        <FormField
          control={form.control}
          name="input_type"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-2">
                <FormLabel className="flex items-center gap-2">
                  Tipo do registro
                  {isAutoSuggested && (
                    <span className="px-1.5 py-0.5 bg-info/10 text-info text-[10px] font-bold rounded border border-info/20 uppercase tracking-tight">
                      Sugestão automática
                    </span>
                  )}
                </FormLabel>
              </div>
              <FormControl>
                <RadioGroup
                  value={field.value ?? ''}
                  onValueChange={handleInputTypeChange}
                  className="grid gap-2"
                >
                  {/* Consolidado */}
                  <InputTypeCard
                    id={`${formId ?? 'kpi-value'}-it-consolidated`}
                    value="consolidated"
                    title="Consolidado"
                    description={consolidatedDesc}
                    selected={field.value === 'consolidated'}
                    recommended={isAutoSuggested && currentSuggestion === 'consolidated'}
                  />
                  {/* Parcial */}
                  <InputTypeCard
                    id={`${formId ?? 'kpi-value'}-it-partial`}
                    value="partial"
                    title="Parcial"
                    description={
                      hasPartialWindow
                        ? partialDesc
                        : 'Este KPI não tem janela parcial — só aceita valor consolidado no fechamento do período.'
                    }
                    selected={field.value === 'partial'}
                    recommended={isAutoSuggested && currentSuggestion === 'partial'}
                    disabled={!hasPartialWindow && !!consolidationFrequency}
                    disabledTooltip="Este KPI não tem janela parcial — atualiza no fechamento do período."
                  />
                </RadioGroup>
              </FormControl>
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

// === Subcomponente ===

interface InputTypeCardProps {
  id: string;
  value: KpiInputType;
  title: string;
  description: string;
  selected: boolean;
  recommended?: boolean;
  disabled?: boolean;
  disabledTooltip?: string;
}

function InputTypeCard({
  id,
  value,
  title,
  description,
  selected,
  recommended,
  disabled,
  disabledTooltip,
}: InputTypeCardProps) {
  const card = (
    <label
      htmlFor={id}
      className={cn(
        'relative flex flex-col gap-1 p-3 rounded-lg border transition-colors cursor-pointer',
        selected
          ? 'border-2 border-primary bg-muted'
          : 'border-border hover:bg-muted/50',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RadioGroupItem
            value={value}
            id={id}
            disabled={disabled}
            className="shrink-0"
          />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {recommended && !disabled && (
          <span className="text-[10px] font-bold text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded uppercase tracking-tight">
            Recomendado
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground pl-6">{description}</p>
    </label>
  );

  if (disabled && disabledTooltip) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{card}</div>
          </TooltipTrigger>
          <TooltipContent>{disabledTooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return card;
}
