/**
 * AssetsTeamLoansCard - Shows asset loans by team members
 */
import { Package, ArrowRight, AlertCircle, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, isPast, isFuture, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AssetSummary, AssetLoanItem } from "../../types";

interface AssetsTeamLoansCardProps {
  assets: AssetSummary | undefined;
  teamId: string | null;
  isLoading?: boolean;
}

function getDueStatus(dueAt: string | null): { label: string; variant: 'destructive' | 'outline' | 'secondary' } | null {
  if (!dueAt) return null;
  
  const dueDate = new Date(dueAt);
  
  if (isPast(dueDate)) {
    return { label: 'Atrasado', variant: 'destructive' };
  }
  
  // Due within 48h
  if (isFuture(dueDate) && dueDate <= addHours(new Date(), 48)) {
    return { label: 'Vence em breve', variant: 'outline' };
  }
  
  return null;
}

function formatDueDate(dueAt: string | null): string {
  if (!dueAt) return 'Sem prazo';
  
  const dueDate = new Date(dueAt);
  return formatDistanceToNow(dueDate, { locale: ptBR, addSuffix: true });
}

export function AssetsTeamLoansCard({ assets, teamId, isLoading }: AssetsTeamLoansCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Ativos emprestados pelo time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assets) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Ativos emprestados pelo time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecione um time para ver os empréstimos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Ativos emprestados pelo time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Counters */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-foreground">{assets.active_loans}</div>
            <div className="text-xs text-muted-foreground">Ativos</div>
          </div>
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <div className="text-lg font-bold text-red-600">{assets.overdue}</div>
            <div className="text-xs text-muted-foreground">Atrasados</div>
          </div>
          <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
            <div className="text-lg font-bold text-yellow-600">{assets.due_soon}</div>
            <div className="text-xs text-muted-foreground">Vencendo</div>
          </div>
        </div>

        {/* Top critical loans */}
        {assets.top.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Empréstimos mais críticos:
            </p>
            {assets.top.slice(0, 3).map((loan) => {
              const dueStatus = getDueStatus(loan.due_at);
              return (
                <div
                  key={loan.asset_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {loan.holder_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {loan.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {loan.holder_name} • {formatDueDate(loan.due_at)}
                      </div>
                    </div>
                  </div>
                  {dueStatus && (
                    <Badge variant={dueStatus.variant} className="text-xs ml-2">
                      {dueStatus.label}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : assets.active_loans === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Sem empréstimos ativos do time agora. ✨
          </p>
        ) : null}

        {/* CTA */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate('/assets/inventory')}
        >
          Ver empréstimos
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
