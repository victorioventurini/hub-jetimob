/**
 * EvaluationCollectionStep — Step de coleta anônima de avaliação do rito
 *
 * Componente do framework, AGNÓSTICO de persona. Posicionado antes do
 * `ClosingStep` em ritos coletivos onde `EVALUATION_CONFIG[persona].enabled`
 * é true (MBR, MBR-first, QBR-Meeting, QBR-Post).
 *
 * Estados:
 *  - idle    → mostra botão "Abrir avaliação"
 *  - opened  → QR + URL + counter ao vivo + botão "Encerrar"
 *  - closed  → resumo agregado (4 medidores + citações)
 *
 * Permissões verificadas server-side pelas RPCs `open_/close_/get_open_answers_`.
 */

import { memo, useMemo } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { WizardStepScaffold } from '../../../WizardStepScaffold';
import { WizardStepHeader } from '../../../WizardStepHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useOpenRitualEvaluation, useCloseRitualEvaluation } from '../../hooks/useOpenCloseRitualEvaluation';
import { useRitualEvaluationLiveCount } from '../../hooks/useRitualEvaluationLiveCount';
import { useRitualEvaluationSummary } from '../../hooks/useRitualEvaluationSummary';
import { useRitualEvaluationOpenAnswers } from '../../hooks/useRitualEvaluationOpenAnswers';
import { EvaluationStartCard } from './EvaluationStartCard';
import { EvaluationLiveCounter } from './EvaluationLiveCounter';
import { EvaluationSummary, type EvaluationDimension } from './EvaluationSummary';
import { getEvaluationConfig } from '../../config/evaluationConfig';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

export interface EvaluationCollectionStepProps {
  sessionId: string | null;
  persona: WizardPersona;
  /** short_code já existente na sessão (se foi aberto antes) */
  initialShortCode?: string | null;
  evaluationOpenAt?: string | null;
  evaluationClosedAt?: string | null;
  footer: React.ReactNode;
}

export const EvaluationCollectionStep = memo(function EvaluationCollectionStep({
  sessionId,
  persona,
  initialShortCode = null,
  evaluationOpenAt = null,
  evaluationClosedAt = null,
  footer,
}: EvaluationCollectionStepProps) {
  const config = getEvaluationConfig(persona);
  const openMut = useOpenRitualEvaluation();
  const closeMut = useCloseRitualEvaluation();

  // shortCode: do servidor (summary) tem prioridade sobre prop inicial
  const summaryQuery = useRitualEvaluationSummary(sessionId);
  const isOpen = !!evaluationOpenAt && !evaluationClosedAt;
  const wasClosedByMutation = closeMut.isSuccess || !!evaluationClosedAt;

  const shortCode =
    openMut.data?.shortCode ??
    initialShortCode ??
    null;

  const liveCountQuery = useRitualEvaluationLiveCount(sessionId, {
    enabled: !!sessionId && !!shortCode && !wasClosedByMutation,
  });

  const openAnswersQuery = useRitualEvaluationOpenAnswers(sessionId, {
    enabled: !!sessionId && wasClosedByMutation,
  });

  const dimensions: EvaluationDimension[] = useMemo(
    () => [
      { key: 'value',     label: 'Valor para a empresa',  avg: summaryQuery.data?.avgValue ?? null },
      { key: 'quality',   label: 'Qualidade da discussão', avg: summaryQuery.data?.avgQuality ?? null },
      { key: 'decisions', label: 'Clareza das decisões',   avg: summaryQuery.data?.avgDecisions ?? null },
      { key: 'time',      label: 'Uso do tempo',           avg: summaryQuery.data?.avgTime ?? null },
    ],
    [summaryQuery.data],
  );

  const publicBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleOpen = () => {
    if (!sessionId) return;
    openMut.mutate(sessionId);
  };

  const handleClose = () => {
    if (!sessionId) return;
    closeMut.mutate(sessionId);
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={ClipboardCheck}
          title="Avaliação do rito"
          description="Coleta anônima — cada participante responde no celular"
          variant="purple"
        />
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        {!config.enabled && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground text-center">
              Este rito não tem coleta de avaliação anônima.
            </CardContent>
          </Card>
        )}

        {config.enabled && !wasClosedByMutation && (
          <>
            <EvaluationStartCard
              shortCode={shortCode}
              publicBaseUrl={publicBaseUrl}
              isOpening={openMut.isPending}
              isClosing={closeMut.isPending}
              onOpen={handleOpen}
              onClose={handleClose}
            />

            {(isOpen || shortCode) && (
              <Card>
                <CardContent className="p-6">
                  <EvaluationLiveCounter
                    responseCount={liveCountQuery.data?.responseCount ?? 0}
                    expectedCount={liveCountQuery.data?.expectedCount ?? 0}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {config.enabled && wasClosedByMutation && (
          <EvaluationSummary
            responseCount={summaryQuery.data?.responseCount ?? 0}
            expectedCount={summaryQuery.data?.expectedCount ?? 0}
            dimensions={dimensions}
            changeOneThingAnswers={
              openAnswersQuery.data?.map((a) => a.changeOneThing).filter(Boolean) ?? []
            }
            whatWorkedAnswers={
              openAnswersQuery.data
                ?.map((a) => a.whatWorked ?? '')
                .filter((t) => t.trim().length > 0) ?? []
            }
            showWhatWorked={!!config.showWhatWorked}
          />
        )}
      </div>
    </WizardStepScaffold>
  );
});
