import { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatValueWithUnit } from '@/shared/constants/units';
import { TeamKrListItem } from './TeamKrListItem';
import type { OrgKrWithTeamKrs } from '../../hooks';
import { RAG_STATUS_COLORS } from '@/lib/colors';

interface OrgKrExpandableCardProps {
  orgKr: OrgKrWithTeamKrs;
}

const statusLabels = {
  green: 'On Track',
  yellow: 'Atenção',
  red: 'Em Risco',
  not_started: 'Não Iniciado',
};

const trendIcons = {
  up: TrendingUp,
  stable: Minus,
  down: TrendingDown,
};

const trendColors = {
  up: 'text-status-green',
  stable: 'text-muted-foreground',
  down: 'text-status-red',
};

export function OrgKrExpandableCard({ orgKr }: OrgKrExpandableCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const TrendIcon = trendIcons[orgKr.trend];
  const linkedCount = orgKr.linkedTeamKrs.length;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="font-medium leading-tight">{orgKr.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      RAG_STATUS_COLORS[orgKr.status]?.badge,
                      RAG_STATUS_COLORS[orgKr.status]?.border
                    )}>
                      {statusLabels[orgKr.status]}
                    </Badge>
                    <TrendIcon className={`w-4 h-4 ${trendColors[orgKr.trend]}`} />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">
                        {formatValueWithUnit(orgKr.current_value, orgKr.unit)} / {formatValueWithUnit(orgKr.target, orgKr.unit)}
                      </span>
                      <span className="font-medium">{Math.round(orgKr.progress)}%</span>
                    </div>
                    <Progress value={orgKr.progress} className="h-2" />
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{linkedCount} OKR{linkedCount !== 1 ? 's' : ''} de time{linkedCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="border-t pt-4 ml-7">
              {linkedCount === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum OKR de time vinculado a este KR organizacional
                </p>
              ) : (
                <div className="space-y-2">
                  {orgKr.linkedTeamKrs.map((teamKr) => (
                    <TeamKrListItem key={teamKr.id} teamKr={teamKr} />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
