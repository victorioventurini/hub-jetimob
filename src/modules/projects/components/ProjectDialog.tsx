import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import type { ProjectStatus } from '../types';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  status: z.enum(['planned', 'in_progress', 'paused', 'done', 'cancelled']).default('planned'),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  external_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
  isSubmitting?: boolean;
  title?: string;
}

export function ProjectDialog({
  open, onOpenChange, onSubmit, defaultValues, isSubmitting, title = 'Novo projeto',
}: ProjectDialogProps) {
  const defaults: FormValues = {
    name: '',
    description: '',
    status: 'planned',
    start_date: '',
    due_date: '',
    external_url: '',
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
    onSubmit(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...form.register('name')} placeholder="Nome do projeto" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" {...form.register('description')} placeholder="Descrição breve" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Início</Label>
              <Input id="start_date" type="date" {...form.register('start_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Prazo</Label>
              <Input id="due_date" type="date" {...form.register('due_date')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as ProjectStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planejado</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="external_url">Link externo</Label>
            <Input id="external_url" {...form.register('external_url')} placeholder="https://..." />
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
