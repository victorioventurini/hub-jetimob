import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Users, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OkrStatusBadge } from './OkrStatusBadge';
import { OkrProgressBar } from './OkrProgressBar';
import type { OkrStatus, OkrRagStatus, OkrDirection, OkrKrType } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

interface KeyResult {
  id: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  unit: string;
  status: OkrRagStatus;
  type?: OkrKrType;
}

interface OkrObjectiveCardProps {
  id: string;
  title: string;
  description?: string;
  status: OkrStatus;
  type: 'org' | 'team';
  teamName?: string;
  keyResults: KeyResult[];
  onEdit?: () => void;
  onDelete?: () => void;
  onAddKr?: () => void;
  isDeleting?: boolean;
}

const calculateProgress = (krs: KeyResult[]): number => {
  if (krs.length === 0) return 0;
  
  return krs.reduce((acc, kr) => {
    if (kr.direction === 'up') {
      if (kr.target === kr.baseline) return acc + (kr.current_value >= kr.target ? 100 : 0);
      return acc + Math.max(0, Math.min(100, ((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100));
    } else {
      if (kr.baseline === kr.target) return acc + (kr.current_value <= kr.target ? 100 : 0);
      return acc + Math.max(0, Math.min(100, ((kr.baseline - kr.current_value) / (kr.baseline - kr.target)) * 100));
    }
  }, 0) / krs.length;
};

export function OkrObjectiveCard({
  id,
  title,
  description,
  status,
  type,
  teamName,
  keyResults,
  onEdit,
  onDelete,
  onAddKr,
  isDeleting = false,
}: OkrObjectiveCardProps) {
  const avgProgress = calculateProgress(keyResults);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const greenCount = keyResults.filter(kr => kr.status === 'green').length;
  const yellowCount = keyResults.filter(kr => kr.status === 'yellow').length;
  const redCount = keyResults.filter(kr => kr.status === 'red').length;

  const getBorderColor = () => {
    if (redCount > 0) return 'border-l-red-500';
    if (yellowCount > 0) return 'border-l-yellow-500';
    if (greenCount > 0) return 'border-l-green-500';
    return 'border-l-muted';
  };

  const getProgressColor = () => {
    if (redCount > 0) return 'bg-red-500';
    if (yellowCount > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className={cn('transition-all border-l-4', getBorderColor())}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {type === 'org' ? (
                  <>
                    <Target className="w-3 h-3 mr-1" />
                    Organizacional
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3 mr-1" />
                    {teamName}
                  </>
                )}
              </Badge>
              <OkrStatusBadge status={status} type="objective" />
            </div>
            <CardTitle className="text-lg font-semibold line-clamp-2">
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {description}
              </p>
            )}
          </div>
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress summary */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">{avgProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', getProgressColor())}
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </div>

        {/* KR status summary */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-xs">
            {greenCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {greenCount}
              </span>
            )}
            {yellowCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                {yellowCount}
              </span>
            )}
            {redCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {redCount}
              </span>
            )}
            <span className="text-muted-foreground">
              {keyResults.length} KR{keyResults.length !== 1 ? 's' : ''}
            </span>
          </div>
          {onAddKr && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAddKr}>
              <Plus className="w-3 h-3 mr-1" />
              KR
            </Button>
          )}
        </div>

        {/* KR list - always visible */}
        {keyResults.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            {keyResults.map((kr, index) => (
              <div key={kr.id} className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-4 shrink-0 pt-0.5">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium leading-tight">{kr.title}</p>
                      <OkrStatusBadge status={kr.status} type="kr" />
                    </div>
                    <OkrProgressBar
                      baseline={kr.baseline}
                      current={kr.current_value}
                      target={kr.target}
                      direction={kr.direction}
                      status={kr.status}
                      unit={kr.unit}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {onDelete && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={() => {
            onDelete();
            setDeleteDialogOpen(false);
          }}
          title="Excluir Objetivo"
          description={`Tem certeza que deseja excluir o objetivo "${title}"? Esta ação não pode ser desfeita.`}
          isLoading={isDeleting}
        />
      )}
    </Card>
  );
}
