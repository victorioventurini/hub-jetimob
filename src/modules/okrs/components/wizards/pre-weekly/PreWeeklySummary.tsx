/**
 * PreWeeklySummary — Step 4 do Pré-Weekly v2
 *
 * Resumo e envio. Ao confirmar, marca a sessão como `completed`. Os tópicos
 * e sinais ficam disponíveis para o agente curador-orquestrador (Onda 4
 * backend) consumir e propor a abertura executiva da Weekly.
 */

import { Send, ListChecks, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardLastStepFooter,
  WizardStepScaffold,
} from '../shared';
import type { PreWeeklyDraftData, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface PreWeeklySummaryProps {
  draftData: PreWeeklyDraftData;
  decisions: TeamCheckinDecision[];
  isCompleting: boolean;
  onComplete: () => void;
  onBack: () => void;
}

const PRIORITY_BADGE: Record<'low' | 'medium' | 'high', string> = {
  high: 'bg-status-red-muted text-status-red',
  medium: 'bg-status-amber-muted text-status-amber',
  low: 'bg-muted text-muted-foreground',
};

// ============================================================
// COMPONENT
// ============================================================

export function PreWeeklySummary({
  draftData,
  decisions,
  isCompleting,
  onComplete,
  onBack,
}: PreWeeklySummaryProps) {
  const { topics, peopleSignals, sourcesReflection } = draftData;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Send}
          title="Resumo e Envio"
          description="Revise antes de enviar para a Weekly"
          variant="green"
        />
      }
      footer={
        <WizardLastStepFooter
          onBack={onBack}
          onPrimary={onComplete}
          primaryLoading={isCompleting}
        />
      }
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* Reflexão */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reflexão da semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourcesReflection.trim() ? (
              <p className="text-sm whitespace-pre-wrap">{sourcesReflection}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Sem reflexão registrada.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tópicos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Pauta para a Weekly ({topics.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topics.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhum tema selecionado.
              </p>
            ) : (
              <ul className="space-y-2">
                {topics.map((t, idx) => (
                  <li
                    key={t.id}
                    className="rounded-md border bg-muted/30 px-3 py-2 space-y-1"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {idx + 1}.
                      </span>
                      <span className="text-sm font-medium">
                        {t.title || '(sem título)'}
                      </span>
                      <Badge
                        className={cn('text-xs border-0', PRIORITY_BADGE[t.priority])}
                      >
                        {t.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {t.category}
                      </Badge>
                    </div>
                    {t.context && (
                      <p className="text-xs text-muted-foreground">{t.context}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pessoas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pessoas ({peopleSignals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {peopleSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhum sinal de pessoas registrado.
              </p>
            ) : (
              <ul className="space-y-2">
                {peopleSignals.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-md border bg-muted/30 px-3 py-2 space-y-1"
                  >
                    <Badge variant="secondary" className="text-xs">
                      {s.type}
                    </Badge>
                    <p className="text-sm">{s.description || '(sem descrição)'}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Decisões */}
        {decisions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Decisões registradas ({decisions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {decisions.map((d) => (
                  <li
                    key={d.id}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span>•</span>
                    <span>{d.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </WizardStepScaffold>
  );
}
