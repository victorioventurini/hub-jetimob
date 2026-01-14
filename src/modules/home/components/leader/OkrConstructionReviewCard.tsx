/**
 * OkrConstructionReviewCard - Card de acesso à Avaliação de Construção de OKRs
 * 
 * Permite que líderes acessem a análise automática de qualidade dos OKRs do seu time
 */

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { useActiveCycles } from "@/modules/okrs/hooks/useCycleData";

export interface OkrConstructionReviewCardProps {
  teamId: string | null;
  teamName?: string;
  hasActiveOkrs?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function OkrConstructionReviewCard({
  teamId,
  teamName,
  hasActiveOkrs: externalHasActiveOkrs,
  isLoading: externalIsLoading = false,
  className,
}: OkrConstructionReviewCardProps) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { data: activeCycles, isLoading: isCyclesLoading } = useActiveCycles();
  
  // Get active cycle IDs (can be multiple: quarter, semester, year)
  const activeCycleIds = activeCycles?.map(c => c.id) ?? [];

  // Query to check if team has objectives in ANY active cycle
  const { data: objectivesCount = 0, isLoading: isQueryLoading } = useQuery({
    queryKey: [...queryKeys.okrs.teamObjectives(currentBuId, teamId), 'count-any-active', activeCycleIds],
    queryFn: async () => {
      if (!teamId || activeCycleIds.length === 0) return 0;
      
      const { count, error } = await supabase
        .from('okr_team_objectives')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .in('cycle_id', activeCycleIds)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      
      if (error) {
        console.error('Error counting objectives:', error);
        return 0;
      }
      
      return count ?? 0;
    },
    enabled: !!supabase && !!currentBuId && !!teamId && activeCycleIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = externalIsLoading || isQueryLoading || isCyclesLoading;
  const hasActiveOkrs = externalHasActiveOkrs || objectivesCount > 0;

  if (isLoading) {
    return (
      <Card className={cn("animate-fade-in", className)}>
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!teamId) {
    return null;
  }

  // Se não tem OKRs ativos, não faz sentido mostrar análise
  if (!hasActiveOkrs) {
    return null;
  }

  return (
    <Card
      className={cn(
        "animate-fade-in overflow-hidden transition-all hover:shadow-md group",
        "border-muted bg-gradient-to-r from-accent/30 to-transparent",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="p-3 rounded-xl bg-accent/50 transition-transform group-hover:scale-105">
            <ClipboardCheck className="h-6 w-6 text-accent-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base">
                Avaliação de Construção
              </h3>
              <Badge 
                variant="outline" 
                className="text-xs bg-primary/10 text-primary border-primary/30"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                IA
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              Análise automática da qualidade dos OKRs{teamName ? ` do ${teamName}` : ''}
            </p>
          </div>

          {/* Action */}
          <Button
            asChild
            size="sm"
            variant="outline"
            className="shrink-0 gap-1"
          >
            <Link to={`/okrs/construction-review?team=${teamId}`}>
              Analisar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
