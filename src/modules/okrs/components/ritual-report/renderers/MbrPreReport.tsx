/**
 * MbrPreReport - Renderer para histórico do Pré-MBR
 *
 * Onda 4 Fase 2: nomes (KR/KPI) resolvidos via useEntityLookup com fallback
 * ao snapshot legado.
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Target, BarChart3, AlertTriangle, Compass, MessageSquareQuote } from 'lucide-react';
import { ReportSection, RagBadge, formatValue } from './shared';
import { useEntityLookup, resolveName } from '@/modules/okrs/hooks/useEntityLookup';
import { cn } from '@/lib/utils';

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  exceeded: { label: 'Superado', color: 'bg-status-green-muted text-status-green' },
  achieved: { label: 'Alcançado', color: 'bg-status-green-muted text-status-green' },
  healthy: { label: 'Saudável', color: 'bg-status-green-muted text-status-green' },
  on_track: { label: 'No ritmo', color: 'bg-status-green-muted text-status-green' },
  stagnant: { label: 'Estagnado', color: 'bg-status-amber-muted text-status-amber' },
  at_risk: { label: 'Em risco', color: 'bg-destructive/10 text-destructive' },
  off_track: { label: 'Fora da meta', color: 'bg-destructive/10 text-destructive' },
  not_started: { label: 'Não iniciado', color: 'bg-muted text-muted-foreground' },
  not_achieved: { label: 'Não alcançado', color: 'bg-destructive/10 text-destructive' },
};

export function MbrPreReport({ data }: { data: Record<string, any> }) {
  const krFinalStates = Array.isArray(data.krFinalStates) ? data.krFinalStates : [];
  const kpiSnapshots = Array.isArray(data.kpiSnapshots) ? data.kpiSnapshots : [];
  const highlights = data.highlights || {};
  const nextSteps = data.nextSteps || {};
  const prioritizedItems = Array.isArray(nextSteps.prioritizedItems) ? nextSteps.prioritizedItems : [];
  const crossDependencies = Array.isArray(nextSteps.crossDependencies) ? nextSteps.crossDependencies : [];
  const krJustifications: Record<string, string> = (data.krJustifications && typeof data.krJustifications === 'object')
    ? data.krJustifications
    : {};
  const krJustEntries = Object.entries(krJustifications).filter(([, v]) => typeof v === 'string' && v.trim().length > 0);

  const krIds: string[] = krFinalStates.map((kr: any) => kr?.krId).filter(Boolean);
  const kpiIds: string[] = kpiSnapshots.map((kpi: any) => kpi?.kpiId).filter(Boolean);
  const allKrIds = Array.from(new Set([...krIds, ...krJustEntries.map(([id]) => id)]));

  const lookups = useEntityLookup({
    teamKrIds: allKrIds,
    orgKrIds: allKrIds,
    kpiIds,
  });

  const resolveKr = (id?: string, legacy?: string) => {
    const t = id ? lookups.teamKrs.get(id) : undefined;
    if (t?.name) return t.name;
    const o = id ? lookups.orgKrs.get(id) : undefined;
    if (o?.name) return o.name;
    return legacy ?? '(removido)';
  };

  return (
    <div className="space-y-4">
      {/* KR Final States */}
      {krFinalStates.length > 0 && (
        <ReportSection title={`Balanço do Mês — KRs (${krFinalStates.length})`} icon={<Target className="h-4 w-4" />}>
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
                    <TableCell className="text-sm">{resolveKr(kr.krId, kr.krTitle)}</TableCell>
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
                  <TableCell className="text-sm">{resolveName(lookups.kpis, kpi.kpiId, kpi.name)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatValue(kpi.currentValue, kpi.unit)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{formatValue(kpi.target, kpi.unit)}</TableCell>
                  <TableCell><RagBadge status={kpi.ragStatus} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportSection>
      )}

      {/* Highlights */}
      {(highlights.accelerated || highlights.blocked || highlights.needsDecision) && (
        <ReportSection title="Destaques e Riscos" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-3">
            {highlights.accelerated && (
              <div className="p-3 rounded-lg border bg-status-green-muted/30 space-y-1">
                <span className="text-xs font-medium text-status-green">O que acelerou</span>
                <p className="text-sm">{highlights.accelerated}</p>
              </div>
            )}
            {highlights.blocked && (
              <div className="p-3 rounded-lg border bg-destructive/5 space-y-1">
                <span className="text-xs font-medium text-destructive">O que travou</span>
                <p className="text-sm">{highlights.blocked}</p>
              </div>
            )}
            {highlights.needsDecision && (
              <div className="p-3 rounded-lg border bg-status-amber-muted/30 space-y-1">
                <span className="text-xs font-medium text-status-amber">Precisa de decisão</span>
                <p className="text-sm">{highlights.needsDecision}</p>
              </div>
            )}
          </div>
        </ReportSection>
      )}

      {/* Next Steps */}
      {(nextSteps.focus || prioritizedItems.length > 0 || crossDependencies.length > 0) && (
        <ReportSection title="Próximos Passos" icon={<Compass className="h-4 w-4" />}>
          <div className="space-y-3">
            {nextSteps.focus && (
              <div className="p-3 rounded-lg border space-y-1">
                <span className="text-xs font-medium">Foco do próximo mês</span>
                <p className="text-sm">{nextSteps.focus}</p>
              </div>
            )}
            {prioritizedItems.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium">Itens priorizados</span>
                {prioritizedItems.map((item: string, i: number) => (
                  <p key={i} className="text-sm text-muted-foreground pl-3">
                    {i + 1}. {item}
                  </p>
                ))}
              </div>
            )}
            {crossDependencies.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium">Dependências cross-team</span>
                {crossDependencies.map((dep: string, i: number) => (
                  <p key={i} className="text-sm text-muted-foreground pl-3">• {dep}</p>
                ))}
              </div>
            )}
          </div>
        </ReportSection>
      )}
    </div>
  );
}
