/**
 * KrContextCard - Card read-only de contexto do KR
 * 
 * Exibe informações contextuais de um KR durante o wizard,
 * incluindo objetivo, progresso, status e owner.
 * 
 * Usa componentes canônicos: OkrStatusBadge + OkrProgressBar
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OkrStatusBadge } from '@/modules/okrs/components/OkrStatusBadge';
import { OkrProgressBar } from '@/modules/okrs/components/OkrProgressBar';
import { 
  Target, 
  Calendar,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
            <OkrProgressBar
              baseline={baseline}
              current={currentValue}
              target={target}
              direction={direction}
              status={status}
              unit={unit}
              size="sm"
              showLabels={false}
              className="mt-2"
            />
          </div>
          <OkrStatusBadge status={status} type="kr" className="flex-shrink-0" />
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
        <OkrStatusBadge status={status} type="kr" className="flex-shrink-0" />
      </div>

      {/* Progress - using canonical OkrProgressBar */}
      <OkrProgressBar
        baseline={baseline}
        current={currentValue}
        target={target}
        direction={direction}
        status={status}
        unit={unit}
        size="md"
      />

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
