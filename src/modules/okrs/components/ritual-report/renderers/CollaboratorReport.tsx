import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Target, BarChart3, MessageSquare, AlertTriangle } from 'lucide-react';
import { useEntityLookup, resolveName } from '@/modules/okrs/hooks/useEntityLookup';
import { ReportSection, EmptyState, ConfidenceBadge } from './shared';

/** Onda 4 Fase 2: nomes (KR/Objetivo/KPI) resolvidos via useEntityLookup. */
export function CollaboratorReport({ data }: { data: Record<string, any> }) {
  const results = Array.isArray(data.results) ? data.results : [];
  const kpiResults = Array.isArray(data.kpiResults) ? data.kpiResults : [];
  const reflection = data.reflection || {};
  const atRisk = Array.isArray(data.initiativesMarkedAtRisk) ? data.initiativesMarkedAtRisk : [];

  const krIds: string[] = results.map((r: any) => r?.krId).filter(Boolean);
  const objectiveIds: string[] = results.map((r: any) => r?.objectiveId).filter(Boolean);
  const kpiIds: string[] = kpiResults.map((k: any) => k?.kpiId).filter(Boolean);

  const lookups = useEntityLookup({
    teamKrIds: krIds,
    teamObjectiveIds: objectiveIds,
    kpiIds,
  });

  return (
    <div className="space-y-4">
      {/* KR Check-ins */}
      <ReportSection title={`Check-in de KRs (${results.length})`} icon={<Target className="h-4 w-4" />}>
        {results.length === 0 ? <EmptyState /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KR</TableHead>
                <TableHead className="w-20 text-right">Anterior</TableHead>
                <TableHead className="w-20 text-right">Novo</TableHead>
                <TableHead className="w-20">Confiança</TableHead>
                <TableHead>Comentário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r: any, i: number) => (
                <TableRow key={r.krId || i}>
                  <TableCell className="text-sm">
                    <div>{resolveName(lookups.teamKrs, r.krId, r.krTitle)}</div>
                    {(r.objectiveId || r.objectiveTitle) && (
                      <span className="text-xs text-muted-foreground">
                        {resolveName(lookups.teamObjectives, r.objectiveId, r.objectiveTitle, '')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">{r.previousValue ?? '—'}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{r.newValue ?? '—'}</TableCell>
                  <TableCell><ConfidenceBadge level={r.confidence} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {r.comment || (r.skipped ? 'Pulado' : '—')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ReportSection>

      {/* KPI Check-ins */}
      {kpiResults.length > 0 && (
        <ReportSection title={`Check-in de KPIs (${kpiResults.length})`} icon={<BarChart3 className="h-4 w-4" />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KPI</TableHead>
                <TableHead className="w-24 text-right">Valor</TableHead>
                <TableHead className="w-20">Confiança</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiResults.map((k: any, i: number) => (
                <TableRow key={k.kpiId || i}>
                  <TableCell className="text-sm">{resolveName(lookups.kpis, k.kpiId, k.kpiName)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{k.newValue ?? '—'}</TableCell>
                  <TableCell><ConfidenceBadge level={k.confidence} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{k.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportSection>
      )}

      {/* Reflection */}
      {(reflection.impactSummary || reflection.helpNeeded) && (
        <ReportSection title="Reflexão" icon={<MessageSquare className="h-4 w-4" />}>
          <div className="space-y-2 text-sm">
            {reflection.impactSummary && (
              <div>
                <span className="text-muted-foreground">Impacto da semana: </span>
                <span>{reflection.impactSummary}</span>
              </div>
            )}
            {reflection.helpNeeded && (
              <div>
                <span className="text-muted-foreground">Preciso de ajuda com: </span>
                <span>{reflection.helpNeeded}</span>
              </div>
            )}
          </div>
        </ReportSection>
      )}

      {/* At-risk initiatives */}
      {atRisk.length > 0 && (
        <ReportSection title={`Iniciativas em risco (${atRisk.length})`} icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-2">
            {atRisk.map((id: string) => (
              <Badge key={id} variant="outline" className="text-xs bg-destructive/10 text-destructive">
                {id.slice(0, 8)}…
              </Badge>
            ))}
          </div>
        </ReportSection>
      )}
    </div>
  );
}
