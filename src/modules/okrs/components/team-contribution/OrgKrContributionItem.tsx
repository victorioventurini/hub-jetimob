import React, { useState } from "react";
import { ChevronDown, ChevronRight, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TeamOkrListItem } from "./TeamOkrListItem";
import type { OrgKrContribution } from "../../hooks";


interface OrgKrContributionItemProps {
  orgKr: OrgKrContribution;
}

const statusConfig = {
  green: { label: 'On Track', className: 'bg-success-muted text-success-muted-foreground' },
  yellow: { label: 'Em Risco', className: 'bg-warning-muted text-warning-muted-foreground' },
  red: { label: 'Off Track', className: 'bg-danger-muted text-danger-muted-foreground' },
  not_started: { label: 'Não Iniciado', className: 'bg-muted text-muted-foreground' },
};

export const OrgKrContributionItem = React.memo(function OrgKrContributionItem({ orgKr }: OrgKrContributionItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const status = statusConfig[orgKr.status];

  return (
    <div className="border rounded-lg bg-muted/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-6 w-6">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground text-left">
                {orgKr.title}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Progress value={orgKr.progress} className="h-1.5 w-20" />
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {Math.round(orgKr.progress)}%
                </span>
              </div>
              <Badge variant="secondary" className={`text-xs ${status.className}`}>
                {status.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {orgKr.teamOkrs.length} OKR{orgKr.teamOkrs.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3">
            <div className="pl-9 space-y-2">
              {orgKr.teamOkrs.map((okr) => (
                <TeamOkrListItem key={okr.id} okr={okr} />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});
