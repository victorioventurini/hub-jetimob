import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Target, Link2, FileText, CalendarDays } from 'lucide-react';
import { ReportSection, EmptyState } from './shared';

export function QbrPostReport({ data }: { data: Record<string, any> }) {
  const promotedOkrIds = Array.isArray(data.promotedOkrIds) ? data.promotedOkrIds : [];
  const crossCommitments = Array.isArray(data.crossCommitments) ? data.crossCommitments : [];
  const executiveMinutes = data.executiveMinutes || '';
  const followUpCadence = data.followUpCadence || {};
  const checklist = data.governanceChecklist || {};

  const hasContent = promotedOkrIds.length > 0 || crossCommitments.length > 0 ||
    executiveMinutes || Object.keys(checklist).length > 0;

  if (!hasContent) return <EmptyState message="Nenhum dado registrado neste pós-QBR." />;

  return (
    <div className="space-y-4">
      {/* Promoted OKRs */}
      {promotedOkrIds.length > 0 && (
        <ReportSection title={`OKRs promovidos (${promotedOkrIds.length})`} icon={<Target className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-2">
            {promotedOkrIds.map((id: string) => (
              <Badge key={id} variant="secondary" className="text-xs">
                {id.slice(0, 8)}…
              </Badge>
            ))}
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
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {c.deadline && <span>Prazo: {c.deadline}</span>}
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Executive Minutes */}
      {executiveMinutes && (
        <ReportSection title="Ata executiva" icon={<FileText className="h-4 w-4" />}>
          <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{executiveMinutes}</p>
        </ReportSection>
      )}

      {/* Follow-up Cadence */}
      {(followUpCadence.mbrReviewScheduled || followUpCadence.followUpMeetingDate) && (
        <ReportSection title="Cadência de follow-up" icon={<CalendarDays className="h-4 w-4" />}>
          <div className="space-y-1 text-sm">
            {followUpCadence.mbrReviewScheduled && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-status-green" />
                <span>Revisão no MBR agendada</span>
              </div>
            )}
            {followUpCadence.followUpMeetingDate && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Reunião de follow-up: {followUpCadence.followUpMeetingDate}</span>
              </div>
            )}
          </div>
        </ReportSection>
      )}

      {/* Governance Checklist */}
      {Object.keys(checklist).length > 0 && (
        <ReportSection title="Checklist de governança" icon={<CheckCircle2 className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {[
              { key: 'strategicFocusClear', label: 'Foco estratégico claro' },
              { key: 'decisionsHaveOwners', label: 'Decisões têm responsáveis' },
              { key: 'dependenciesFormalized', label: 'Dependências formalizadas' },
              { key: 'nextCycleOkrsActive', label: 'OKRs do próximo ciclo ativados' },
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
    </div>
  );
}
