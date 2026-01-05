import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, User } from "lucide-react";
import type { TeamContributionData } from "../../hooks/useTeamContributionView";

interface TeamContributionHeaderProps {
  data: TeamContributionData;
  buName?: string;
}

const statusConfig = {
  on_track: { label: 'On Track', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600' },
  at_risk: { label: 'Em Risco', variant: 'secondary' as const, className: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
  off_track: { label: 'Off Track', variant: 'destructive' as const, className: '' },
};

export function TeamContributionHeader({ data, buName }: TeamContributionHeaderProps) {
  const status = statusConfig[data.aggregatedStatus];

  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{data.team.name}</h1>
              {buName && (
                <p className="text-sm text-muted-foreground">{buName}</p>
              )}
              {data.team.description && (
                <p className="text-sm text-muted-foreground mt-1">{data.team.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Leader */}
            {data.team.leaderName && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={data.team.leaderPhotoUrl || undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs">Gestor</p>
                  <p className="font-medium">{data.team.leaderName}</p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="text-center px-4 border-l">
              <p className="text-2xl font-bold text-foreground">{data.totalActiveOkrs}</p>
              <p className="text-xs text-muted-foreground">OKRs Ativos</p>
            </div>

            {/* Status Badge */}
            <Badge className={status.className}>
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progresso Geral</span>
            <span className="text-sm font-medium">{Math.round(data.aggregatedProgress)}%</span>
          </div>
          <Progress value={data.aggregatedProgress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
