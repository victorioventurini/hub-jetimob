/**
 * Dialog para salvar um link com filtros
 */

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
import { Checkbox } from '@/components/ui/checkbox';
import { Link as LinkIcon } from 'lucide-react';

interface SaveLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  onSave: (data: { label: string; path: string; is_favorite: boolean }) => Promise<void>;
  isSaving?: boolean;
}

export function SaveLinkDialog({
  open,
  onOpenChange,
  currentPath,
  onSave,
  isSaving = false,
}: SaveLinkDialogProps) {
  const [label, setLabel] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError('Nome é obrigatório');
      return;
    }

    if (trimmedLabel.length > 50) {
      setError('Nome deve ter no máximo 50 caracteres');
      return;
    }

    try {
      await onSave({
        label: trimmedLabel,
        path: currentPath,
        is_favorite: isFavorite,
      });
      handleClose();
    } catch (err) {
      console.error('Error saving link:', err);
      setError('Erro ao salvar link');
    }
  };

  const handleClose = () => {
    setLabel('');
    setIsFavorite(false);
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Salvar Link</DialogTitle>
            <DialogDescription>
              Salve esta visualização com os filtros atuais para acesso rápido.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="link-label">Nome do link</Label>
              <Input
                id="link-label"
                placeholder="Ex: OKRs do meu time"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={50}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="flex items-center gap-2 rounded-md border p-3 bg-muted/50">
              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                {currentPath}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-favorite"
                checked={isFavorite}
                onCheckedChange={(checked) => setIsFavorite(checked === true)}
              />
              <Label
                htmlFor="is-favorite"
                className="text-sm font-normal cursor-pointer"
              >
                Definir como link padrão do módulo
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
