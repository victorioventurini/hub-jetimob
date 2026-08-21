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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Copy, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { CreatedBuApiKey } from '../types';

interface ApiKeyRevealDialogProps {
  apiKey: CreatedBuApiKey | null;
  onClose: () => void;
}

export function ApiKeyRevealDialog({ apiKey, onClose }: ApiKeyRevealDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey.api_key);
    setCopied(true);
    toast.success('Chave copiada');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={!!apiKey} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Chave criada</DialogTitle>
          <DialogDescription>
            Copie a chave agora — ela não pode ser exibida novamente.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            Guarde a chave em um cofre de senhas. Depois de fechar esta janela apenas o
            prefixo ficará visível no Hub.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg bg-muted p-3 font-mono text-sm break-all">
          {apiKey?.api_key}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiada' : 'Copiar chave'}
          </Button>
          <Button onClick={onClose}>Já guardei a chave</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
