/**
 * ScopeNamesCell
 * 
 * Displays team and job title names with truncation and tooltip.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface ScopeNamesCellProps {
  teamNames?: string[];
  jobTitleNames?: string[];
}

export function ScopeNamesCell({ teamNames = [], jobTitleNames = [] }: ScopeNamesCellProps) {
  const hasTeams = teamNames.length > 0;
  const hasJobTitles = jobTitleNames.length > 0;
  
  if (!hasTeams && !hasJobTitles) {
    return <span className="text-sm text-muted-foreground">Global</span>;
  }

  const allItems: { label: string; type: 'team' | 'job_title' }[] = [
    ...jobTitleNames.map(name => ({ label: name, type: 'job_title' as const })),
    ...teamNames.map(name => ({ label: name, type: 'team' as const })),
  ];

  const maxVisible = 2;
  const visibleItems = allItems.slice(0, maxVisible);
  const hiddenCount = allItems.length - maxVisible;

  const fullTooltipContent = (
    <div className="space-y-2 max-w-xs">
      {hasJobTitles && (
        <div>
          <span className="font-medium text-xs text-muted-foreground">Cargos:</span>
          <ul className="list-disc list-inside text-sm">
            {jobTitleNames.map((name, i) => (
              <li key={`jt-${i}`}>{name}</li>
            ))}
          </ul>
        </div>
      )}
      {hasTeams && (
        <div>
          <span className="font-medium text-xs text-muted-foreground">Times:</span>
          <ul className="list-disc list-inside text-sm">
            {teamNames.map((name, i) => (
              <li key={`t-${i}`}>{name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="flex flex-wrap gap-1 max-w-[200px] cursor-default">
            {visibleItems.map((item, i) => (
              <Badge 
                key={i} 
                variant="secondary" 
                className="text-xs truncate max-w-[90px]"
              >
                {item.label}
              </Badge>
            ))}
            {hiddenCount > 0 && (
              <Badge variant="outline" className="text-xs">
                +{hiddenCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          {fullTooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
