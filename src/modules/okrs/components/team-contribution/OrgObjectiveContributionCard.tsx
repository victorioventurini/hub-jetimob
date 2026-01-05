import { useState } from "react";
import { ChevronDown, ChevronRight, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { OrgKrContributionItem } from "./OrgKrContributionItem";
import type { OrgObjectiveContribution } from "../../hooks/useTeamContributionView";

interface OrgObjectiveContributionCardProps {
  contribution: OrgObjectiveContribution;
  onNavigateToObjective?: (id: string) => void;
}

const statusConfig = {
  on_track: { label: 'On Track', className: 'bg-green-500/10 text-green-700 border-green-200' },
  at_risk: { label: 'Em Risco', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  off_track: { label: 'Off Track', className: 'bg-red-500/10 text-red-700 border-red-200' },
};

export function OrgObjectiveContributionCard({ 
  contribution, 
  onNavigateToObjective 
}: OrgObjectiveContributionCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const status = statusConfig[contribution.status];

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span 
                    className="font-medium text-foreground hover:text-primary cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToObjective?.(contribution.id);
                    }}
                  >
                    {contribution.title}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {contribution.orgKrs.length} KR{contribution.orgKrs.length !== 1 ? 's' : ''} impactado{contribution.orgKrs.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {contribution.totalTeamOkrs} OKR{contribution.totalTeamOkrs !== 1 ? 's' : ''} do time
                  </p>
                </div>
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
              </div>
            </div>

            <div className="mt-3 pl-11">
              <div className="flex items-center gap-2">
                <Progress value={contribution.progress} className="h-1.5 flex-1" />
                <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                  {Math.round(contribution.progress)}%
                </span>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="pl-11 space-y-3">
              {contribution.orgKrs.map((orgKr) => (
                <OrgKrContributionItem key={orgKr.id} orgKr={orgKr} />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
