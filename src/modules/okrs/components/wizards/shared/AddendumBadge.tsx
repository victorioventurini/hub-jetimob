/**
 * AddendumBadge - Inline badge + expandable content for addendums in downstream rituals
 * 
 * Used in QbrCLevelSystemReadStep, QbrMeetingOkrReviewStep, MbrTeamOkrsDetailStep.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, MessageSquarePlus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Addendum {
  text: string;
  created_at: string;
  created_by: string;
}

interface AddendumBadgeProps {
  addendums: Addendum[];
  /** If true, shows only the badge without expand (for tight spaces) */
  badgeOnly?: boolean;
  className?: string;
}

export function AddendumBadge({ addendums, badgeOnly = false, className }: AddendumBadgeProps) {
  const [open, setOpen] = useState(false);

  if (!addendums || addendums.length === 0) return null;

  if (badgeOnly) {
    return (
      <Badge variant="outline" className={cn('text-[10px] text-status-amber border-status-amber/30 gap-0.5', className)}>
        <MessageSquarePlus className="h-2.5 w-2.5" />
        Adendo
      </Badge>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-status-amber hover:underline">
          <MessageSquarePlus className="h-3 w-3" />
          <span>📝 {addendums.length} adendo{addendums.length > 1 ? 's' : ''} enviado{addendums.length > 1 ? 's' : ''}</span>
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2">
          {addendums.map((a, i) => (
            <Card key={i} className="border-status-amber/30 bg-status-amber-muted/10">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-status-amber border-status-amber/30">
                    Atualização posterior ao envio
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {format(new Date(a.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs whitespace-pre-wrap">{a.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
