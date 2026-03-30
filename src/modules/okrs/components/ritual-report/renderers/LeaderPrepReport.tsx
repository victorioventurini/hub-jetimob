import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Settings2, MessageSquare, BarChart3 } from 'lucide-react';
import { ReportSection, EmptyState } from './shared';

const ACTION_LABELS: Record<string, string> = {
  discuss_group: 'Discutir em grupo',
  followup_1on1: 'Follow-up 1:1',
  at_risk: 'Em risco',
  needs_attention: 'Precisa atenção',
};

export function LeaderPrepReport({ data }: { data: Record<string, any> }) {
  const krActions = Array.isArray(data.krActions) ? data.krActions : [];
  const meetingNotes = data.meetingNotes || '';
  const kpisForDiscussion = Array.isArray(data.kpisForDiscussion) ? data.kpisForDiscussion : [];
  const kpisForFollowup = Array.isArray(data.kpisForFollowup) ? data.kpisForFollowup : [];

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
                  <TableCell className="text-sm">{a.krId?.slice(0, 8) ?? '—'}</TableCell>
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
              <Badge key={id} variant="secondary" className="text-xs">{id.slice(0, 8)}…</Badge>
            ))}
          </div>
        </ReportSection>
      )}

      {/* KPIs for followup */}
      {kpisForFollowup.length > 0 && (
        <ReportSection title={`KPIs para acompanhamento (${kpisForFollowup.length})`}>
          <div className="flex flex-wrap gap-2">
            {kpisForFollowup.map((id: string) => (
              <Badge key={id} variant="outline" className="text-xs">{id.slice(0, 8)}…</Badge>
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
