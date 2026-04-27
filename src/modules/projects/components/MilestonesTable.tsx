/**
 * MilestonesTable — visualização tabular dos milestones (espelha padrão de TicketsTable).
 *
 * - Colunas: Status, Nome, Responsável, Início, Prazo, Observações, Ações.
 * - Status com edição inline (MilestoneStatusSelect) quando `onStatusChange` definido.
 * - Coluna Ações com DropdownMenu (Editar / Remover), gating row-aware via callbacks.
 * - React.memo no componente e nas linhas (canônico mem://standards/frontend-memoization-standard).
 * - Cliques nos itens do DropdownMenu usam stopPropagation para isolar do Portal
 *   (canônico mem://ui/portal-event-isolation-standard).
 */

import { memo, useMemo } from 'react';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, FileText, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ProjectMilestone, MilestoneStatus } from '../types';
import { MilestoneStatusSelect } from './MilestoneStatusSelect';

type OwnerProfile = { display_name: string | null; photo_url: string | null };

export interface MilestonesTableProps {
  milestones: ProjectMilestone[];
  ownerProfiles?: Record<string, OwnerProfile>;
  onStatusChange?: (milestoneId: string, status: MilestoneStatus) => void;
  /** Solicita abrir o modal de edição da milestone selecionada. */
  onEdit?: (milestone: ProjectMilestone) => void;
  /** Solicita confirmação de remoção da milestone selecionada. */
  onDelete?: (milestone: ProjectMilestone) => void;
  /** Gating row-aware: retorna true se o ator pode editar esta milestone. */
  canEditMilestone?: (milestone: ProjectMilestone) => boolean;
  /** Gating row-aware: retorna true se o ator pode remover esta milestone. */
  canDeleteMilestone?: (milestone: ProjectMilestone) => boolean;
}

interface MilestoneRowProps {
  milestone: ProjectMilestone;
  ownerProfile: OwnerProfile | null;
  onStatusChange?: (milestoneId: string, status: MilestoneStatus) => void;
  onEdit?: (milestone: ProjectMilestone) => void;
  onDelete?: (milestone: ProjectMilestone) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const MilestoneRow = memo(function MilestoneRow({
  milestone,
  ownerProfile,
  onStatusChange,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: MilestoneRowProps) {
  const isOverdue =
    !!milestone.due_date &&
    milestone.status !== 'done' &&
    isPast(parseISO(milestone.due_date));

  const showActionsMenu = (canEdit && !!onEdit) || (canDelete && !!onDelete);

  return (
    <TableRow className={cn(isOverdue && 'bg-status-red-muted/30')}>
      {/* Status */}
      <TableCell className="w-[140px]">
        <MilestoneStatusSelect
          value={milestone.status}
          onValueChange={(status) => onStatusChange?.(milestone.id, status)}
          disabled={!onStatusChange || !canEdit}
        />
      </TableCell>

      {/* Nome */}
      <TableCell>
        <span
          className={cn(
            'text-sm font-medium line-clamp-1',
            milestone.status === 'done' && 'line-through text-muted-foreground',
          )}
        >
          {milestone.name}
        </span>
      </TableCell>

      {/* Responsável */}
      <TableCell className="w-[200px]">
        {ownerProfile ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={ownerProfile.photo_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {(ownerProfile.display_name ?? '?').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm line-clamp-1">{ownerProfile.display_name ?? '—'}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Início */}
      <TableCell className="w-[120px]">
        {milestone.start_date ? (
          <span className="text-sm text-muted-foreground">
            {format(parseISO(milestone.start_date), "dd MMM yyyy", { locale: ptBR })}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Prazo */}
      <TableCell className="w-[120px]">
        {milestone.due_date ? (
          <span
            className={cn(
              'text-sm',
              isOverdue ? 'text-status-red font-medium' : 'text-muted-foreground',
            )}
          >
            {format(parseISO(milestone.due_date), "dd MMM yyyy", { locale: ptBR })}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Observações */}
      <TableCell className="w-[60px]">
        {milestone.notes ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap text-xs">
              {milestone.notes}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Ações */}
      <TableCell className="w-[60px] text-right">
        {showActionsMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Ações da milestone"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {canEdit && onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(milestone);
                  }}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Editar
                </DropdownMenuItem>
              )}
              {canEdit && canDelete && onEdit && onDelete && <DropdownMenuSeparator />}
              {canDelete && onDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(milestone);
                  }}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Remover
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
});

export const MilestonesTable = memo(function MilestonesTable({
  milestones,
  ownerProfiles,
  onStatusChange,
  onEdit,
  onDelete,
  canEditMilestone,
  canDeleteMilestone,
}: MilestonesTableProps) {
  const sorted = useMemo(
    () =>
      milestones
        .filter((m) => !m.deleted_at)
        .sort(
          (a, b) =>
            (a.due_date ?? '').localeCompare(b.due_date ?? '') ||
            (a.created_at ?? '').localeCompare(b.created_at ?? ''),
        ),
    [milestones],
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">Nenhum milestone cadastrado.</p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="w-[200px]">Responsável</TableHead>
            <TableHead className="w-[120px]">Início</TableHead>
            <TableHead className="w-[120px]">Prazo</TableHead>
            <TableHead className="w-[60px]">Obs.</TableHead>
            <TableHead className="w-[60px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((m) => {
            const ownerProfile = m.owner_id ? ownerProfiles?.[m.owner_id] ?? null : null;
            const canEdit = canEditMilestone ? canEditMilestone(m) : false;
            const canDelete = canDeleteMilestone ? canDeleteMilestone(m) : false;
            return (
              <MilestoneRow
                key={m.id}
                milestone={m}
                ownerProfile={ownerProfile}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});
