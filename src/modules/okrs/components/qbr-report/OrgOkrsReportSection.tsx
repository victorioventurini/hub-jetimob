/**
 * OrgOkrsReportSection
 *
 * Standalone card showing org-level OKRs with progress and status,
 * reused in the QBR Executive Report page.
 */

import { useState } from 'react';
import { Target, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { OkrProgressBar } from '@/modules/okrs/components/OkrProgressBar';
import { OkrStatusBadge } from '@/modules/okrs/components/OkrStatusBadge';
import { TeamKrsToggle } from '@/modules/okrs/components/wizards/shared/TeamKrsToggle';
import { useAllOrgObjectivesView } from '@/modules/okrs/hooks/queries';
import { SkeletonList } from '@/components/ui/loading-state';

const AGG_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  on_track: { label: 'No ritmo', className: 'bg-status-green-muted text-status-green' },
  at_risk: { label: 'Em risco', className: 'bg-status-amber-muted text-status-amber' },
  off_track: { label: 'Fora do ritmo', className: 'bg-status-red-muted text-status-red' },
};

export function OrgOkrsReportSection({ cycleId }: { cycleId: string | null }) {
  const [showTeamKrs, setShowTeamKrs] = useState(true);

  const { data: orgObjectives, isLoading } = useAllOrgObjectivesView(undefined, cycleId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Como chegamos aqui — OKRs da empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={3} variant="compact" />
        </CardContent>
      </Card>
    );
  }

  const objectives = orgObjectives ?? [];
  if (objectives.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Como chegamos aqui — OKRs da empresa ({objectives.length})
          </CardTitle>
          <TeamKrsToggle visible={showTeamKrs} onToggle={() => setShowTeamKrs((v) => !v)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Progresso real dos OKRs organizacionais do ciclo avaliado.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {objectives.map((obj) => (
          <Collapsible key={obj.id} defaultOpen={false}>
            <CollapsibleTrigger className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/30 transition-colors text-left">
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform [[data-state=closed]_&]:rotate-[-90deg]" />
              <span className="font-medium truncate flex-1 min-w-0">{obj.title}</span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] shrink-0',
                  AGG_STATUS_CONFIG[obj.aggregatedStatus]?.className,
                )}
              >
                {AGG_STATUS_CONFIG[obj.aggregatedStatus]?.label || obj.aggregatedStatus}
              </Badge>
              <span className="text-xs text-muted-foreground shrink-0">
                {obj.aggregatedProgress.toFixed(0)}%
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-2 pt-1">
              {obj.orgKrs.map((orgKr) => (
                <div key={orgKr.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <OkrStatusBadge status={orgKr.status} type="kr" className="shrink-0" />
                    <span className="text-xs truncate flex-1">{orgKr.title}</span>
                  </div>
                  <OkrProgressBar
                    baseline={orgKr.baseline}
                    current={orgKr.current_value}
                    target={orgKr.target}
                    direction={orgKr.direction}
                    status={orgKr.status}
                    unit={orgKr.unit ?? undefined}
                    size="sm"
                  />
                  {showTeamKrs &&
                    (orgKr.linkedTeamKrs.length > 0 ? (
                      <div className="pl-3 space-y-0.5 border-l-2 border-primary/20">
                        {orgKr.linkedTeamKrs.map((tkr) => (
                          <div key={tkr.id} className="flex items-center gap-2 text-xs">
                            <OkrStatusBadge
                              status={tkr.status}
                              type="kr"
                              className="shrink-0 scale-75"
                            />
                            <span className="text-muted-foreground truncate">{tkr.team_name}</span>
                            <span className="truncate flex-1">{tkr.title}</span>
                            <span className="text-muted-foreground shrink-0">
                              {tkr.progress.toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic pl-3">
                        Sem contribuição neste quarter
                      </p>
                    ))}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
