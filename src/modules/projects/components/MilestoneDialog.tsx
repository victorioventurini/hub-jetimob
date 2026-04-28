/**
 * MilestoneDialog — Modal canônico para criação (e futura edição) de milestones.
 *
 * Padrão: Dialog + react-hook-form + zod + useDialogFormReset (espelha ProjectDialog).
 * Campos obrigatórios: name, start_date, due_date, owner_id (profiles.id via BuUserSelect).
 * Campo opcional: notes.
 */

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { CharCountFeedback } from '@/components/shared/CharCountFeedback';
import { ENTITY_NAME_LIMITS } from '@/shared/constants/entityLimits';
import { DIALOG_SIZES } from '@/lib/dialog-sizes';
import {
  MilestoneScheduleContext,
  type ScheduleMilestone,
} from './MilestoneScheduleContext';

const schema = z.object({
  name: z.string()
    .min(1, 'Nome obrigatório')
    .max(ENTITY_NAME_LIMITS.MILESTONE_NAME, `Máximo de ${ENTITY_NAME_LIMITS.MILESTONE_NAME} caracteres`),
  start_date: z.string().min(1, 'Data de início obrigatória'),
  due_date: z.string().min(1, 'Data de prazo obrigatória'),
  owner_id: z.string().min(1, 'Responsável obrigatório'),
  notes: z.string().optional(),
}).refine((v) => !v.start_date || !v.due_date || v.start_date <= v.due_date, {
  message: 'A data de início deve ser anterior ou igual à data de fim.',
  path: ['due_date'],
});

type FormValues = z.infer<typeof schema>;

export interface MilestoneDialogSubmitValues {
  name: string;
  start_date: string;
  due_date: string;
  owner_id: string;
  notes: string | null;
}

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MilestoneDialogSubmitValues) => void;
  isSubmitting?: boolean;
  title?: string;
  defaultValues?: Partial<FormValues>;
  /** Milestones já cadastrados no projeto (para painel de contexto). */
  existingMilestones?: ScheduleMilestone[];
  /** Identifica o próprio milestone em modo edição (excluído de conflitos). */
  currentMilestoneId?: string;
  projectStartDate?: string | null;
  projectDueDate?: string | null;
}

export function MilestoneDialog({
  open, onOpenChange, onSubmit, isSubmitting,
  title = 'Novo milestone', defaultValues,
  existingMilestones, currentMilestoneId,
  projectStartDate, projectDueDate,
}: MilestoneDialogProps) {
  const defaults: FormValues = {
    name: '',
    start_date: '',
    due_date: '',
    owner_id: '',
    notes: '',
    ...defaultValues,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useDialogFormReset(open, () => {
    form.reset(defaults);
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit({
      name: values.name.trim(),
      start_date: values.start_date,
      due_date: values.due_date,
      owner_id: values.owner_id,
      notes: values.notes?.trim() ? values.notes.trim() : null,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${DIALOG_SIZES.lg} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {existingMilestones && existingMilestones.length > 0 && (
          <MilestoneScheduleContext
            milestones={existingMilestones}
            currentMilestoneId={currentMilestoneId}
            previewStart={form.watch('start_date')}
            previewDue={form.watch('due_date')}
            previewName={form.watch('name')}
            projectStartDate={projectStartDate}
            projectDueDate={projectDueDate}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="milestone-name">Nome *</Label>
            <Input
              id="milestone-name"
              {...form.register('name')}
              placeholder="Nome do milestone"
              maxLength={ENTITY_NAME_LIMITS.MILESTONE_NAME}
            />
            <CharCountFeedback value={form.watch('name') ?? ''} maxLength={ENTITY_NAME_LIMITS.MILESTONE_NAME} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-start">Início *</Label>
              <Input
                id="milestone-start"
                type="date"
                {...form.register('start_date')}
              />
              {form.formState.errors.start_date && (
                <p className="text-xs text-destructive">{form.formState.errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-due">Prazo *</Label>
              <Input
                id="milestone-due"
                type="date"
                {...form.register('due_date')}
              />
              {form.formState.errors.due_date && (
                <p className="text-xs text-destructive">{form.formState.errors.due_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Responsável *</Label>
            <Controller
              name="owner_id"
              control={form.control}
              render={({ field }) => (
                <BuUserSelect
                  value={field.value || undefined}
                  onValueChange={(v) => field.onChange(v ?? '')}
                  placeholder="Selecione o responsável"
                  allowNone={false}
                />
              )}
            />
            {form.formState.errors.owner_id && (
              <p className="text-xs text-destructive">{form.formState.errors.owner_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-notes">Observações</Label>
            <Textarea
              id="milestone-notes"
              {...form.register('notes')}
              placeholder="Observações, bloqueios, contexto..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
