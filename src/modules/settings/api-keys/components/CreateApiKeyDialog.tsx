import { useState } from 'react';
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
import { ScopeSelector } from './ScopeSelector';
import { scopesFromLevels, type BuApiAccessLevel } from '../scopes';
import { useCreateBuApiKey } from '../hooks/useBuApiKeys';
import type { CreatedBuApiKey } from '../types';
import { toast } from 'sonner';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: CreatedBuApiKey) => void;
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateApiKeyDialogProps) {
  const [name, setName] = useState('');
  const [consumerSystem, setConsumerSystem] = useState('');
  const [description, setDescription] = useState('');
  const [rateLimit, setRateLimit] = useState('60');
  const [expiresAt, setExpiresAt] = useState('');
  const [levels, setLevels] = useState<Record<string, BuApiAccessLevel>>({});

  const createKey = useCreateBuApiKey();

  function reset() {
    setName('');
    setConsumerSystem('');
    setDescription('');
    setRateLimit('60');
    setExpiresAt('');
    setLevels({});
  }

  async function handleSubmit() {
    const scopes = scopesFromLevels(levels);
    if (!name.trim() || !consumerSystem.trim()) {
      toast.error('Informe o nome da chave e o sistema consumidor.');
      return;
    }
    if (!scopes.length) {
      toast.error('Libere ao menos um módulo para a chave.');
      return;
    }
    const parsedRate = Number(rateLimit);
    if (!Number.isInteger(parsedRate) || parsedRate < 1 || parsedRate > 6000) {
      toast.error('O limite por minuto deve ser um número entre 1 e 6000.');
      return;
    }

    const created = await createKey.mutateAsync({
      name: name.trim(),
      consumer_system: consumerSystem.trim(),
      description: description.trim() || undefined,
      scopes,
      rate_limit_per_minute: parsedRate,
      expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
    });

    reset();
    onOpenChange(false);
    onCreated(created);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova chave de API</DialogTitle>
          <DialogDescription>
            Defina o sistema consumidor e exatamente o que ele poderá acessar nesta BU.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">Nome da chave *</Label>
              <Input
                id="api-key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Integração BI"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key-consumer">Sistema consumidor *</Label>
              <Input
                id="api-key-consumer"
                value={consumerSystem}
                onChange={(e) => setConsumerSystem(e.target.value)}
                placeholder="Ex.: Metabase, n8n, ERP"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key-description">Descrição</Label>
            <Textarea
              id="api-key-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para que essa chave será usada?"
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="api-key-rate">Limite de chamadas por minuto</Label>
              <Input
                id="api-key-rate"
                type="number"
                min={1}
                max={6000}
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key-expires">Expira em (opcional)</Label>
              <Input
                id="api-key-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permissões por módulo *</Label>
            <ScopeSelector
              levels={levels}
              onChange={(moduleKey, level) =>
                setLevels((prev) => ({ ...prev, [moduleKey]: level }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createKey.isPending}>
            {createKey.isPending ? 'Gerando...' : 'Gerar chave'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
