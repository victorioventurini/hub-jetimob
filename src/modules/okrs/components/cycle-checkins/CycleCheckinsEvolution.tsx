/**
 * CycleCheckinsEvolution - Visualização de gráficos de evolução dos KRs
 * 
 * Reutiliza o KrEvolutionChart centralizado para exibir:
 * - Gráfico expandido quando há uma única KR filtrada
 * - Grid de mini-cards com gráficos para múltiplas KRs
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RAG_STATUS_COLORS } from '@/lib/colors';
import { type CheckinFeedItem, useKrWithHistory } from "../../hooks";
import { KrEvolutionChart } from '../KrEvolutionChart';
import { KrHistoryDialog } from '../KrHistoryDialog';

interface CycleCheckinsEvolutionProps {
  checkins: CheckinFeedItem[];
  isLoading: boolean;
}

interface KrGroupData {
  kr_id: string;
  kr_title: string;
  kr_status: 'green' | 'yellow' | 'red' | 'not_started';
  team_name: string;
  objective_title: string;
  checkins: CheckinFeedItem[];
  latest_value: number;
}

export function CycleCheckinsEvolution({ 
  checkins, 
  isLoading,
}: CycleCheckinsEvolutionProps) {
  const [selectedKrId, setSelectedKrId] = useState<string | null>(null);
  
  // Agrupar checkins por KR
  const checkinsByKr = useMemo(() => {
    const groups: Record<string, KrGroupData> = {};
    
    checkins.forEach((checkin) => {
      if (!groups[checkin.kr_id]) {
        groups[checkin.kr_id] = {
          kr_id: checkin.kr_id,
          kr_title: checkin.kr_title,
          kr_status: checkin.kr_status,
          team_name: checkin.team_name,
          objective_title: checkin.objective_title,
          checkins: [],
          latest_value: checkin.current_value,
        };
      }
      groups[checkin.kr_id].checkins.push(checkin);
      // Atualizar valor mais recente
      if (new Date(checkin.created_at) > new Date(groups[checkin.kr_id].checkins[0]?.created_at || 0)) {
        groups[checkin.kr_id].latest_value = checkin.current_value;
      }
    });
    
    return groups;
  }, [checkins]);
  
  const uniqueKrs = Object.keys(checkinsByKr);
  const isSingleKr = uniqueKrs.length === 1;
  
  // Preparar KR selecionada para o dialog
  const selectedKr = useMemo(() => {
    if (!selectedKrId || !checkinsByKr[selectedKrId]) return null;
    const krData = checkinsByKr[selectedKrId];
    return {
      id: krData.kr_id,
      title: krData.kr_title,
      baseline: 0,
      current_value: krData.latest_value,
      target: 100,
      unit: '%',
      direction: 'up' as const,
      status: krData.kr_status,
      type: 'contribution' as const,
      team_name: krData.team_name,
      objective_title: krData.objective_title,
    };
  }, [selectedKrId, checkinsByKr]);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (uniqueKrs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma KR encontrada</h3>
          <p className="text-muted-foreground text-sm">
            Não há KRs com check-ins que correspondam aos filtros selecionados.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Se há apenas uma KR, mostrar gráfico expandido
  if (isSingleKr) {
    const krData = checkinsByKr[uniqueKrs[0]];
    return (
      <SingleKrEvolutionView 
        krId={krData.kr_id} 
        krData={krData}
      />
    );
  }
  
  // Múltiplas KRs: mostrar grid de mini-cards
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.values(checkinsByKr).map((krData) => (
          <MiniKrEvolutionCard
            key={krData.kr_id}
            krData={krData}
            onClick={() => setSelectedKrId(krData.kr_id)}
          />
        ))}
      </div>
      
      {/* KR History Dialog */}
      <KrHistoryDialog
        open={!!selectedKrId}
        onOpenChange={(open) => !open && setSelectedKrId(null)}
        kr={selectedKr}
      />
    </>
  );
}

// ============================================================
// SingleKrEvolutionView - Gráfico expandido para uma única KR
// ============================================================

interface SingleKrEvolutionViewProps {
  krId: string;
  krData: KrGroupData;
}

function SingleKrEvolutionView({ krId, krData }: SingleKrEvolutionViewProps) {
  const { data: krWithHistory, isLoading } = useKrWithHistory(krId);
  
  // Usar dados do history se disponível, senão usa o que temos
  const checkins = krWithHistory?.checkins || [];
  const baseline = krWithHistory?.baseline ?? 0;
  const target = krWithHistory?.target ?? 100;
  const unit = krWithHistory?.unit ?? '%';
  const direction = krWithHistory?.direction ?? 'up';
  const currentValue = krWithHistory?.currentValue ?? krData.latest_value;
  
  // Calcular progresso - permitir acima de 100% para superação de metas
  const progress = target !== baseline 
    ? Math.max(0, ((currentValue - baseline) / (target - baseline)) * 100)
    : 0;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", RAG_STATUS_COLORS[krData.kr_status]?.dot)} />
          <CardTitle className="text-lg">{krData.kr_title}</CardTitle>
        </div>
        <CardDescription>
          {krData.objective_title} • {krData.team_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar com valor atual */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {baseline} {unit} <span className="text-xs">(Base)</span>
            </span>
            <span className="font-medium">
              {currentValue} {unit} 
              <span className="text-muted-foreground ml-1">/ {target} {unit}</span>
            </span>
          </div>
          {/* Barra visual limitada a 100% */}
          <Progress value={Math.min(100, progress)} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className={progress > 100 ? 'text-status-green font-medium' : ''}>
              {progress.toFixed(0)}% concluído
              {progress > 100 && ' 🚀'}
            </span>
            <span>{krData.checkins.length} check-ins</span>
          </div>
        </div>
        
        {/* Gráfico de evolução - reutiliza componente centralizado */}
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <KrEvolutionChart
            checkins={checkins}
            baseline={baseline}
            target={target}
            unit={unit}
            direction={direction}
            className="h-64"
          />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// MiniKrEvolutionCard - Card compacto com mini-gráfico
// ============================================================

interface MiniKrEvolutionCardProps {
  krData: KrGroupData;
  onClick: () => void;
}

function MiniKrEvolutionCard({ krData, onClick }: MiniKrEvolutionCardProps) {
  const { data: krWithHistory, isLoading } = useKrWithHistory(krData.kr_id);
  
  const checkins = krWithHistory?.checkins || [];
  const baseline = krWithHistory?.baseline ?? 0;
  const target = krWithHistory?.target ?? 100;
  const unit = krWithHistory?.unit ?? '%';
  const direction = krWithHistory?.direction ?? 'up';
  const currentValue = krWithHistory?.currentValue ?? krData.latest_value;
  
  // Calcular progresso - permitir acima de 100% para superação de metas
  const progress = target !== baseline 
    ? Math.max(0, ((currentValue - baseline) / (target - baseline)) * 100)
    : 0;
  
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full shrink-0", RAG_STATUS_COLORS[krData.kr_status]?.dot)} />
          <CardTitle className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {krData.kr_title}
          </CardTitle>
        </div>
        <CardDescription className="text-xs truncate">
          {krData.team_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* Mini gráfico */}
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <KrEvolutionChart
            checkins={checkins}
            baseline={baseline}
            target={target}
            unit={unit}
            direction={direction}
            compact={true}
            className="h-24"
          />
        )}
        
        {/* Footer info */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">
            {krData.checkins.length} check-ins
          </span>
          <Badge variant="secondary" className="text-xs">
            {progress.toFixed(0)}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
