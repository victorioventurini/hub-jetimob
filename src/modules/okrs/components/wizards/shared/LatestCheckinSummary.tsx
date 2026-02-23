/**
 * LatestCheckinSummary - Card compacto com dados qualitativos do último check-in
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertTriangle, ChevronDown, MessageSquare, User } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { LatestCheckinData } from '@/modules/okrs/hooks/useTeamPendingKrs';

// ============================================================
// TYPES
// ============================================================

export interface LatestCheckinSummaryProps {
  checkin: LatestCheckinData;
  className?: string;
}

// ============================================================
// HELPERS
// ============================================================

const CONFIDENCE_CONFIG = {
  high: { label: 'Alta', className: 'bg-status-green-muted text-status-green-muted-foreground' },
  medium: { label: 'Média', className: 'bg-status-yellow-muted text-status-yellow-muted-foreground' },
  low: { label: 'Baixa', className: 'bg-status-red-muted text-status-red-muted-foreground' },
} as const;

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// ============================================================
// COMPONENT
// ============================================================

export function LatestCheckinSummary({ checkin, className }: LatestCheckinSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const conf = CONFIDENCE_CONFIG[checkin.confidence] ?? CONFIDENCE_CONFIG.medium;
  const formattedDate = formatDistanceToNow(parseISO(checkin.date), { addSuffix: true, locale: ptBR });

  const hasLongComment = (checkin.comments?.length ?? 0) > 120;
  const displayComment = hasLongComment && !expanded
    ? checkin.comments!.slice(0, 120) + '…'
    : checkin.comments;

  return (
    <div className={cn("rounded-md border border-border/60 bg-muted/30 p-3 space-y-2", className)}>
      {/* Header: author + date + confidence */}
      <div className="flex items-center gap-2 flex-wrap">
        <Avatar className="h-5 w-5">
          {checkin.author_photo && <AvatarImage src={checkin.author_photo} />}
          <AvatarFallback className="text-[10px]">
            {getInitials(checkin.author_name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium truncate max-w-[120px]">
          {checkin.author_name || 'Colaborador'}
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
        <Badge variant="secondary" className={cn("text-xs h-5 ml-auto", conf.className)}>
          Confiança: {conf.label}
        </Badge>
      </div>

      {/* Comment */}
      {checkin.comments && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="flex items-start gap-1.5 text-sm text-foreground/80">
            <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <span className="whitespace-pre-line">{displayComment}</span>
          </div>
          {hasLongComment && (
            <CollapsibleTrigger className="text-xs text-primary hover:underline mt-1 flex items-center gap-0.5">
              {expanded ? 'Ver menos' : 'Ver mais'}
              <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
            </CollapsibleTrigger>
          )}
          <CollapsibleContent />
        </Collapsible>
      )}

      {/* Blockers */}
      {checkin.blockers && (
        <div className="flex items-start gap-1.5 text-sm">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-status-red" />
          <span className="text-status-red">{checkin.blockers}</span>
        </div>
      )}
    </div>
  );
}
