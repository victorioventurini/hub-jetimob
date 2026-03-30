/**
 * ProposalValidationCard - Exibe feedback do Validador Metodológico de OKRs
 *
 * Usado no QBR Pre → Proposta de OKRs para dar feedback inline
 * sobre a qualidade do rascunho de OKR antes de submeter.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  Sparkles,
  Loader2,
  Target,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiAssessment } from '@/modules/okrs/types/construction-review';

// ============================================================
// TYPES
// ============================================================

interface ProposalValidationCardProps {
  assessment: AiAssessment | null;
  isLoading: boolean;
  error: string | null;
  onValidate: () => void;
  onReset: () => void;
  canValidate: boolean;
}

// ============================================================
// SCORE HELPERS
// ============================================================

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-status-amber';
  return 'text-destructive';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-success/10';
  if (score >= 60) return 'bg-status-amber/10';
  return 'bg-destructive/10';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Boa construção';
  if (score >= 60) return 'Precisa de ajustes';
  return 'Requer atenção';
}

// ============================================================
// COMPONENT
// ============================================================

export function ProposalValidationCard({
  assessment,
  isLoading,
  error,
  onValidate,
  onReset,
  canValidate,
}: ProposalValidationCardProps) {
  // ── Loading state ──
  if (isLoading) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive truncate">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onValidate} className="shrink-0 text-xs gap-1">
              <RefreshCcw className="h-3 w-3" /> Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── No assessment yet → CTA ──
  if (!assessment) {
    return (
      <Card className="border-dashed border-primary/40">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Validador Metodológico</p>
                <p className="text-xs text-muted-foreground">
                  A IA avalia clareza, mensurabilidade e alinhamento do OKR
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onValidate}
              disabled={!canValidate}
              className="shrink-0 text-xs gap-1 border-primary/40 hover:bg-primary/5"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Validar com IA
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Assessment results ──
  const { overallScore, summary, strengths, improvements, criteriaScores, krFeedback } = assessment;

  return (
    <Card className={cn('transition-colors', getScoreBg(overallScore))}>
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Validação Metodológica
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs font-bold', getScoreColor(overallScore))}>
              {overallScore}/100
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {getScoreLabel(overallScore)}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onReset} title="Revalidar">
              <RefreshCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Summary */}
        <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>

        {/* Criteria scores */}
        {criteriaScores && (
          <div className="grid grid-cols-5 gap-2">
            {(['clarity', 'measurability', 'ambition', 'alignment', 'ownership'] as const).map(key => {
              const criteria = criteriaScores[key];
              if (!criteria) return null;
              const labels: Record<string, string> = {
                clarity: 'Clareza',
                measurability: 'Mensurabilidade',
                ambition: 'Ambição',
                alignment: 'Alinhamento',
                ownership: 'Responsabilidade',
              };
              return (
                <div key={key} className="text-center space-y-1">
                  <p className="text-[10px] text-muted-foreground truncate">{labels[key]}</p>
                  <Progress
                    value={criteria.score}
                    className="h-1.5"
                  />
                  <p className={cn('text-[10px] font-medium', getScoreColor(criteria.score))}>
                    {criteria.score}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Strengths & Improvements */}
        {(strengths.length > 0 || improvements.length > 0) && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              {strengths.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Pontos fortes
                  </p>
                  <ul className="space-y-0.5">
                    {strengths.slice(0, 3).map((s, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground leading-tight">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {improvements.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-status-amber flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Melhorias
                  </p>
                  <ul className="space-y-0.5">
                    {improvements.slice(0, 3).map((s, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground leading-tight">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {/* KR-level feedback */}
        {krFeedback && krFeedback.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> Feedback por KR
              </p>
              {krFeedback.map((kr) => (
                <div
                  key={kr.krId}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-[11px] space-y-0.5',
                    kr.isTask ? 'bg-destructive/5 border border-destructive/20' : 'bg-muted/50',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{kr.krTitle || 'KR sem título'}</p>
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', getScoreColor(kr.score))}>
                      {kr.score}
                    </Badge>
                  </div>
                  {kr.isTask && (
                    <p className="text-destructive text-[10px]">⚠ Parece mais uma tarefa do que um resultado-chave</p>
                  )}
                  {kr.improvements.length > 0 && (
                    <ul className="text-muted-foreground">
                      {kr.improvements.slice(0, 2).map((imp, i) => (
                        <li key={i}>→ {imp}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
