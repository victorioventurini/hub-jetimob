/**
 * TeamOkrsCard - Shows OKR summary for the team
 */
import { Link } from "react-router-dom";
import { Target, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { OkrSummary } from "../../types";

interface TeamOkrsCardProps {
  okrs: OkrSummary | undefined;
  teamId: string | null;
  isLoading?: boolean;
}

export function TeamOkrsCard({ okrs, teamId, isLoading }: TeamOkrsCardProps) {

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            OKRs do meu time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!okrs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            OKRs do meu time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecione um time para ver os OKRs.
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = okrs.green + okrs.yellow + okrs.red + okrs.not_started;
  const greenPercent = total > 0 ? (okrs.green / total) * 100 : 0;
  const yellowPercent = total > 0 ? (okrs.yellow / total) * 100 : 0;
  const redPercent = total > 0 ? (okrs.red / total) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            OKRs do meu time
          </CardTitle>
          {okrs.pending_checkins > 0 && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              {okrs.pending_checkins} check-in{okrs.pending_checkins > 1 ? 's' : ''} pendente{okrs.pending_checkins > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Segmented progress bar */}
        <div className="space-y-2">
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            {greenPercent > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${greenPercent}%` }}
              />
            )}
            {yellowPercent > 0 && (
              <div
                className="bg-yellow-500 transition-all"
                style={{ width: `${yellowPercent}%` }}
              />
            )}
            {redPercent > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${redPercent}%` }}
              />
            )}
          </div>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-green-600">{okrs.green}</div>
            <div className="text-xs text-muted-foreground">No caminho</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">{okrs.yellow}</div>
            <div className="text-xs text-muted-foreground">Em risco</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">{okrs.red}</div>
            <div className="text-xs text-muted-foreground">Fora</div>
          </div>
          <div>
            <div className="text-lg font-bold text-muted-foreground">{okrs.not_started}</div>
            <div className="text-xs text-muted-foreground">Não iniciado</div>
          </div>
        </div>

        {/* CTA */}
        <Button
          asChild
          variant="outline"
          className="w-full gap-2"
        >
          <Link to={teamId ? `/okrs?team=${teamId}` : '/okrs'}>
            Abrir OKRs do time
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
