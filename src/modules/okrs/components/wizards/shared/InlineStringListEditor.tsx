/**
 * InlineStringListEditor - Lista dinâmica de strings com add/remove inline.
 *
 * SSOT extraído do `MbrPreNextStepsStep` para permitir reaproveitamento na
 * summary do MBR-pré (e qualquer outro rito que precise editar listas
 * simples de strings: itens priorizados, dependências cross-team, etc.).
 *
 * Mantém a UX visual original (numeração, bullet, ícone Trash2 + input + Plus).
 */

import { memo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InlineStringListEditorProps {
  label?: React.ReactNode;
  items: string[];
  onItemsChange: (items: string[]) => void;
  placeholder?: string;
  /** 'numbered' shows "1.", "2."; 'bullet' shows "•". Default 'numbered'. */
  marker?: 'numbered' | 'bullet';
  className?: string;
  emptyHint?: string;
}

export const InlineStringListEditor = memo(function InlineStringListEditor({
  label,
  items,
  onItemsChange,
  placeholder = 'Adicionar item...',
  marker = 'numbered',
  className,
  emptyHint,
}: InlineStringListEditorProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onItemsChange([...items, trimmed]);
    setDraft('');
  };

  const remove = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-3', className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}

      {items.length === 0 && emptyHint && (
        <p className="text-xs text-muted-foreground italic">{emptyHint}</p>
      )}

      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-5 shrink-0">
            {marker === 'numbered' ? `${i + 1}.` : '•'}
          </span>
          <span className="text-sm flex-1 break-words">{item}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => remove(i)}
            aria-label="Remover item"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="text-sm"
        />
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={add}
          disabled={!draft.trim()}
          aria-label="Adicionar"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
