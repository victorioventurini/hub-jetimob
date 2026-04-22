import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell } from 'lucide-react';
import {
  channelIcons,
  moduleNames,
  type EventFormData,
  type NotificationChannelLite,
} from './constants';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEvent: string | null;
  eventForm: EventFormData;
  setEventForm: (form: EventFormData) => void;
  channels: NotificationChannelLite[];
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function EventFormDialog({
  open,
  onOpenChange,
  editingEvent,
  eventForm,
  setEventForm,
  channels,
  onSubmit,
  isSubmitting,
}: EventFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
          <DialogDescription>Configure os detalhes do evento de notificação</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="module.action.type"
                value={eventForm.slug}
                onChange={(e) => setEventForm({ ...eventForm, slug: e.target.value })}
                disabled={!!editingEvent}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module">Módulo</Label>
              <Select
                value={eventForm.module}
                onValueChange={(v) => setEventForm({ ...eventForm, module: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(moduleNames).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Nome do evento"
              value={eventForm.name}
              onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição do evento"
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Audiência</Label>
              <Select
                value={eventForm.audience}
                onValueChange={(v: 'internal' | 'external' | 'both') =>
                  setEventForm({ ...eventForm, audience: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Interno</SelectItem>
                  <SelectItem value="external">Externo</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severidade</Label>
              <Select
                value={eventForm.severity}
                onValueChange={(v: 'info' | 'warning' | 'critical') =>
                  setEventForm({ ...eventForm, severity: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Canais Padrão</Label>
            <div className="flex flex-wrap gap-2">
              {channels.map((channel) => {
                const Icon = channelIcons[channel.slug] || Bell;
                const isSelected = eventForm.default_channels.includes(channel.slug);
                return (
                  <Button
                    key={channel.slug}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newChannels = isSelected
                        ? eventForm.default_channels.filter((c) => c !== channel.slug)
                        : [...eventForm.default_channels, channel.slug];
                      setEventForm({ ...eventForm, default_channels: newChannels });
                    }}
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {channel.name}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_mandatory"
              checked={eventForm.is_mandatory}
              onCheckedChange={(c) => setEventForm({ ...eventForm, is_mandatory: c })}
            />
            <Label htmlFor="is_mandatory">
              Evento Obrigatório (não pode ser desativado pelo usuário)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !eventForm.slug || !eventForm.name}
          >
            {editingEvent ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
