import { Badge } from '@/components/ui/badge';
import { Sparkles, ListChecks, Users, FileCheck2, CheckCircle2, Circle } from 'lucide-react';
import { ReportSection, EmptyState } from './shared';

const BLOCK_LABELS: Record<string, string> = {
  performance: 'Performance',
  projetos: 'Projetos',
  pessoas: 'Pessoas',
};

const CHECKLIST_LABELS: Record<string, string> = {
  'priorities-clear': 'Prioridades da semana estão claras',
  'decisions-have-owners': 'Decisões têm responsáveis',
  'people-signals-acknowledged': 'Sinais de pessoas endereçados',
  'next-weekly-scheduled': 'Próxima Weekly está agendada',
};

export function WeeklyReport({ data }: { data: Record<string, any> }) {
  const opening = data.executiveOpening || {};
  const summary = typeof opening.summary === 'string' ? opening.summary.trim() : '';
  const themes = Array.isArray(opening.themes) ? opening.themes : [];
  const prioritiesNotes = typeof data.prioritiesNotes === 'string' ? data.prioritiesNotes.trim() : '';
  const peopleNotes = typeof data.peopleNotes === 'string' ? data.peopleNotes.trim() : '';
  const closing = data.closing || {};
  const minutes = typeof closing.minutes === 'string' ? closing.minutes.trim() : '';
  const checklistEntries = closing.checklist && typeof closing.checklist === 'object'
    ? Object.entries(closing.checklist as Record<string, boolean>)
    : [];

  const hasContent =
    summary.length > 0 ||
    themes.length > 0 ||
    prioritiesNotes.length > 0 ||
    peopleNotes.length > 0 ||
    minutes.length > 0 ||
    checklistEntries.length > 0;

  if (!hasContent) {
    return <EmptyState message="Nenhum conteúdo registrado nesta Weekly." />;
  }

  return (
    <div className="space-y-4">
      {(summary || themes.length > 0) && (
        <ReportSection title="Abertura Executiva" icon={<Sparkles className="h-4 w-4" />}>
          <div className="space-y-2">
            {summary && (
              <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{summary}</p>
            )}
            {themes.map((theme: any, i: number) => (
              <div key={theme?.id || i} className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{theme?.title || 'Tema'}</span>
                  {theme?.block && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                      {BLOCK_LABELS[theme.block] || theme.block}
                    </Badge>
                  )}
                </div>
                {theme?.motivation && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{theme.motivation}</p>
                )}
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {prioritiesNotes && (
        <ReportSection title="Notas de Prioridades" icon={<ListChecks className="h-4 w-4" />}>
          <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{prioritiesNotes}</p>
        </ReportSection>
      )}

      {peopleNotes && (
        <ReportSection title="Notas de Pessoas" icon={<Users className="h-4 w-4" />}>
          <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{peopleNotes}</p>
        </ReportSection>
      )}

      {(minutes || checklistEntries.length > 0) && (
        <ReportSection title="Encerramento" icon={<FileCheck2 className="h-4 w-4" />}>
          <div className="space-y-2">
            {minutes && (
              <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{minutes}</p>
            )}
            {checklistEntries.length > 0 && (
              <div className="space-y-1">
                {checklistEntries.map(([key, checked]) => (
                  <div key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    {checked ? (
                      <CheckCircle2 className="h-4 w-4 text-status-green shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{CHECKLIST_LABELS[key] || key}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ReportSection>
      )}
    </div>
  );
}