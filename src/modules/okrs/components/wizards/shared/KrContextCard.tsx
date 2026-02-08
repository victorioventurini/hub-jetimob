/**
 * KrContextCard - Card read-only de contexto do KR
 * 
 * Exibe informações contextuais de um KR durante o wizard,
 * incluindo objetivo, progresso, status e owner.
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Equal,
  Calendar,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RAG_STATUS_COLORS } from '@/lib/colors';

// ============================================================
// TYPES
// ============================================================

export interface KrContextCardProps {
  title: string;
  objectiveTitle: string;
  baseline: number;
  currentValue: number;
  target: number;
  unit?: string;
  direction: 'up' | 'down' | 'maintain';
  status: 'green' | 'yellow' | 'red' | 'not_started';
  progress: number;
  lastCheckinAt?: string | null;
  daysSinceCheckin?: number;
  ownerName?: string | null;
  ownerPhoto?: string | null;
  teamName?: string;
  className?: string;
  compact?: boolean;
}

// ============================================================
// HELPERS
// ============================================================

const STATUS_CONFIG = {
  green: { label: 'No caminho', variant: 'default' as const, className: RAG_STATUS_COLORS.green.badge },
  yellow: { label: 'Em risco', variant: 'default' as const, className: RAG_STATUS_COLORS.yellow.badge },
  red: { label: 'Em perigo', variant: 'destructive' as const, className: RAG_STATUS_COLORS.red.badge },
  not_started: { label: 'Não iniciado', variant: 'secondary' as const, className: '' },
};

function formatValue(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined) return '—';
  if (unit === '%') return `${value}%`;
  if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR')}`;
  return value.toLocaleString('pt-BR') + (unit ? ` ${unit}` : '');
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ============================================================
// COMPONENT
// ============================================================

export function KrContextCard({
  title,
  objectiveTitle,
  baseline,
  currentValue,
  target,
  unit,
  direction,
  status,
  progress,
  lastCheckinAt,
  daysSinceCheckin,
  ownerName,
  ownerPhoto,
  teamName,
  className,
  compact = false,
}: KrContextCardProps) {
  const statusConfig = STATUS_CONFIG[status];
  const DirectionIcon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Equal;

  if (compact) {
    return (
      <div className={cn("rounded-lg border bg-card p-3", className)}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{title}</h4>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {objectiveTitle}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {/* Barra visual limitada a 100% */}
              <Progress value={Math.min(100, progress)} className="h-1.5 flex-1" />
              <span className={cn("text-xs font-medium", progress > 100 && "text-status-green")}>
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <Badge 
            variant={statusConfig.variant}
            className={cn("flex-shrink-0", statusConfig.className)}
          >
            {statusConfig.label}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10 flex-shrink-0">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {objectiveTitle}
          </p>
          {teamName && (
            <p className="text-xs text-muted-foreground mt-1">
              {teamName}
            </p>
          )}
        </div>
        <Badge 
          variant={statusConfig.variant}
          className={cn("flex-shrink-0", statusConfig.className)}
        >
          {statusConfig.label}
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className={cn("font-medium", progress > 100 && "text-status-green")}>
            {Math.round(progress)}%
            {progress > 100 && ' 🚀'}
          </span>
        </div>
        {/* Barra visual limitada a 100% */}
        <Progress value={Math.min(100, progress)} className="h-2" />
        
        {/* Values */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>Base:</span>
            <span className="font-medium text-foreground">
              {formatValue(baseline, unit)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <DirectionIcon className="h-3 w-3" />
            <span>Meta:</span>
            <span className="font-medium text-foreground">
              {formatValue(target, unit)}
            </span>
          </div>
        </div>
        
        {/* Current value highlight */}
        <div className="flex items-center justify-center py-2 rounded-md bg-muted/50">
          <span className="text-xs text-muted-foreground mr-2">Atual:</span>
          <span className="text-lg font-bold text-primary">
            {formatValue(currentValue, unit)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        {ownerName && (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={ownerPhoto || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(ownerName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{ownerName}</span>
          </div>
        )}
        
        {!ownerName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Sem responsável</span>
          </div>
        )}
        
        {lastCheckinAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(lastCheckinAt), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
        )}
        
        {!lastCheckinAt && daysSinceCheckin !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <Calendar className="h-3 w-3" />
            <span>Nunca atualizado</span>
          </div>
        )}
      </div>
    </div>
  );
}
