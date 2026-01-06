import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, Building2, Edit, Layers3, ArrowUpRight } from "lucide-react";
import { TeamWithRelations } from "../types";
import { useNavigate } from "react-router-dom";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { cn } from "@/lib/utils";

interface TeamCardProps {
  team: TeamWithRelations;
  onEdit?: (team: TeamWithRelations) => void;
  variant?: "team" | "subteam";
}

export function TeamCard({ team, onEdit, variant = "team" }: TeamCardProps) {
  const navigate = useNavigate();
  const { canManageTeam } = useTeamManagement();
  
  // Verificar se usuário pode gerenciar ESTE time específico
  const canManageThisTeam = canManageTeam(team.id);

  const isSubteam = variant === "subteam";

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleClick = () => {
    navigate(`/teams/${team.id}`);
  };

  return (
    <Card
      className={cn(
        "group hover:shadow-lg transition-all duration-200 cursor-pointer relative",
        isSubteam 
          ? "hover:border-blue-500/30 border-l-4 border-l-blue-500/50" 
          : "hover:border-primary/30 border-l-4 border-l-primary/50"
      )}
      onClick={handleClick}
    >
      {/* Edit Button */}
      {canManageThisTeam && onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(team);
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-6 w-6 rounded flex items-center justify-center shrink-0",
              isSubteam ? "bg-blue-500/10" : "bg-primary/10"
            )}>
              {isSubteam ? (
                <Layers3 className="h-3.5 w-3.5 text-blue-500" />
              ) : (
                <Building2 className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <CardTitle className="text-lg">{team.name}</CardTitle>
            {team.status === "inactive" && (
              <Badge variant="secondary" className="text-xs">
                Inativo
              </Badge>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
        </div>
        {team.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 ml-8">
            {team.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parent Team (for sub-teams) */}
        {isSubteam && team.parent_team && (
          <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5 w-fit">
            <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              Vinculado a <span className="font-medium text-foreground">{team.parent_team.name}</span>
            </span>
          </div>
        )}

        {/* Leader */}
        {team.leader && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={team.leader.photo_url || undefined} />
              <AvatarFallback className="bg-accent/10 text-accent text-xs font-semibold">
                {getInitials(team.leader.display_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{team.leader.display_name}</p>
              <p className="text-xs text-muted-foreground">Líder</p>
            </div>
          </div>
        )}

        {!team.leader && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm">Sem líder definido</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{team.member_count || 0} pessoas</span>
          </div>
          {!isSubteam && team.child_teams && team.child_teams.length > 0 && (
            <Badge 
              variant="outline" 
              className="text-xs bg-blue-500/5 text-blue-600 border-blue-500/20"
            >
              <Layers3 className="h-3 w-3 mr-1" />
              {team.child_teams.length} sub-time{team.child_teams.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
