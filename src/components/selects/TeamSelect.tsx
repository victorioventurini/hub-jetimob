import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHierarchicalTeamList, FlatTeamItem } from "@/modules/teams/hooks/useTeams";
import { cn } from "@/lib/utils";

interface TeamSelectProps {
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
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
}: TeamSelectProps) {
  const { teams: hookTeams, isLoading } = useHierarchicalTeamList();
  const teams = externalTeams ?? hookTeams;

  const handleValueChange = (newValue: string) => {
    if (newValue === "all") {
      onValueChange(undefined);
    } else if (newValue === "none") {
      onValueChange(undefined);
    } else {
      onValueChange(newValue);
    }
  };

  const displayValue = value ?? (includeAll ? "all" : includeNone ? "none" : "");

  return (
    <Select
      value={displayValue}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn("w-[200px]", triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
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
        {teams.map((team) => (
          <SelectItem
            key={team.id}
            value={team.id}
            className={cn(
              team.level === 0 && "font-medium",
              team.level > 0 && "text-[13px] text-muted-foreground"
            )}
          >
            <span 
              className="flex items-center"
              style={{ paddingLeft: `${team.level * 16}px` }}
            >
              {team.level > 0 && (
                <span className="mr-1.5 text-muted-foreground/50">└</span>
              )}
              {team.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
