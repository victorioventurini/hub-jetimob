import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Target } from 'lucide-react';
import { useEntityLookup, resolveName } from '@/modules/okrs/hooks/useEntityLookup';
import { ReportSection, EmptyState } from './shared';

/**
 * Onda 4 Fase 2: usa `useEntityLookup` canônico para resolver KR titles em runtime.
 * Mantém compatibilidade com snapshots antigos que gravavam `{ krId, title, status }`.
 */
export function TeamCheckinReport({ data }: { data: Record<string, any> }) {
  const rawKrs = Array.isArray(data.reviewedKrs) ? data.reviewedKrs : [];
  const checklist = data.checklist || {};

  // Normalize: pode ser UUID string ou objeto { krId, title, status }
  const isPlainIds = rawKrs.length > 0 && typeof rawKrs[0] === 'string';
  const krIds: string[] = isPlainIds
    ? (rawKrs as string[])
    : rawKrs.map((kr: any) => kr.krId).filter(Boolean);

  const lookups = useEntityLookup({ teamKrIds: krIds });

  const checklistItems = [
    { key: 'knowWhatToFocus', label: 'O time sabe no que focar?' },
    { key: 'knowWhatNotToDo', label: 'O time sabe o que NÃO fazer?' },
    { key: 'knowWhoIsResponsible', label: 'O time sabe quem é responsável?' },
  ];

  return (
    <div className="space-y-4">
      {/* Reviewed KRs */}
      {rawKrs.length > 0 && (
        <ReportSection title={`KRs revisados (${rawKrs.length})`} icon={<Target className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {rawKrs.map((kr: any, i: number) => {
              const id: string | undefined = isPlainIds ? kr : kr.krId;
              const legacyTitle: string | undefined = isPlainIds ? undefined : kr.title;
              const title = resolveName(lookups.teamKrs, id, legacyTitle);
              return (
                <div key={id || i} className="flex items-center gap-2 text-sm p-2 rounded border">
                  <span className="flex-1 truncate">{title}</span>
                  {!isPlainIds && kr.status && (
                    <Badge variant="outline" className="text-[10px]">{kr.status}</Badge>
                  )}
                </div>
              );
            })}
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
