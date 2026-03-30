import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Target } from 'lucide-react';
import { ReportSection, EmptyState } from './shared';

export function TeamCheckinReport({ data }: { data: Record<string, any> }) {
  const reviewedKrs = Array.isArray(data.reviewedKrs) ? data.reviewedKrs : [];
  const checklist = data.checklist || {};

  const checklistItems = [
    { key: 'knowWhatToFocus', label: 'O time sabe no que focar?' },
    { key: 'knowWhatNotToDo', label: 'O time sabe o que NÃO fazer?' },
    { key: 'knowWhoIsResponsible', label: 'O time sabe quem é responsável?' },
  ];

  return (
    <div className="space-y-4">
      {/* Reviewed KRs */}
      {reviewedKrs.length > 0 && (
        <ReportSection title={`KRs revisados (${reviewedKrs.length})`} icon={<Target className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {reviewedKrs.map((kr: any, i: number) => (
              <div key={kr.krId || i} className="flex items-center gap-2 text-sm p-2 rounded border">
                <span className="flex-1 truncate">{kr.title || kr.krId?.slice(0, 8)}</span>
                {kr.status && (
                  <Badge variant="outline" className="text-[10px]">{kr.status}</Badge>
                )}
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Checklist */}
      <ReportSection title="Checklist de encerramento" icon={<CheckCircle2 className="h-4 w-4" />}>
        <div className="space-y-1.5">
          {checklistItems.map(item => (
            <div key={item.key} className="flex items-center gap-2 text-sm">
              <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${checklist[item.key] ? 'bg-status-green text-white' : 'bg-muted'}`}>
                {checklist[item.key] && <CheckCircle2 className="h-3 w-3" />}
              </div>
              <span className={checklist[item.key] ? '' : 'text-muted-foreground'}>{item.label}</span>
            </div>
          ))}
        </div>
      </ReportSection>
    </div>
  );
}
