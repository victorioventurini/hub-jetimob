import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Target } from 'lucide-react';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { okrsKeys } from '@/lib/queryKeys/okrs';
import { ReportSection, EmptyState } from './shared';

/**
 * Resolve KR IDs to titles. reviewedKrs is stored as plain UUID strings.
 */
function useKrTitles(krIds: string[]) {
  const { client: supabase, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: okrsKeys.krTitlesForReport(krIds),
    queryFn: async () => {
      if (!supabase || !buId || krIds.length === 0) return {};
      const { data, error } = await supabase
        .from('okr_team_key_results')
        .select('id, title')
        .in('id', krIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((kr) => { map[kr.id] = kr.title; });
      return map;
    },
    enabled: !!supabase && !!buId && krIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function TeamCheckinReport({ data }: { data: Record<string, any> }) {
  const rawKrs = Array.isArray(data.reviewedKrs) ? data.reviewedKrs : [];
  const checklist = data.checklist || {};

  // Normalize: may be plain UUID strings or objects with { krId, title }
  const isPlainIds = rawKrs.length > 0 && typeof rawKrs[0] === 'string';
  const krIds = isPlainIds ? rawKrs as string[] : rawKrs.map((kr: any) => kr.krId).filter(Boolean);

  const { data: titleMap = {} } = useKrTitles(isPlainIds ? krIds : []);

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
              const id = isPlainIds ? kr : kr.krId;
              const title = isPlainIds ? titleMap[kr] : kr.title;
              return (
                <div key={id || i} className="flex items-center gap-2 text-sm p-2 rounded border">
                  <span className="flex-1 truncate">{title || id?.slice(0, 8) || '—'}</span>
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
