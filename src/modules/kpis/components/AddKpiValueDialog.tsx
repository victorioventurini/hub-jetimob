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
import type { KpiFrequencyValue } from '../types';
import { KpiValueEntryForm } from './shared';
import { useToast } from '@/hooks/use-toast';

/**
 * AddKpiValueDialog — Modal canônico para registrar valor de KPI.
 *
 * Regra: 1 valor `consolidated` por período por KPI.
 * Em caso de conflito, abre AlertDialog perguntando se o usuário
 * deseja substituir o consolidado existente.
 */
interface AddKpiValueDialogProps {
  kpiId: string;
  kpiName: string;
  unit: string;
  consolidationFrequency?: KpiFrequencyValue | null;
  updateFrequency?: KpiFrequencyValue | null;
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
  open,
  onOpenChange,
}: AddKpiValueDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflict, setConflict] = useState<{
    existingId: string;
    pending: PendingValues;
  } | null>(null);
  const { addKpiValue } = useKpiData();
  const { updateKpiValue } = useKpiMutations();
  const { profile } = useAuth();
  const { toast } = useToast();

  const submit = async (values: PendingValues) => {
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
      toast({
        title: 'Erro ao substituir valor',
        description: (err as { message?: string } | null)?.message ?? 'Erro desconhecido',
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
            formId={FORM_ID}
            onValidSubmit={submit}
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
