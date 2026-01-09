/**
 * WizardSummary - Passo 3: Resumo final do check-in em grupo
 * 
 * Mostra resultados e ações de encerramento
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2,
  SkipForward,
  AlertTriangle,
  ExternalLink,
  Copy,
  X,
  PartyPopper,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CheckinResult {
  krId: string;
  krTitle: string;
  previousValue: number;
  newValue: number;
  confidence: 'high' | 'medium' | 'low';
  skipped: boolean;
  blocker?: string;
}

interface WizardSummaryProps {
  results: CheckinResult[];
  cycleName: string;
  teamName: string;
  onViewCheckins: () => void;
  onCopySummary: () => void;
  onClose: () => void;
}

const confidenceLabels = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const confidenceColors = {
  high: 'text-green-600 bg-green-100 dark:bg-green-950',
  medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950',
  low: 'text-red-600 bg-red-100 dark:bg-red-950',
};

export function WizardSummary({
  results,
  cycleName,
  teamName,
  onViewCheckins,
  onCopySummary,
  onClose,
}: WizardSummaryProps) {
  const { toast } = useToast();
  
  // Computed stats
  const stats = useMemo(() => {
    const completed = results.filter(r => !r.skipped);
    const skipped = results.filter(r => r.skipped);
    const blockers = results.filter(r => r.blocker);
    const highConfidence = completed.filter(r => r.confidence === 'high');
    const atRisk = completed.filter(r => r.confidence === 'medium' || r.confidence === 'low');
    
    return {
      total: results.length,
      completed: completed.length,
      skipped: skipped.length,
      blockers: blockers.length,
      highConfidence: highConfidence.length,
      atRisk: atRisk.length,
      completedResults: completed,
      skippedResults: skipped,
      blockerResults: blockers,
    };
  }, [results]);
  
  const handleCopy = () => {
    onCopySummary();
    toast({
      title: 'Resumo copiado!',
      description: 'Cole onde quiser compartilhar.',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-6 text-center border-b">
        <PartyPopper className="h-12 w-12 mx-auto text-primary mb-3" />
        <h2 className="text-xl font-semibold">Check-in concluído!</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {teamName} • {cycleName}
        </p>
      </div>
      
      {/* Stats */}
      <div className="px-6 py-4 grid grid-cols-3 gap-3 border-b">
        <StatCard
          label="Concluídos"
          value={stats.completed}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Pulados"
          value={stats.skipped}
          icon={SkipForward}
          variant="muted"
        />
        <StatCard
          label="Bloqueadores"
          value={stats.blockers}
          icon={AlertTriangle}
          variant={stats.blockers > 0 ? 'warning' : 'muted'}
        />
      </div>
      
      {/* Results List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Completed */}
          {stats.completedResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Check-ins realizados ({stats.completed})
              </h3>
              <div className="space-y-2">
                {stats.completedResults.map((result) => (
                  <ResultCard key={result.krId} result={result} />
                ))}
              </div>
            </div>
          )}
          
          {/* Skipped */}
          {stats.skippedResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <SkipForward className="h-4 w-4" />
                KRs pulados ({stats.skipped})
              </h3>
              <div className="space-y-2">
                {stats.skippedResults.map((result) => (
                  <div 
                    key={result.krId}
                    className="p-3 rounded-lg border border-dashed text-sm text-muted-foreground"
                  >
                    {result.krTitle}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Blockers */}
          {stats.blockerResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                Bloqueadores registrados ({stats.blockers})
              </h3>
              <div className="space-y-2">
                {stats.blockerResults.map((result) => (
                  <div 
                    key={result.krId}
                    className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/50 dark:border-yellow-800"
                  >
                    <p className="text-sm font-medium">{result.krTitle}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      🚧 {result.blocker}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Actions */}
      <div className="px-6 py-4 border-t bg-muted/30 space-y-3">
        <div className="flex items-center gap-2">
          <Button onClick={onViewCheckins} className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver check-ins do ciclo
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar resumo
          </Button>
        </div>
        <Button 
          variant="ghost" 
          onClick={onClose}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Encerrar
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Helper Components
// ============================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: typeof CheckCircle2;
  variant: 'success' | 'warning' | 'muted';
}

function StatCard({ label, value, icon: Icon, variant }: StatCardProps) {
  const variantStyles = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    muted: 'text-muted-foreground',
  };
  
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <Icon className={cn("h-5 w-5 mx-auto mb-1", variantStyles[variant])} />
      <p className={cn("text-2xl font-bold", variantStyles[variant])}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

interface ResultCardProps {
  result: CheckinResult;
}

function ResultCard({ result }: ResultCardProps) {
  const valueDiff = result.newValue - result.previousValue;
  const TrendIcon = valueDiff > 0 ? TrendingUp : valueDiff < 0 ? TrendingDown : Minus;
  const trendColor = valueDiff > 0 ? 'text-green-600' : valueDiff < 0 ? 'text-red-600' : 'text-muted-foreground';
  
  return (
    <div className="p-3 rounded-lg border bg-background">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-1">{result.krTitle}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{result.previousValue}</span>
            <TrendIcon className={cn("h-3 w-3", trendColor)} />
            <span className={cn("font-medium", trendColor)}>{result.newValue}</span>
          </div>
        </div>
        <Badge 
          variant="secondary" 
          className={cn("text-xs", confidenceColors[result.confidence])}
        >
          {confidenceLabels[result.confidence]}
        </Badge>
      </div>
    </div>
  );
}
