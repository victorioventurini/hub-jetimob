import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Users, Link2, Calendar } from 'lucide-react';
import { ReportSection, EmptyState } from './shared';
import { cn } from '@/lib/utils';

const APPROVAL_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: 'Aprovado', color: 'bg-status-green-muted text-status-green' },
  approved_with_changes: { label: 'Aprovado c/ alterações', color: 'bg-status-amber-muted text-status-amber' },
  discarded: { label: 'Descartado', color: 'bg-destructive/10 text-destructive' },
  defer: { label: 'Adiado', color: 'bg-muted text-muted-foreground' },
};

export function QbrMeetingReport({ data }: { data: Record<string, any> }) {
  const approvals = Array.isArray(data.approvals) ? data.approvals : [];
  const crossCommitments = Array.isArray(data.crossCommitments) ? data.crossCommitments : [];
  const checklist = data.governanceChecklist || {};
  const nextThirtyDays = data.nextThirtyDays as { ceo?: string; coo?: string; cpto?: string } | undefined;

  const hasNextThirtyDays = nextThirtyDays && (nextThirtyDays.ceo || nextThirtyDays.coo || nextThirtyDays.cpto);
  const hasContent = approvals.length > 0 || crossCommitments.length > 0 || Object.keys(checklist).length > 0 || hasNextThirtyDays;
  if (!hasContent) return <EmptyState message="Nenhum dado registrado nesta reunião QBR." />;

  return (
    <div className="space-y-4">
      {/* Approvals */}
      {approvals.length > 0 && (
        <ReportSection title={`Aprovações (${approvals.length})`} icon={<Users className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {approvals.map((a: any, i: number) => {
              const st = APPROVAL_LABELS[a.status] || { label: a.status, color: 'bg-muted text-muted-foreground' };
              return (
                <div key={i} className="flex items-center gap-2 p-2 rounded border text-sm">
                  <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', st.color)}>
                    {st.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Time: {a.teamId?.slice(0, 8)}…</span>
                  {a.discardReason && (
                    <span className="text-xs text-destructive ml-auto">{a.discardReason}</span>
                  )}
                </div>
              );
            })}
          </div>
        </ReportSection>
      )}

      {/* Cross Commitments */}
      {crossCommitments.length > 0 && (
        <ReportSection title={`Compromissos cross-team (${crossCommitments.length})`} icon={<Link2 className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {crossCommitments.map((c: any, i: number) => (
              <div key={i} className="p-2 rounded border text-sm space-y-1">
                <p>{c.description}</p>
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>De: {c.fromTeamId?.slice(0, 8)}…</span>
                  <span>Para: {c.toTeamId?.slice(0, 8)}…</span>
                  {c.responsibleUserName && <span>Resp: {c.responsibleUserName}</span>}
                  {c.deadline && <span>Prazo: {c.deadline}</span>}
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Governance Checklist */}
      {Object.keys(checklist).length > 0 && (
        <ReportSection title="Checklist de governança" icon={<CheckCircle2 className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {[
              { key: 'allTeamsReviewed', label: 'Todos os times revisados' },
              { key: 'decisionsHaveOwners', label: 'Decisões têm responsáveis' },
              { key: 'dependenciesFormalized', label: 'Dependências formalizadas' },
              { key: 'feedbackLinkSent', label: 'Link de feedback enviado' },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-2 text-sm">
                <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${checklist[item.key] ? 'bg-status-green text-white' : 'bg-muted'}`}>
                  {checklist[item.key] && <CheckCircle2 className="h-3 w-3" />}
                </div>
                <span className={checklist[item.key] ? '' : 'text-muted-foreground'}>{item.label}</span>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Next 30 Days */}
      {hasNextThirtyDays && (
        <ReportSection title="Próximos 30 dias" icon={<Calendar className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {[
              { key: 'ceo', label: 'CEO' },
              { key: 'coo', label: 'COO' },
              { key: 'cpto', label: 'CPTO' },
            ].map(item => {
              const value = nextThirtyDays?.[item.key as keyof typeof nextThirtyDays];
              if (!value) return null;
              return (
                <div key={item.key} className="flex items-start gap-2 text-sm">
                  <span className="text-xs font-medium text-muted-foreground w-10 shrink-0">{item.label}:</span>
                  <span>{value}</span>
                </div>
              );
            })}
          </div>
        </ReportSection>
      )}
    </div>
  );
}
