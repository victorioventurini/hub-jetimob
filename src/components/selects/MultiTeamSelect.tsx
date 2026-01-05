import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHierarchicalTeamList, FlatTeamItem } from "@/modules/teams/hooks/useTeams";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";

interface MultiTeamSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  excludeTeamIds?: string[];
  disabled?: boolean;
  className?: string;
  teams?: FlatTeamItem[];
}

/**
 * Multi-select component for teams with hierarchical display.
 * Used for selecting contributing teams in shared OKRs.
 */
export function MultiTeamSelect({
  value,
  onValueChange,
  placeholder = "Selecione times",
  excludeTeamIds = [],
  disabled = false,
  className,
  teams: externalTeams,
}: MultiTeamSelectProps) {
  const [open, setOpen] = useState(false);
  const { teams: hookTeams, isLoading } = useHierarchicalTeamList();
  const teams = externalTeams ?? hookTeams;

  const filteredTeams = teams.filter(t => !excludeTeamIds.includes(t.id));

  const selectedTeams = filteredTeams.filter(t => value.includes(t.id));

  const handleToggle = (teamId: string) => {
    if (value.includes(teamId)) {
      onValueChange(value.filter(id => id !== teamId));
    } else {
      onValueChange([...value, teamId]);
    }
  };

  const handleRemove = (teamId: string) => {
    onValueChange(value.filter(id => id !== teamId));
  };

  const handleClear = () => {
    onValueChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-[40px] h-auto",
            !value.length && "text-muted-foreground",
            className
          )}
          disabled={disabled || isLoading}
        >
          <div className="flex flex-wrap gap-1 items-center flex-1">
            {selectedTeams.length === 0 ? (
              <span>{placeholder}</span>
            ) : selectedTeams.length <= 2 ? (
              selectedTeams.map(team => (
                <Badge 
                  key={team.id} 
                  variant="secondary" 
                  className="mr-1"
                >
                  {team.name}
                  <button
                    type="button"
                    className="ml-1 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(team.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <Badge variant="secondary">
                {selectedTeams.length} times selecionados
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex items-center justify-between p-2 border-b">
          <span className="text-sm font-medium">Times contribuidores</span>
          {value.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 text-xs"
            >
              Limpar
            </Button>
          )}
        </div>
        <ScrollArea className="h-[250px]">
          <div className="p-2 space-y-1">
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                  value.includes(team.id) && "bg-muted"
                )}
                onClick={() => handleToggle(team.id)}
                style={{ paddingLeft: `${(team.level * 16) + 8}px` }}
              >
                <Checkbox
                  checked={value.includes(team.id)}
                  onCheckedChange={() => handleToggle(team.id)}
                />
                <span className={cn(
                  "text-sm",
                  team.level === 0 && "font-medium",
                  team.level > 0 && "text-muted-foreground"
                )}>
                  {team.level > 0 && (
                    <span className="mr-1 text-muted-foreground/50">└</span>
                  )}
                  {team.name}
                </span>
              </div>
            ))}
            {filteredTeams.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum time disponível
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
