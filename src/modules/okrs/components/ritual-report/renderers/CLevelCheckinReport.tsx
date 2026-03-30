import { Crown, Target, MessageSquare } from 'lucide-react';
import { ReportSection, EmptyState } from './shared';

export function CLevelCheckinReport({ data }: { data: Record<string, any> }) {
  const strategicDecisions = data.strategicDecisions || '';
  const directives = data.directives || '';
  const reviewedOkrs = Array.isArray(data.reviewedOkrs) ? data.reviewedOkrs : [];

  const hasContent = strategicDecisions || directives || reviewedOkrs.length > 0;
  if (!hasContent) return <EmptyState message="Nenhum dado registrado neste check-in estratégico." />;

  return (
    <div className="space-y-4">
      {strategicDecisions && (
        <ReportSection title="Decisões estratégicas" icon={<Crown className="h-4 w-4" />}>
          <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{strategicDecisions}</p>
        </ReportSection>
      )}

      {directives && (
        <ReportSection title="Diretrizes" icon={<MessageSquare className="h-4 w-4" />}>
          <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{directives}</p>
        </ReportSection>
      )}

      {reviewedOkrs.length > 0 && (
        <ReportSection title={`OKRs revisados (${reviewedOkrs.length})`} icon={<Target className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {reviewedOkrs.map((okr: any, i: number) => (
              <div key={i} className="p-2 rounded border text-sm">
                {typeof okr === 'string' ? okr : okr.title || JSON.stringify(okr)}
              </div>
            ))}
          </div>
        </ReportSection>
      )}
    </div>
  );
}
