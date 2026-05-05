/**
 * MbrAgendaCuration — Pauta consolidada do MBR (Step 1).
 *
 * Consolida sugestões dos Pré-MBR + temas curados pela IA + adições manuais
 * do líder do rito. Suporta drag-and-drop (reordenar) e toggle "incluir na
 * pauta". Persiste em `MbrPanoramaCuration.agenda`.
 */
import { memo, useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ListChecks, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { MbrPanoramaAgendaItem } from '@/modules/okrs/types/wizard';

export interface MbrAgendaCurationProps {
  agenda: MbrPanoramaAgendaItem[];
  onChange: (next: MbrPanoramaAgendaItem[]) => void;
  teamNamesById?: Record<string, string>;
}

const SOURCE_BADGE: Record<MbrPanoramaAgendaItem['source'], { label: string; className: string; icon: typeof Sparkles }> = {
  'pre-mbr': { label: 'Pré-MBR', className: 'bg-status-blue-muted text-status-blue', icon: Users },
  ai: { label: 'IA', className: 'bg-primary/10 text-primary', icon: Sparkles },
  manual: { label: 'Manual', className: 'bg-muted text-muted-foreground', icon: ListChecks },
};

function SortableRow({
  item,
  teamNamesById,
  onToggle,
  onRemove,
}: {
  item: MbrPanoramaAgendaItem;
  teamNamesById?: Record<string, string>;
  onToggle: (id: string, included: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const badge = SOURCE_BADGE[item.source];
  const BadgeIcon = badge.icon;
  const teamName = item.teamId ? teamNamesById?.[item.teamId] : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-2 rounded-md border bg-card px-2 py-2',
        !item.included && 'opacity-60',
      )}
    >
      <button
        type="button"
        className="mt-1 cursor-grab text-muted-foreground hover:text-foreground touch-none"
        aria-label="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium break-words', !item.included && 'line-through')}>
          {item.title}
        </p>
        {item.detail && (
          <p className="text-xs text-muted-foreground mt-0.5 break-words">{item.detail}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge className={cn('text-[10px] border-0 gap-1', badge.className)}>
            <BadgeIcon className="h-3 w-3" />
            {badge.label}
          </Badge>
          {teamName && (
            <Badge variant="outline" className="text-[10px]">
              {teamName}
            </Badge>
          )}
          {item.category && (
            <Badge variant="outline" className="text-[10px]">
              {item.category}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Switch
            checked={item.included}
            onCheckedChange={(checked) => onToggle(item.id, checked)}
            aria-label="Incluir na pauta"
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(item.id)}
          aria-label="Remover item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function MbrAgendaCurationImpl({ agenda, onChange, teamNamesById }: MbrAgendaCurationProps) {
  const [newItemTitle, setNewItemTitle] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const includedCount = agenda.filter((i) => i.included).length;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = agenda.findIndex((i) => i.id === active.id);
      const newIndex = agenda.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(agenda, oldIndex, newIndex).map((i, idx) => ({
        ...i,
        order: idx,
      }));
      onChange(reordered);
    },
    [agenda, onChange],
  );

  const handleToggle = useCallback(
    (id: string, included: boolean) => {
      onChange(agenda.map((i) => (i.id === id ? { ...i, included } : i)));
    },
    [agenda, onChange],
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(agenda.filter((i) => i.id !== id).map((i, idx) => ({ ...i, order: idx })));
    },
    [agenda, onChange],
  );

  const handleAddManual = useCallback(() => {
    const title = newItemTitle.trim();
    if (!title) return;
    const next: MbrPanoramaAgendaItem = {
      id: `mbr-agenda-manual-${Date.now()}`,
      title,
      source: 'manual',
      included: true,
      order: agenda.length,
    };
    onChange([...agenda, next]);
    setNewItemTitle('');
  }, [agenda, newItemTitle, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
          <ListChecks className="h-3 w-3" /> Pauta do MBR
        </Label>
        <span className="text-[11px] text-muted-foreground">
          {includedCount} incluído{includedCount === 1 ? '' : 's'} · {agenda.length} total
        </span>
      </div>

      {agenda.length === 0 ? (
        <p className="text-xs text-muted-foreground italic rounded-md border border-dashed px-3 py-3">
          Nenhum tema na pauta ainda. As sugestões dos Pré-MBR e da curadoria IA aparecerão aqui automaticamente — adicione manualmente abaixo se quiser começar do zero.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={agenda.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {agenda.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  teamNamesById={teamNamesById}
                  onToggle={handleToggle}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Input
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddManual();
            }
          }}
          placeholder="Adicionar tema manualmente…"
          className="h-9 text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddManual}
          disabled={!newItemTitle.trim()}
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

export const MbrAgendaCuration = memo(MbrAgendaCurationImpl);
