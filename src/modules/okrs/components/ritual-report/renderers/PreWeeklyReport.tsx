import { Badge } from '@/components/ui/badge';
import { ListChecks, Users, MessageSquare } from 'lucide-react';
import { ReportSection, EmptyState } from './shared';

const CATEGORY_LABELS: Record<string, string> = {
  performance: 'Performance',
  projetos: 'Projetos',
  pessoas: 'Pessoas',
};

const SIGNAL_LABELS: Record<string, string> = {
  celebracao: 'Celebração',
  risco: 'Risco',
  mudanca: 'Mudança',
  feedback: 'Feedback',
};

export function PreWeeklyReport({ data }: { data: Record<string, any> }) {
  const topics = Array.isArray(data.topics) ? data.topics : [];
  const peopleSignals = Array.isArray(data.peopleSignals) ? data.peopleSignals : [];
  const sourcesReflection = typeof data.sourcesReflection === 'string' ? data.sourcesReflection.trim() : '';

  const hasContent = topics.length > 0 || peopleSignals.length > 0 || sourcesReflection.length > 0;

  if (!hasContent) {
    return <EmptyState message="Nenhum tema ou sinal de pessoas registrado neste Pré-Weekly." />;
  }

  return (
    <div className="space-y-4">
      {topics.length > 0 && (
        <ReportSection title={`Pauta levada à Weekly (${topics.length})`} icon={<ListChecks className="h-4 w-4" />}>
          <div className="space-y-2">
            {topics.map((topic: any, i: number) => (
              <div key={topic?.id || i} className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{topic?.title || 'Sem título'}</span>
                  {topic?.category && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                      {CATEGORY_LABELS[topic.category] || topic.category}
                    </Badge>
                  )}
                </div>
                {topic?.context && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{topic.context}</p>
                )}
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {peopleSignals.length > 0 && (
        <ReportSection title={`Sinais de Pessoas (${peopleSignals.length})`} icon={<Users className="h-4 w-4" />}>
          <div className="space-y-2">
            {peopleSignals.map((sig: any, i: number) => (
              <div key={sig?.id || i} className="rounded-lg border bg-muted/30 p-3 space-y-1">
                {sig?.type && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {SIGNAL_LABELS[sig.type] || sig.type}
                  </Badge>
                )}
                {sig?.description && (
                  <p className="text-sm whitespace-pre-wrap break-words">{sig.description}</p>
                )}
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {sourcesReflection && (
        <ReportSection title="Reflexão inicial" icon={<MessageSquare className="h-4 w-4" />}>
          <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{sourcesReflection}</p>
        </ReportSection>
      )}
    </div>
  );
}