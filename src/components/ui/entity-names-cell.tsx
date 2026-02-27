/**
 * EntityNamesCell
 * 
 * Displays resolved entity names (users, teams, squads) with
 * truncation and tooltip. Follows the ScopeNamesCell pattern
 * from assets/recommendations.
 * 
 * Accepts pre-resolved names — the parent component is responsible
 * for resolving IDs to names before passing them here.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Target } from "lucide-react";

interface EntityGroup {
  label: string;
  icon: React.ReactNode;
  names: string[];
}

interface EntityNamesCellProps {
  /** User display names */
  userNames?: string[];
  /** Team names */
  teamNames?: string[];
  /** Squad names */
  squadNames?: string[];
  /** Max visible badges before "+N" */
  maxVisible?: number;
  /** Badge variant for visible items */
  variant?: "default" | "secondary" | "outline";
  /** Fallback when all lists are empty */
  emptyText?: string;
}

export function EntityNamesCell({
  userNames = [],
  teamNames = [],
  squadNames = [],
  maxVisible = 2,
  variant = "secondary",
  emptyText = "-",
}: EntityNamesCellProps) {
  const allItems = [
    ...userNames.map((name) => ({ name, icon: <Users className="h-3 w-3 mr-1 shrink-0" /> })),
    ...teamNames.map((name) => ({ name, icon: <Building2 className="h-3 w-3 mr-1 shrink-0" /> })),
    ...squadNames.map((name) => ({ name, icon: <Target className="h-3 w-3 mr-1 shrink-0" /> })),
  ];

  if (allItems.length === 0) {
    return <span className="text-sm text-muted-foreground">{emptyText}</span>;
  }

  const visibleItems = allItems.slice(0, maxVisible);
  const hiddenCount = allItems.length - maxVisible;

  // Build tooltip content grouped by type
  const groups: EntityGroup[] = [];
  if (userNames.length > 0) {
    groups.push({ label: "Usuários", icon: <Users className="h-3 w-3" />, names: userNames });
  }
  if (teamNames.length > 0) {
    groups.push({ label: "Times", icon: <Building2 className="h-3 w-3" />, names: teamNames });
  }
  if (squadNames.length > 0) {
    groups.push({ label: "Squads", icon: <Target className="h-3 w-3" />, names: squadNames });
  }

  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
      {groups.map((group) => (
        <div key={group.label}>
          <span className="font-medium text-xs text-muted-foreground">{group.label}:</span>
          <ul className="list-disc list-inside text-sm">
            {group.names.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="flex flex-wrap gap-1 max-w-[220px] cursor-default">
            {visibleItems.map((item, i) => (
              <Badge key={i} variant={variant} className="text-xs truncate max-w-[100px]">
                {item.icon}
                {item.name}
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
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
