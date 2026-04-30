import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { useKpiData } from '../hooks';
import { useAuth } from '@/hooks/useAuth';
import type { KpiFrequencyValue } from '../types';
import { KpiValueEntryForm } from './shared';

/**
 * AddKpiValueDialog — Modal canônico para registrar valor de KPI.
 *
 * O miolo do formulário (Valor / Data / Tipo do input / Confidence /
 * Observações) está em `KpiValueEntryForm` (SSOT compartilhado com os ritos).
 * Não duplicar campos aqui — estender o SSOT se necessário.
 */
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

const FORM_ID = 'add-kpi-value-form';

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

  return (
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
          onValidSubmit={async (values) => {
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
            } finally {
              setIsSubmitting(false);
            }
          }}
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
  );
}
