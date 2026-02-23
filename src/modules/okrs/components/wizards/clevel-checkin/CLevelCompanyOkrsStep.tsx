/**
 * CLevelCompanyOkrsStep - Visão geral dos OKRs da empresa
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LastCheckinBadge } from '../shared/LastCheckinBadge';
import {
  Target,
  ArrowRight,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface CompanyOkr {
  id: string;
  title: string;
  progress: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface CLevelCompanyOkrsStepProps {
  okrs: CompanyOkr[];
  isLoading?: boolean;
  lastCompletedAt?: string | null;
  onContinue: () => void;
}

const getTrendIcon = (trend: string) => {
  if (trend === 'improving') return <TrendingUp className="h-4 w-4" />;
  if (trend === 'declining') return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
};

const getTrendLabel = (trend: string) => {
  if (trend === 'improving') return 'Melhorando';
  if (trend === 'declining') return 'Em risco';
  return 'Estável';
};

export function CLevelCompanyOkrsStep({
  okrs,
  isLoading,
  lastCompletedAt,
  onContinue,
}: CLevelCompanyOkrsStepProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-64 mb-3" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">OKRs da Empresa</h3>
              <p className="text-sm text-muted-foreground">
                Visão geral dos objetivos estratégicos
              </p>
            </div>
          </div>
          <LastCheckinBadge lastCompletedAt={lastCompletedAt ?? null} />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {okrs.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h4 className="font-medium">Nenhum OKR organizacional</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Não há objetivos organizacionais definidos para este ano.
              </p>
            </div>
          ) : (
            okrs.map(okr => (
              <Card key={okr.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-medium">{okr.title}</span>
                    </div>
                    <Badge 
                      variant={
                        okr.trend === 'declining' 
                          ? 'destructive' 
                          : okr.trend === 'improving' 
                            ? 'default' 
                            : 'secondary'
                      } 
                      className="gap-1"
                    >
                      {getTrendIcon(okr.trend)}
                      {getTrendLabel(okr.trend)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={okr.progress} className="flex-1" />
                    <span className="text-sm font-medium">{okr.progress}%</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <Button 
          onClick={onContinue}
          className="w-full"
          size="lg"
        >
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
