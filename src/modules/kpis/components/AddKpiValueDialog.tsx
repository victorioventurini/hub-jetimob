import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { useKpiData, useKpiMutations } from '../hooks';
import { useAuth } from '@/hooks/useAuth';
import type { KpiDirection, KpiFrequencyValue, KpiRagStatus } from '../types';
import { KpiValueEntryForm } from './shared';
import { useToast } from '@/hooks/use-toast';
import { calculateKpiRag } from '../utils/rag';

/**
 * AddKpiValueDialog — Modal canônico para registrar valor de KPI.
 *
 * Regra: 1 valor `consolidated` por período por KPI.
 * Em caso de conflito, abre AlertDialog perguntando se o usuário
 * deseja substituir o consolidado existente.
 *
 * Gate canônico (TCR §KPI Values): notes obrigatória quando o RAG estimado
 * for `at_risk` ou `off_track`. A regra é validada também por trigger no DB
 * (`kpi_validate_value_insert`); aqui antecipamos para UX clara.
 */
interface AddKpiValueDialogProps {
  kpiId: string;
  kpiName: string;
  unit: string;
  consolidationFrequency?: KpiFrequencyValue | null;
  updateFrequency?: KpiFrequencyValue | null;
  /** Necessário para estimar o RAG e exigir justificativa em amarelo/vermelho. */
  targetValue?: number | null;
  /** Necessário para estimar o RAG corretamente em KPIs `down`. */
  direction?: KpiDirection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORM_ID = 'add-kpi-value-form';

interface PendingValues {
  value: number;
  reference_date: string;
  notes?: string;
  input_type: 'partial' | 'consolidated';
}

export function AddKpiValueDialog({
  kpiId,
  kpiName,
  unit,
  consolidationFrequency,
  updateFrequency,
  targetValue,
  direction,
  open,
  onOpenChange,
}: AddKpiValueDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentValue, setCurrentValue] = useState<number | undefined>(undefined);
  const [conflict, setConflict] = useState<{
    existingId: string;
    pending: PendingValues;
  } | null>(null);
  const { addKpiValue } = useKpiData();
  const { updateKpiValue } = useKpiMutations();
  const { profile } = useAuth();
  const { toast } = useToast();

  // RAG estimado para gate de notes obrigatória (espelha kpi_calculate_rag).
  const estimatedRag: KpiRagStatus | null =
    currentValue !== undefined && targetValue !== null && targetValue !== undefined
      ? calculateKpiRag(currentValue, targetValue, direction ?? 'up')
      : null;
  const notesRequired = estimatedRag === 'at_risk' || estimatedRag === 'off_track';

  const submit = async (values: PendingValues) => {
    if (notesRequired && (!values.notes || values.notes.trim().length === 0)) {
      toast({
        title: 'Justificativa obrigatória',
        description:
          'Indicadores fora da meta (amarelo/vermelho) exigem um comentário explicando o desvio.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await addKpiValue.mutateAsync({
        kpi_id: kpiId,
        value: values.value,
        reference_date: values.reference_date,
        notes: values.notes || undefined,
        created_by: profile?.id,
        source: 'manual',
        input_type: values.input_type,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const hint = (err as { hint?: string } | null)?.hint ?? '';
      if (typeof hint === 'string' && hint.startsWith('kpi_consolidated_period_conflict:')) {
        const existingId = hint.split(':')[1];
        setConflict({ existingId, pending: values });
      }
      // Outros erros já são tratados via toast em onError do mutation.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplace = async () => {
    if (!conflict) return;
    setIsSubmitting(true);
    try {
      await updateKpiValue.mutateAsync({
        id: conflict.existingId,
        kpi_id: kpiId,
        value: conflict.pending.value,
        reference_date: conflict.pending.reference_date,
        notes: conflict.pending.notes,
        input_type: 'consolidated',
      });
      setConflict(null);
      onOpenChange(false);
    } catch (err: unknown) {
      const copy = getKpiValueUpdateErrorCopy(err, kpiName);
      toast({
        title: copy.title,
        description: copy.description,
        variant: 'destructive',
      });

    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Registrar Valor - {kpiName}</DialogTitle>
          </DialogHeader>

          <KpiValueEntryForm
            unit={unit}
            consolidationFrequency={consolidationFrequency}
            updateFrequency={updateFrequency}
            placeholderValue={targetValue ?? undefined}
            formId={FORM_ID}
            onValidSubmit={submit}
            onValueChange={setCurrentValue}
            notesRequired={notesRequired}
            notesPlaceholder={
              notesRequired
                ? 'Explique o desvio da meta (obrigatório para indicadores amarelo/vermelho)'
                : 'Contexto adicional sobre este valor...'
            }
            notesHeaderSlot={
              notesRequired ? (
                <p className="text-xs text-warning">
                  Justificativa obrigatória para indicadores fora da meta
                </p>
              ) : null
            }
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              isLoading={isSubmitting}
              loadingText="Salvando..."
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!conflict} onOpenChange={(o) => !o && setConflict(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Já existe um valor consolidado neste período</AlertDialogTitle>
            <AlertDialogDescription>
              Este KPI já possui um valor consolidado para o período de referência informado.
              Cada KPI pode ter apenas um valor consolidado por período. Deseja substituir o
              valor existente pelo novo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReplace} disabled={isSubmitting}>
              {isSubmitting ? 'Substituindo...' : 'Substituir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
