/**
 * EvaluationSummary — 4 medidores + 2 listas de citações pós-fechamento
 * Apresentacional puro.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EvaluationDimension {
  key: 'value' | 'quality' | 'decisions' | 'time';
  label: string;
  avg: number | null;
}

export interface EvaluationSummaryProps {
  responseCount: number;
  expectedCount: number;
  dimensions: EvaluationDimension[];
  changeOneThingAnswers: string[];
  whatWorkedAnswers: string[];
  showWhatWorked: boolean;
}

function ScoreBar({ value }: { value: number | null }) {
  const pct = value === null ? 0 : (value / 5) * 100;
  const color =
    value === null
      ? 'bg-muted'
      : value >= 4
        ? 'bg-success'
        : value >= 3
          ? 'bg-warning'
          : 'bg-destructive';
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className={cn('h-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EvaluationSummary({
  responseCount,
  expectedCount,
  dimensions,
  changeOneThingAnswers,
  whatWorkedAnswers,
  showWhatWorked,
}: EvaluationSummaryProps) {
  if (responseCount === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma resposta registrada nesta coleta.
        </CardContent>
      </Card>
    );
  }

  const scored = dimensions.filter((d) => d.avg !== null) as Array<EvaluationDimension & { avg: number }>;
  const overallAvg =
    scored.length > 0 ? scored.reduce((sum, d) => sum + d.avg, 0) / scored.length : null;
  const overallColor =
    overallAvg === null
      ? 'text-muted-foreground'
      : overallAvg >= 4
        ? 'text-success'
        : overallAvg >= 3
          ? 'text-warning'
          : 'text-destructive';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4" />
            Resultado anônimo · {responseCount}
            {expectedCount > 0 && ` de ${expectedCount} presentes`} respondeu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline justify-between rounded-lg border bg-muted/30 p-3">
            <span className="text-sm font-semibold">Avaliação média do rito</span>
            <span className={cn('font-mono text-lg font-semibold', overallColor)}>
              {overallAvg === null ? '—' : `${overallAvg.toFixed(2)} / 5`}
            </span>
          </div>
          {dimensions.map((dim) => (
            <div key={dim.key} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{dim.label}</span>
                <span className="font-mono text-foreground">
                  {dim.avg === null ? '—' : `${dim.avg.toFixed(2)} / 5`}
                </span>
              </div>
              <ScoreBar value={dim.avg} />
            </div>
          ))}
        </CardContent>
      </Card>

      {changeOneThingAnswers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Se eu pudesse mudar uma coisa…
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {changeOneThingAnswers.map((text, i) => (
                <li key={i} className="text-sm rounded-lg border bg-muted/20 p-3">
                  {text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {showWhatWorked && whatWorkedAnswers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              O que funcionou e merece repetir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {whatWorkedAnswers.map((text, i) => (
                <li key={i} className="text-sm rounded-lg border bg-muted/20 p-3">
                  {text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
