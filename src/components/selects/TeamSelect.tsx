import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHierarchicalTeamList, type FlatTeamItem } from "@/modules/teams/hooks";
import { cn } from "@/lib/utils";

interface TeamSelectProps {
  value: string | undefined | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  includeNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /** Override teams list if you already have the data */
  teams?: FlatTeamItem[];
  /** Team IDs to exclude from the list */
  excludeIds?: string[];
  /** If provided, only show teams with these IDs */
  filterTeamIds?: string[];
}

/**
 * Centralized team select component with hierarchical display.
 * Parent teams are shown with normal font, child teams are indented and smaller.
 */
export function TeamSelect({
  value,
  onValueChange,
  placeholder = "Selecione um time",
  includeAll = false,
  allLabel = "Todos os times",
  includeNone = false,
  noneLabel = "Nenhum",
  disabled = false,
  className,
  triggerClassName,
  teams: externalTeams,
  excludeIds = [],
  filterTeamIds,
}: TeamSelectProps) {
  const { teams: hookTeams, isLoading } = useHierarchicalTeamList();
  
  // Filter by filterTeamIds first, then exclude
  const baseTeams = externalTeams ?? hookTeams;
  const filteredTeams = baseTeams
    .filter((team) => !excludeIds.includes(team.id))
    .filter((team) => !filterTeamIds || filterTeamIds.includes(team.id));

  const handleValueChange = (newValue: string) => {
    if (newValue === "all" || newValue === "none") {
      onValueChange(null);
    } else {
      onValueChange(newValue);
    }
  };

  // Handle null value (treat as none/all based on config)
  const normalizedValue = value === null ? undefined : value;
  const displayValue = normalizedValue ?? (includeAll ? "all" : includeNone ? "none" : "");

  return (
    <Select
      value={displayValue}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn("w-full", triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {includeAll && (
          <SelectItem value="all" className="font-medium">
            {allLabel}
          </SelectItem>
        )}
        {includeNone && (
          <SelectItem value="none" className="text-muted-foreground">
            {noneLabel}
          </SelectItem>
        )}
        {filteredTeams.map((team) => (
          <SelectItem
            key={team.id}
            value={team.id}
            className={cn(
              "relative",
              team.level === 0 && "font-medium",
              team.level > 0 && "text-muted-foreground"
            )}
          >
            <span 
              className="flex items-center gap-1.5"
              style={{ paddingLeft: `${team.level * 12}px` }}
            >
              {team.level > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
              )}
              {team.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
