/**
 * MilestonesTable — visualização tabular dos milestones (espelha padrão de TicketsTable).
 *
 * - Colunas auto-ajustáveis ao conteúdo; coluna "Nome" ocupa o espaço restante.
 * - Status com edição inline (MilestoneStatusSelect) quando `onStatusChange` definido.
 * - Observações renderizadas em uma linha extra logo abaixo da principal, em fonte
 *   menor e exibindo o texto completo (sem truncar).
 * - Coluna Ações com DropdownMenu (Editar / Remover), gating row-aware via callbacks.
 * - React.memo no componente e nas linhas (canônico mem://standards/frontend-memoization-standard).
 * - Cliques nos itens do DropdownMenu usam stopPropagation para isolar do Portal
 *   (canônico mem://ui/portal-event-isolation-standard).
 */

import { memo, Fragment, useMemo } from 'react';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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

const TOTAL_COLUMNS = 6;

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
  const hasNotes = !!milestone.notes?.trim();

  return (
    <Fragment>
      <TableRow
        className={cn(
          isOverdue && 'bg-status-red-muted/30',
          hasNotes && 'border-b-0',
        )}
      >
        {/* Status */}
        <TableCell className="w-px whitespace-nowrap align-top">
          <MilestoneStatusSelect
            value={milestone.status}
            onValueChange={(status) => onStatusChange?.(milestone.id, status)}
            disabled={!onStatusChange || !canEdit}
          />
        </TableCell>

        {/* Nome */}
        <TableCell className="w-full align-top">
          <span
            className={cn(
              'text-sm font-medium',
              milestone.status === 'done' && 'line-through text-muted-foreground',
            )}
          >
            {milestone.name}
          </span>
        </TableCell>

        {/* Responsável */}
        <TableCell className="w-px whitespace-nowrap align-top">
          {ownerProfile ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={ownerProfile.photo_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {(ownerProfile.display_name ?? '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{ownerProfile.display_name ?? '—'}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </TableCell>

        {/* Início */}
        <TableCell className="w-px whitespace-nowrap align-top">
          {milestone.start_date ? (
            <span className="text-sm text-muted-foreground">
              {format(parseISO(milestone.start_date), 'dd MMM yyyy', { locale: ptBR })}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        {/* Prazo */}
        <TableCell className="w-px whitespace-nowrap align-top">
          {milestone.due_date ? (
            <span
              className={cn(
                'text-sm',
                isOverdue ? 'text-status-red font-medium' : 'text-muted-foreground',
              )}
            >
              {format(parseISO(milestone.due_date), 'dd MMM yyyy', { locale: ptBR })}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        {/* Ações */}
        <TableCell className="w-px whitespace-nowrap text-right align-top">
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

      {hasNotes && (
        <TableRow className={cn(isOverdue && 'bg-status-red-muted/30')}>
          <TableCell
            colSpan={TOTAL_COLUMNS}
            className="pt-0 pb-3 px-4 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed"
          >
            {milestone.notes}
          </TableCell>
        </TableRow>
      )}
    </Fragment>
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
            <TableHead className="w-px whitespace-nowrap">Status</TableHead>
            <TableHead className="w-full">Nome</TableHead>
            <TableHead className="w-px whitespace-nowrap">Responsável</TableHead>
            <TableHead className="w-px whitespace-nowrap">Início</TableHead>
            <TableHead className="w-px whitespace-nowrap">Prazo</TableHead>
            <TableHead className="w-px whitespace-nowrap text-right">Ações</TableHead>
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
