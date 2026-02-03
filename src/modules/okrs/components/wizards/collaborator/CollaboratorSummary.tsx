/**
 * CollaboratorSummary - Resumo final do Wizard Colaborador
 * 
 * Mostra:
 * - Estatísticas do check-in
 * - Lista de KRs atualizados
 * - Bloqueadores registrados
 * - Ações de fechamento
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  SkipForward,
  AlertTriangle,
  Copy,
  ExternalLink,
  X,
  TrendingUp,
  TrendingDown,
  PartyPopper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CONFIDENCE_COLORS } from '@/lib/colors';
import type { CollaboratorCheckinResult, CollaboratorReflection, KpiCheckinResult } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface CollaboratorSummaryProps {
  results: CollaboratorCheckinResult[];
  kpiResults?: KpiCheckinResult[];
  reflection?: CollaboratorReflection;
  initiativesMarkedAtRisk?: string[];
  cycleName?: string;
  onViewOkrs: () => void;
  onClose: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function CollaboratorSummary({
  results,
  kpiResults = [],
  reflection,
  initiativesMarkedAtRisk = [],
  cycleName,
  onViewOkrs,
  onClose,
}: CollaboratorSummaryProps) {
  // Stats
  const stats = useMemo(() => {
    const completed = results.filter(r => !r.skipped);
    const skipped = results.filter(r => r.skipped);
    const withBlockers = results.filter(r => r.blocker);
    const improved = completed.filter(r => r.newValue > r.previousValue);
    
    // KPI stats
    const kpisCompleted = kpiResults.filter(k => !k.skipped);
    const kpisSkipped = kpiResults.filter(k => k.skipped);
    
    return {
      total: results.length,
      completed: completed.length,
      skipped: skipped.length,
      withBlockers: withBlockers.length,
      improved: improved.length,
      initiativesAtRisk: initiativesMarkedAtRisk.length,
      kpisTotal: kpiResults.length,
      kpisCompleted: kpisCompleted.length,
      kpisSkipped: kpisSkipped.length,
    };
  }, [results, kpiResults, initiativesMarkedAtRisk]);

  // Copy summary to clipboard
  const handleCopy = () => {
    const completedResults = results.filter(r => !r.skipped);
    const blockersResults = results.filter(r => r.blocker);

    const summary = `
# Check-in Semanal — ${new Date().toLocaleDateString('pt-BR')}
${cycleName ? `**Ciclo:** ${cycleName}` : ''}

## Resumo
- ✅ ${stats.completed} KRs atualizados
- ⏭️ ${stats.skipped} KRs pulados
- 🚧 ${stats.withBlockers} bloqueadores

## KRs Atualizados
${completedResults.map(r => `- **${r.krTitle}**: ${r.previousValue} → ${r.newValue} (${r.confidence === 'high' ? '🟢' : r.confidence === 'medium' ? '🟡' : '🔴'})${r.comment ? `\n  > ${r.comment}` : ''}`).join('\n')}

${blockersResults.length > 0 ? `## Bloqueadores\n${blockersResults.map(r => `- **${r.krTitle}**: ${r.blocker}`).join('\n')}` : ''}

${reflection?.impactSummary ? `## Reflexão\n${reflection.impactSummary}` : ''}

${reflection?.helpNeeded ? `## Preciso de ajuda\n${reflection.helpNeeded}` : ''}
`.trim();

    navigator.clipboard.writeText(summary);
    toast.success('Resumo copiado!');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-6 bg-gradient-to-r from-success-muted to-transparent border-b">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-success-muted">
            <PartyPopper className="h-6 w-6 text-success" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">Check-in concluído!</h3>
            <p className="text-muted-foreground">
              {cycleName && <span>{cycleName} • </span>}
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 grid grid-cols-4 gap-4 border-b bg-muted/20">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-2xl font-bold">{stats.completed}</span>
          </div>
          <p className="text-xs text-muted-foreground">Atualizados</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <SkipForward className="h-5 w-5" />
            <span className="text-2xl font-bold">{stats.skipped}</span>
          </div>
          <p className="text-xs text-muted-foreground">Pulados</p>
        </div>
        <div className="text-center">
          <div className={cn(
            "flex items-center justify-center gap-1",
            stats.withBlockers > 0 ? "text-warning" : "text-muted-foreground"
          )}>
            <AlertTriangle className="h-5 w-5" />
            <span className="text-2xl font-bold">{stats.withBlockers}</span>
          </div>
          <p className="text-xs text-muted-foreground">Bloqueadores</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-primary">
            <TrendingUp className="h-5 w-5" />
            <span className="text-2xl font-bold">{stats.improved}</span>
          </div>
          <p className="text-xs text-muted-foreground">Avançaram</p>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Updated KRs */}
          {stats.completed > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                KRs atualizados
              </h4>
              <div className="space-y-2">
                {results.filter(r => !r.skipped).map(result => {
                  const change = result.newValue - result.previousValue;
                  const isPositive = change > 0;
                  
                  return (
                    <div 
                      key={result.krId}
                      className="rounded-lg border p-3 bg-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{result.krTitle}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.objectiveTitle}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm">
                            {result.previousValue} → <span className="font-bold">{result.newValue}</span>
                          </span>
                          {change !== 0 && (
                            <Badge 
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                isPositive 
                                  ? "bg-status-green-muted text-status-green-muted-foreground"
                                  : "bg-status-red-muted text-status-red-muted-foreground"
                              )}
                            >
                              {isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                              {isPositive ? '+' : ''}{change}
                            </Badge>
                          )}
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              result.confidence && CONFIDENCE_COLORS[result.confidence as keyof typeof CONFIDENCE_COLORS]?.badge
                            )}
                          >
                            {result.confidence === 'high' ? '🟢' : result.confidence === 'medium' ? '🟡' : '🔴'}
                          </Badge>
                        </div>
                      </div>
                      {result.comment && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                          {result.comment}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* KPIs Updated */}
          {stats.kpisCompleted > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  KPIs atualizados
                </h4>
                <div className="space-y-2">
                  {kpiResults.filter(k => !k.skipped).map(kpi => (
                    <div 
                      key={kpi.kpiId}
                      className="rounded-lg border p-3 bg-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{kpi.kpiName}</p>
                          <p className="text-xs text-muted-foreground">
                            Ref: {new Date(kpi.referenceDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold">{kpi.newValue}</span>
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              kpi.confidence && CONFIDENCE_COLORS[kpi.confidence as keyof typeof CONFIDENCE_COLORS]?.badge
                            )}
                          >
                            {kpi.confidence === 'high' ? '🟢' : kpi.confidence === 'medium' ? '🟡' : '🔴'}
                          </Badge>
                        </div>
                      </div>
                      {kpi.notes && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                          {kpi.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Blockers */}
          {stats.withBlockers > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  Bloqueadores registrados
                </h4>
                <div className="space-y-2">
                  {results.filter(r => r.blocker).map(result => (
                    <div 
                      key={result.krId}
                      className="rounded-lg border border-status-orange/30 bg-status-orange-muted p-3"
                    >
                      <p className="font-medium text-sm">{result.krTitle}</p>
                      <p className="text-sm mt-1">{result.blocker}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Reflection */}
          {(reflection?.impactSummary || reflection?.helpNeeded) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Sua reflexão</h4>
                {reflection.impactSummary && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-sm">{reflection.impactSummary}</p>
                  </div>
                )}
                {reflection.helpNeeded && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <p className="text-xs font-medium text-primary mb-1">Pedido de ajuda</p>
                    <p className="text-sm">{reflection.helpNeeded}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar resumo
          </Button>
          
          <Button variant="outline" onClick={onViewOkrs}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver OKRs
          </Button>

          <Button onClick={onClose} className="flex-1">
            Fechar
            <X className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
