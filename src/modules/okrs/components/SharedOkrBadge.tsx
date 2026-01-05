import { Badge } from "@/components/ui/badge";
import { Users, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SharedOkrBadgeProps {
  isShared: boolean;
  primaryTeamName?: string;
  contributingTeams?: Array<{ id: string; name: string }>;
  responsibilityModel?: 'collaborative' | 'primary_led';
  isPrimaryTeam?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Badge component to visually identify shared OKRs.
 * Shows participating teams and responsibility model.
 */
export function SharedOkrBadge({
  isShared,
  primaryTeamName,
  contributingTeams = [],
  responsibilityModel = 'collaborative',
  isPrimaryTeam,
  compact = false,
  className,
}: SharedOkrBadgeProps) {
  if (!isShared) return null;

  const allTeams = [primaryTeamName, ...contributingTeams.map(t => t.name)].filter(Boolean);
  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
      <p className="font-semibold">OKR Compartilhada</p>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Time primário:</span>{" "}
          <span className="font-medium">{primaryTeamName || "Não definido"}</span>
        </p>
        {contributingTeams.length > 0 && (
          <p>
            <span className="text-muted-foreground">Contribuidores:</span>{" "}
            <span className="font-medium">
              {contributingTeams.map(t => t.name).join(", ")}
            </span>
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Modelo:</span>{" "}
          <span className="font-medium">
            {responsibilityModel === 'collaborative' ? 'Colaborativo' : 'Líder primário + contribuidores'}
          </span>
        </p>
      </div>
    </div>
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
                className
              )}
            >
              <Users className="w-3 h-3 mr-1" />
              Compartilhada
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
            >
              <Users className="w-3 h-3 mr-1" />
              Compartilhada
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {isPrimaryTeam !== undefined && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {isPrimaryTeam ? (
            <>
              <Crown className="w-3 h-3 text-amber-500" />
              <span>Time primário</span>
            </>
          ) : (
            <span>Time contribuidor</span>
          )}
        </div>
      )}
      
      {allTeams.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Times: {allTeams.join(", ")}
        </p>
      )}
    </div>
  );
}
