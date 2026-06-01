/**
 * EditKpiBasicFields — Nome, descrição, tipo, status, unidade, frequência,
 * direção, meta e fonte da meta.
 * Extraído de EditKpiDialog.tsx (refatoração P1.4)
 */
import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UnitSelect } from '@/components/selects';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { Info } from 'lucide-react';
import {
  DIRECTION_LABELS,
  FREQUENCY_VALUE_LABELS,
  INDICATOR_TYPE_LABELS,
  type KpiDirection,
  type KpiFrequencyValue,
  type KpiIndicatorType,
} from '../../types';
import {
  FREQUENCY_ORDER,
  getValidUpdateFrequencies,
} from '../../utils/frequency';
import type { EditKpiFormValues } from './editKpiSchema';

interface EditKpiBasicFieldsProps {
  form: UseFormReturn<EditKpiFormValues>;
  canCreateKpi: boolean;
}

export function EditKpiBasicFields({ form, canCreateKpi }: EditKpiBasicFieldsProps) {
  const handleIndicatorTypeChange = (type: KpiIndicatorType) => {
    if (type === 'kpi' && !canCreateKpi) return;
    form.setValue('indicator_type', type);
  };

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome do Indicador</FormLabel>
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
                    <p><strong>KPI:</strong> Indicador-chave de performance.</p>
                    <p><strong>Métrica:</strong> Medição operacional.</p>
                    {!canCreateKpi && (
                      <p className="text-muted-foreground text-xs mt-2">
                        <Info className="h-3 w-3 inline mr-1" />
                        KPIs só podem ser editados por líderes ou admins.
                      </p>
                    )}
                  </div>
                }
              />
            </FormLabel>
            <Select onValueChange={handleIndicatorTypeChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(Object.keys(INDICATOR_TYPE_LABELS) as KpiIndicatorType[]).map((type) => (
                  <SelectItem
                    key={type}
                    value={type}
                    disabled={type === 'kpi' && !canCreateKpi}
                  >
                    {INDICATOR_TYPE_LABELS[type]}
                    {type === 'kpi' && !canCreateKpi && (
                      <span className="text-muted-foreground ml-1">(restrito)</span>
                    )}
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
            <FormControl>
              <UnitSelect
                value={field.value}
                onChange={field.onChange}
                showLabel={false}
                showCustomOption={true}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="consolidation_frequency"
          render={({ field }) => {
            const consolidation = field.value as KpiFrequencyValue;
            const currentUpdate = form.getValues('update_frequency') as KpiFrequencyValue;
            return (
              <FormItem>
                <FormLabel>
                  Frequência de consolidação
                  <HelpTooltip
                    content={
                      <div className="space-y-1">
                        <p>Periodicidade em que o valor é fechado oficialmente.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ex: MRR Commit consolida <strong>mensalmente</strong>.
                        </p>
                      </div>
                    }
                  />
                </FormLabel>
                <Select
                  onValueChange={(v) => {
                    field.onChange(v);
                    // Auto-clear update_frequency se ficou inválida
                    const validUpdates = getValidUpdateFrequencies(v as KpiFrequencyValue);
                    if (!validUpdates.includes(currentUpdate)) {
                      form.setValue('update_frequency', v as KpiFrequencyValue, {
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
                {field.value !== consolidation /* placeholder for future hint */ && null}
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="update_frequency"
          render={({ field }) => {
            const consolidation = form.watch('consolidation_frequency') as KpiFrequencyValue;
            const validUpdates = getValidUpdateFrequencies(consolidation);
            const isIntermediate =
              field.value && consolidation && field.value !== consolidation;
            return (
              <FormItem>
                <FormLabel>
                  Frequência de atualização
                  <HelpTooltip
                    content={
                      <div className="space-y-1">
                        <p>
                          Periodicidade em que novos valores são lançados (pode ser mais
                          frequente que a consolidação).
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ex: MRR Commit pode ser atualizado <strong>semanalmente</strong>{' '}
                          como projeção até o fechamento mensal.
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

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direção</FormLabel>
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
                Meta ou Benchmark
                <HelpTooltip
                  content={
                    <div className="space-y-1">
                      <p>Valor de referência usado para avaliar o desempenho deste indicador.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pode ser uma meta interna, um benchmark de mercado, um recorde histórico da empresa ou outra referência estratégica.
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
              Fonte da Meta ou Benchmark{' '}
              {form.watch('target_value') ? (
                <span className="text-destructive">*</span>
              ) : (
                '(opcional)'
              )}
              <HelpTooltip
                content={
                  <div className="space-y-1">
                    <p>Explique de onde vem esta referência.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Exemplos: estudo de mercado, benchmark setorial, OKR do ciclo, decisão estratégica interna, recorde histórico ou link para material de referência.
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
