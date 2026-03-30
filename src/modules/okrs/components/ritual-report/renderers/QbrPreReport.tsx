import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Target, BarChart3, BookOpen, Link2 } from 'lucide-react';
import { ReportSection, EmptyState, RagBadge, formatValue } from './shared';
import { cn } from '@/lib/utils';

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  exceeded: { label: 'Superado', color: 'bg-status-green-muted text-status-green' },
  on_track: { label: 'No ritmo', color: 'bg-status-green-muted text-status-green' },
  stagnant: { label: 'Estagnado', color: 'bg-status-amber-muted text-status-amber' },
  not_started: { label: 'Não iniciado', color: 'bg-muted text-muted-foreground' },
  at_risk: { label: 'Em risco', color: 'bg-destructive/10 text-destructive' },
};

export function QbrPreReport({ data }: { data: Record<string, any> }) {
  const krFinalStates = Array.isArray(data.krFinalStates) ? data.krFinalStates : [];
  const kpiSnapshots = Array.isArray(data.kpiSnapshots) ? data.kpiSnapshots : [];
  const learnings = data.learnings || {};
  const proposedOkrs = Array.isArray(data.proposedOkrs) ? data.proposedOkrs : [];
  const dependencies = Array.isArray(data.dependencies) ? data.dependencies : [];

  return (
    <div className="space-y-4">
      {/* KR Final States */}
      {krFinalStates.length > 0 && (
        <ReportSection title={`Estado final dos KRs (${krFinalStates.length})`} icon={<Target className="h-4 w-4" />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KR</TableHead>
                <TableHead className="w-20 text-right">Progresso</TableHead>
                <TableHead className="w-28">Estado</TableHead>
                <TableHead className="w-24">Ritmo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {krFinalStates.map((kr: any, i: number) => {
                const st = STATE_LABELS[kr.state] || { label: kr.state, color: 'bg-muted text-muted-foreground' };
                return (
                  <TableRow key={kr.krId || i}>
                    <TableCell className="text-sm">{kr.krTitle}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{kr.finalProgress ?? 0}%</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', st.color)}>
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{kr.paceStatus}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ReportSection>
      )}

      {/* KPI Snapshots */}
      {kpiSnapshots.length > 0 && (
        <ReportSection title={`KPIs (${kpiSnapshots.length})`} icon={<BarChart3 className="h-4 w-4" />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KPI</TableHead>
                <TableHead className="w-24 text-right">Valor</TableHead>
                <TableHead className="w-24 text-right">Meta</TableHead>
                <TableHead className="w-20">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiSnapshots.map((kpi: any, i: number) => (
                <TableRow key={kpi.kpiId || i}>
                  <TableCell className="text-sm">{kpi.name}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatValue(kpi.currentValue, kpi.unit)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{formatValue(kpi.target, kpi.unit)}</TableCell>
                  <TableCell><RagBadge status={kpi.ragStatus} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportSection>
      )}

      {/* Learnings */}
      {(learnings.whatWorked || learnings.whatDidntWork || learnings.debts) && (
        <ReportSection title="Aprendizados" icon={<BookOpen className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-3">
            {learnings.whatWorked && (
              <div className="p-3 rounded-lg border bg-status-green-muted/30 space-y-1">
                <span className="text-xs font-medium text-status-green">O que funcionou</span>
                <p className="text-sm">{learnings.whatWorked}</p>
              </div>
            )}
            {learnings.whatDidntWork && (
              <div className="p-3 rounded-lg border bg-destructive/5 space-y-1">
                <span className="text-xs font-medium text-destructive">O que não funcionou</span>
                <p className="text-sm">{learnings.whatDidntWork}</p>
              </div>
            )}
            {learnings.debts && (
              <div className="p-3 rounded-lg border bg-status-amber-muted/30 space-y-1">
                <span className="text-xs font-medium text-status-amber">Débitos</span>
                <p className="text-sm">{learnings.debts}</p>
              </div>
            )}
          </div>
        </ReportSection>
      )}

      {/* Proposed OKRs */}
      {proposedOkrs.length > 0 && (
        <ReportSection title={`OKRs propostos (${proposedOkrs.length})`} icon={<Target className="h-4 w-4" />}>
          <div className="space-y-2">
            {proposedOkrs.map((entry: any) => (
              <div key={entry.id} className="p-3 rounded-lg border space-y-1">
                <span className="text-sm font-medium">{entry.objective?.title || 'Sem título'}</span>
                {entry.objective?.description && (
                  <p className="text-xs text-muted-foreground">{entry.objective.description}</p>
                )}
                {Array.isArray(entry.draftKrs) && entry.draftKrs.length > 0 && (
                  <div className="pl-3 border-l-2 border-muted mt-2 space-y-1">
                    {entry.draftKrs.map((kr: any, j: number) => (
                      <p key={j} className="text-xs text-muted-foreground">{kr.title || `KR ${j + 1}`}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Dependencies */}
      {dependencies.length > 0 && (
        <ReportSection title={`Dependências (${dependencies.length})`} icon={<Link2 className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {dependencies.map((dep: any, i: number) => (
              <div key={dep.id || i} className="p-2 rounded border text-sm">
                {dep.description || JSON.stringify(dep)}
              </div>
            ))}
          </div>
        </ReportSection>
      )}
    </div>
  );
}
