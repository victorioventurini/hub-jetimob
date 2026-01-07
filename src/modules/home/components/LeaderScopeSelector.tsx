/**
 * LeaderScopeSelector - Team selector for leaders
 * Shows current team with dropdown to switch between teams
 */
import { Check, ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaderTeam } from "../types";

interface LeaderScopeSelectorProps {
  teams: LeaderTeam[];
  selectedTeam: LeaderTeam | null;
  onSelectTeam: (teamId: string) => void;
  hasMultipleTeams: boolean;
  isLoading?: boolean;
}

export function LeaderScopeSelector({
  teams,
  selectedTeam,
  onSelectTeam,
  hasMultipleTeams,
  isLoading,
}: LeaderScopeSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    );
  }

  if (!selectedTeam) {
    return null;
  }

  // Single team - read-only display
  if (!hasMultipleTeams) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {selectedTeam.team_name}
            </span>
            <Badge variant="secondary" className="text-xs">
              Meu time
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            {selectedTeam.member_count} membro{selectedTeam.member_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    );
  }

  // Multiple teams - dropdown selector
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between h-auto py-3 px-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">{selectedTeam.team_name}</div>
              <div className="text-sm text-muted-foreground">
                {selectedTeam.member_count} membro{selectedTeam.member_count !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.team_id}
            onClick={() => onSelectTeam(team.team_id)}
            className="flex items-center justify-between py-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-medium">{team.team_name}</div>
                <div className="text-xs text-muted-foreground">
                  {team.member_count} membro{team.member_count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            {team.team_id === selectedTeam.team_id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
