import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Settings2, MessageSquare, BarChart3 } from 'lucide-react';
import { useEntityLookup, resolveName } from '@/modules/okrs/hooks/useEntityLookup';
import { ReportSection, EmptyState } from './shared';

const ACTION_LABELS: Record<string, string> = {
  discuss_group: 'Discutir em grupo',
  followup_1on1: 'Follow-up 1:1',
  at_risk: 'Em risco',
  needs_attention: 'Precisa atenção',
};

/**
 * Onda 4 Fase 2: resolve nomes (KR / KPI) em runtime via `useEntityLookup`,
 * substituindo os antigos slices de UUID.
 */
export function LeaderPrepReport({ data }: { data: Record<string, any> }) {
  const krActions = Array.isArray(data.krActions) ? data.krActions : [];
  const meetingNotes = data.meetingNotes || '';
  const kpisForDiscussion: string[] = Array.isArray(data.kpisForDiscussion) ? data.kpisForDiscussion : [];
  const kpisForFollowup: string[] = Array.isArray(data.kpisForFollowup) ? data.kpisForFollowup : [];

  const krIds: string[] = krActions.map((a: any) => a?.krId).filter(Boolean);
  const kpiIds = Array.from(new Set([...kpisForDiscussion, ...kpisForFollowup].filter(Boolean)));

  const lookups = useEntityLookup({ teamKrIds: krIds, kpiIds });

  return (
    <div className="space-y-4">
      {/* KR Actions */}
      <ReportSection title={`Ações por KR (${krActions.length})`} icon={<Settings2 className="h-4 w-4" />}>
        {krActions.length === 0 ? <EmptyState /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KR</TableHead>
                <TableHead className="w-36">Ação</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {krActions.map((a: any, i: number) => (
                <TableRow key={a.krId || i}>
                  <TableCell className="text-sm">
                    {resolveName(lookups.teamKrs, a.krId, a.krTitle)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ACTION_LABELS[a.actionType] || a.actionType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ReportSection>

      {/* KPIs for discussion */}
      {kpisForDiscussion.length > 0 && (
        <ReportSection title={`KPIs para discussão (${kpisForDiscussion.length})`} icon={<BarChart3 className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-2">
            {kpisForDiscussion.map((id: string) => (
              <Badge key={id} variant="secondary" className="text-xs">
                {resolveName(lookups.kpis, id)}
              </Badge>
            ))}
          </div>
        </ReportSection>
      )}

      {/* KPIs for followup */}
      {kpisForFollowup.length > 0 && (
        <ReportSection title={`KPIs para acompanhamento (${kpisForFollowup.length})`}>
          <div className="flex flex-wrap gap-2">
            {kpisForFollowup.map((id: string) => (
              <Badge key={id} variant="outline" className="text-xs">
                {resolveName(lookups.kpis, id)}
              </Badge>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Meeting Notes */}
      {meetingNotes && (
        <ReportSection title="Notas da reunião" icon={<MessageSquare className="h-4 w-4" />}>
          <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{meetingNotes}</p>
        </ReportSection>
      )}
    </div>
  );
}
