import { useState, useEffect } from 'react';
import { ChevronRight, CalendarIcon, Trash2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ProjectMilestone, MilestoneStatus } from '../types';
import { MilestoneStatusSelect } from './MilestoneStatusSelect';

interface MilestoneListProps {
  milestones: ProjectMilestone[];
  projectId: string;
  onStatusChange?: (milestoneId: string, status: MilestoneStatus) => void;
  onUpdate?: (milestoneId: string, updates: { start_date?: string; due_date?: string | null; owner_id?: string; notes?: string | null }) => void;
  onDelete?: (milestoneId: string) => void;
  /** @deprecated KR-link UI removida ao nível de milestone (v1.7). Mantida na assinatura para compat. */
  canEditKrLinks?: boolean;
  canEdit?: boolean;
  compact?: boolean;
  /** Map of owner_id → { display_name, photo_url } for displaying avatars */
  ownerProfiles?: Record<string, { display_name: string | null; photo_url: string | null }>;
}

/**
 * Editor de observações com salvar manual (sem auto-save).
 * Padrão v1.7: estado local + Salvar/Cancelar; isDirty calculado vs valor persistido.
 */
function MilestoneNotesEditor({
  milestoneId,
  initialNotes,
  onSave,
}: {
  milestoneId: string;
  initialNotes: string | null;
  onSave: (notes: string | null) => void;
}) {
  const persisted = initialNotes ?? '';
  const [draft, setDraft] = useState(persisted);

  // Resync quando o valor remoto muda (ex.: outra sessão atualizou) ou ao trocar de milestone.
  useEffect(() => {
    setDraft(persisted);
  }, [milestoneId, persisted]);

  const isDirty = draft !== persisted;

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Observações, bloqueios, contexto..."
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        className="text-xs min-h-[48px]"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={!isDirty}
          onClick={() => setDraft(persisted)}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          disabled={!isDirty}
          onClick={() => onSave(draft.trim() ? draft : null)}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}

export function MilestoneList({
  milestones, onStatusChange, onUpdate, onDelete,
  canEdit, compact, ownerProfiles,
}: MilestoneListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (milestones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">Nenhum milestone cadastrado.</p>
    );
  }

  const sorted = milestones
    .filter((m) => !m.deleted_at)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || (a.created_at ?? '').localeCompare(b.created_at ?? ''));

  return (
    <ul className="space-y-1">
      {sorted.map((m) => {
        const isExpanded = expandedId === m.id;
        const ownerProfile = m.owner_id ? ownerProfiles?.[m.owner_id] : null;
        const isOverdue = m.due_date && m.status !== 'done' && isPast(parseISO(m.due_date));

        return (
          <li key={m.id}>
            <div
              className={cn(
                'flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors',
                compact && 'py-1',
              )}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')} />
              </button>

              <MilestoneStatusSelect
                value={m.status}
                onValueChange={(status) => onStatusChange?.(m.id, status)}
                disabled={!onStatusChange}
              />

              <span className={cn(
                'text-sm flex-1 truncate',
                m.status === 'done' && 'line-through text-muted-foreground',
              )}>
                {m.name}
              </span>

              {m.notes && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {m.notes}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Owner avatar */}
              {ownerProfile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage src={ownerProfile.photo_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">
                        {(ownerProfile.display_name ?? '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {ownerProfile.display_name ?? 'Responsável'}
                  </TooltipContent>
                </Tooltip>
              )}

              {m.due_date && (
                <span className={cn(
                  'text-xs shrink-0',
                  isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground',
                )}>
                  {format(parseISO(m.due_date), "dd MMM", { locale: ptBR })}
                </span>
              )}
            </div>

            {isExpanded && (
              <div className="ml-8 pl-2 border-l border-border space-y-3 py-2">
                {/* Inline editing for start_date, due_date and owner */}
                {canEdit && onUpdate && (() => {
                  const dateOrderInvalid = !!m.start_date && !!m.due_date && m.start_date > m.due_date;
                  return (
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap items-center">
                        {/* Start date inline edit */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                'h-7 text-xs justify-start',
                                dateOrderInvalid && 'border-destructive/50 text-destructive',
                              )}
                            >
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {m.start_date
                                ? `Início: ${format(parseISO(m.start_date), "dd MMM yyyy", { locale: ptBR })}`
                                : 'Definir início'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={m.start_date ? parseISO(m.start_date) : undefined}
                              onSelect={(date) => {
                                if (!date) return;
                                onUpdate(m.id, {
                                  start_date: format(date, 'yyyy-MM-dd'),
                                });
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>

                        {/* Due date inline edit */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                'h-7 text-xs justify-start',
                                !m.due_date && 'text-muted-foreground',
                                isOverdue && 'border-destructive/50 text-destructive',
                                dateOrderInvalid && 'border-destructive/50 text-destructive',
                              )}
                            >
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {m.due_date
                                ? `Prazo: ${format(parseISO(m.due_date), "dd MMM yyyy", { locale: ptBR })}`
                                : 'Definir prazo'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={m.due_date ? parseISO(m.due_date) : undefined}
                              onSelect={(date) => {
                                onUpdate(m.id, {
                                  due_date: date ? format(date, 'yyyy-MM-dd') : null,
                                });
                              }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>

                        {/* Owner inline edit — obrigatório */}
                        <div className="min-w-[180px]">
                          <BuUserSelect
                            value={m.owner_id}
                            onValueChange={(v) => {
                              // Defesa: ignorar tentativas de limpar (allowNone={false} já bloqueia).
                              if (v) onUpdate(m.id, { owner_id: v });
                            }}
                            placeholder="Responsável *"
                            allowNone={false}
                          />
                        </div>

                        {/* Delete button */}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => onDelete(m.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {dateOrderInvalid && (
                        <p className="text-xs text-destructive">
                          A data de início deve ser anterior ou igual à data de fim.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Notes — salvar manual (sem auto-save) */}
                {canEdit && onUpdate && (
                  <MilestoneNotesEditor
                    milestoneId={m.id}
                    initialNotes={m.notes}
                    onSave={(notes) => onUpdate(m.id, { notes })}
                  />
                )}

                {/* Notes read-only */}
                {!canEdit && m.notes && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{m.notes}</p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
