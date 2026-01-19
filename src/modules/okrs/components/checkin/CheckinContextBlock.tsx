import { Badge } from "@/components/ui/badge";
import { Target, Zap, User, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { OkrRagStatus } from "../../types";
import { RAG_STATUS_COLORS } from "@/lib/colors";
import type { CheckinKrData } from "./checkinTypes";

interface CheckinContextBlockProps {
  kr: CheckinKrData;
  userTeamName?: string;
}

export function CheckinContextBlock({ kr, userTeamName }: CheckinContextBlockProps) {
  const getStatusLabel = (s: OkrRagStatus) => {
    switch (s) {
      case 'green': return 'On Track';
      case 'yellow': return 'At Risk';
      case 'red': return 'Off Track';
      default: return 'Não iniciado';
    }
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      {/* Objective */}
      {kr.team_objective && (
        <div className="flex items-start gap-2">
          <Target className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Objetivo</p>
            <p className="text-sm font-medium line-clamp-1">{kr.team_objective.title}</p>
          </div>
        </div>
      )}

      {/* KR Title */}
      <div className="flex items-start gap-2">
        <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">Key Result</p>
          <p className="text-sm font-medium">{kr.title}</p>
        </div>
      </div>

      {/* Shared OKR context */}
      {kr.is_shared && (
        <div className="flex items-center gap-2 p-2 bg-accent/50 border border-accent rounded-md">
          <Users className="w-4 h-4 text-accent-foreground" />
          <span className="text-xs text-accent-foreground">
            OKR Compartilhada {kr.team_name && `• ${kr.team_name}`}
          </span>
        </div>
      )}

      {/* User's team context for check-in */}
      {userTeamName && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>Check-in será registrado como: <span className="font-medium">{userTeamName}</span></span>
        </div>
      )}

      {/* Meta info row */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
        {kr.owner && (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            <span>{kr.owner.display_name}</span>
          </div>
        )}
        {kr.last_checkin_at && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            <span>Último: {format(new Date(kr.last_checkin_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        )}
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs px-1.5 py-0",
            kr.status === 'green' && `${RAG_STATUS_COLORS.green.border} ${RAG_STATUS_COLORS.green.text}`,
            kr.status === 'yellow' && `${RAG_STATUS_COLORS.yellow.border} ${RAG_STATUS_COLORS.yellow.text}`,
            kr.status === 'red' && `${RAG_STATUS_COLORS.red.border} ${RAG_STATUS_COLORS.red.text}`,
            kr.status === 'not_started' && 'border-muted-foreground/30'
          )}
        >
          {getStatusLabel(kr.status)}
        </Badge>
      </div>
    </div>
  );
}
