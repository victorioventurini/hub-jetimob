import { Badge } from '@/components/ui/badge';
import { Crown, Target, MessageSquare, AlertTriangle } from 'lucide-react';
import { ReportSection, EmptyState } from './shared';
import { cn } from '@/lib/utils';

const FLAG_LABELS: Record<string, string> = {
  too_conservative: 'Muito conservador',
  too_aggressive: 'Muito agressivo',
  gap: 'Lacuna',
  overlap: 'Sobreposição',
};

const DIRECTIVE_LABELS: Record<string, string> = {
  strategic_question: 'Pergunta estratégica',
  hypothesis: 'Hipótese',
  non_priority: 'Não-prioridade',
  challenge: 'Desafio',
};

export function QbrCLevelReport({ data }: { data: Record<string, any> }) {
  const systemPatterns = data.systemPatterns || '';
  const strategicAnalysis = data.strategicAnalysis || {};
  const okrCalibrationFlags = Array.isArray(data.okrCalibrationFlags) ? data.okrCalibrationFlags : [];
  const directives = Array.isArray(data.directives) ? data.directives : [];

  const hasContent = systemPatterns || Object.values(strategicAnalysis).some(Boolean) ||
    okrCalibrationFlags.length > 0 || directives.length > 0;

  if (!hasContent) return <EmptyState message="Nenhum dado registrado neste pré-QBR C-Level." />;

  return (
    <div className="space-y-4">
      {/* System Patterns */}
      {systemPatterns && (
        <ReportSection title="Padrões sistêmicos" icon={<Crown className="h-4 w-4" />}>
          <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{systemPatterns}</p>
        </ReportSection>
      )}

      {/* Strategic Analysis */}
      {Object.values(strategicAnalysis).some(Boolean) && (
        <ReportSection title="Análise estratégica" icon={<Target className="h-4 w-4" />}>
          <div className="space-y-2">
            {strategicAnalysis.alignmentAssessment && (
              <div className="p-3 rounded-lg border space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Avaliação de alinhamento</span>
                <p className="text-sm">{strategicAnalysis.alignmentAssessment}</p>
              </div>
            )}
            {strategicAnalysis.signalsTeamsMissed && (
              <div className="p-3 rounded-lg border space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Sinais que os times não viram</span>
                <p className="text-sm">{strategicAnalysis.signalsTeamsMissed}</p>
              </div>
            )}
            {strategicAnalysis.whatNotToDo && (
              <div className="p-3 rounded-lg border space-y-1">
                <span className="text-xs font-medium text-muted-foreground">O que NÃO fazer</span>
                <p className="text-sm">{strategicAnalysis.whatNotToDo}</p>
              </div>
            )}
          </div>
        </ReportSection>
      )}

      {/* Calibration Flags */}
      {okrCalibrationFlags.length > 0 && (
        <ReportSection title={`Flags de calibração (${okrCalibrationFlags.length})`} icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {okrCalibrationFlags.map((f: any, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded border text-sm">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {FLAG_LABELS[f.flag] || f.flag}
                </Badge>
                <span className="flex-1">{f.note}</span>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Directives */}
      {directives.length > 0 && (
        <ReportSection title={`Diretrizes (${directives.length})`} icon={<MessageSquare className="h-4 w-4" />}>
          <div className="space-y-1.5">
            {directives.map((d: any, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded border text-sm">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {DIRECTIVE_LABELS[d.category] || d.category}
                </Badge>
                <span className="flex-1">{d.text}</span>
              </div>
            ))}
          </div>
        </ReportSection>
      )}
    </div>
  );
}
