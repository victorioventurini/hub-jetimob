/**
 * RitualEvaluationSection — Histórico de avaliações anônimas dos ritos coletivos.
 *
 * Estratégia:
 *  - Lê `v_ritual_evaluation_summary` por sessionId (BU-scoped via hook canônico).
 *  - Quando há respostas no novo modelo (`response_count > 0`), renderiza
 *    `EvaluationSummary` (4 medidores + citações via RPC `get_ritual_evaluation_open_answers`).
 *  - Caso contrário, faz fallback ao componente legado `RitualFeedbackSection`
 *    (que lê `reflectionData.data.ritualFeedback` — coleta antiga 1-5 estrelas).
 *
 * Princípios canônicos:
 *  - Não vaza dados entre BUs (hooks usam `useBuScopedSupabase`).
 *  - `React.memo` (componente cai em listas no histórico).
 *  - Sem `select('*')`: hooks listam colunas explicitamente.
 *
 * @see mem://features/rituals/anonymous-evaluation-standard
 */

import { memo, useMemo } from 'react';
import { useRitualEvaluationSummary } from '@/modules/okrs/components/wizards/shared/framework/hooks/useRitualEvaluationSummary';
import { useRitualEvaluationOpenAnswers } from '@/modules/okrs/components/wizards/shared/framework/hooks/useRitualEvaluationOpenAnswers';
import {
  EvaluationSummary,
  type EvaluationDimension,
} from '@/modules/okrs/components/wizards/shared/framework/components/evaluation/EvaluationSummary';
import { RitualFeedbackSection } from './RitualFeedbackSection';
import { isEvaluationEnabled } from '@/modules/okrs/components/wizards/shared/framework/config/evaluationConfig';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

export interface RitualEvaluationSectionProps {
  /** ID da sessão de ritual (`okr_wizard_sessions.id`). */
  sessionId: string | null | undefined;
  /** Persona do rito — usada para decidir se mostrar a seção e se exibir `whatWorked`. */
  persona: WizardPersona | string | null | undefined;
  /** Snapshot legado (`reflectionData`) usado APENAS no fallback. */
  reflectionData: unknown;
}

export const RitualEvaluationSection = memo(function RitualEvaluationSection({
  sessionId,
  persona,
  reflectionData,
}: RitualEvaluationSectionProps) {
  const summaryQuery = useRitualEvaluationSummary(sessionId ?? null);
  const hasNewResponses = (summaryQuery.data?.responseCount ?? 0) > 0;

  // Open answers só são liberadas pela RPC após o fechamento — alinhado ao standard.
  const openAnswersQuery = useRitualEvaluationOpenAnswers(sessionId ?? null, {
    enabled: hasNewResponses && !!summaryQuery.data?.evaluationClosedAt,
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

  // Persona determina se a seção é aplicável; quando não aplicável, mantém apenas legado.
  const personaEnabled =
    typeof persona === 'string' && isEvaluationEnabled(persona as WizardPersona);

  // Caminho 1: novo modelo (com respostas)
  if (hasNewResponses) {
    return (
      <EvaluationSummary
        responseCount={summaryQuery.data?.responseCount ?? 0}
        expectedCount={summaryQuery.data?.expectedCount ?? 0}
        dimensions={dimensions}
        changeOneThingAnswers={
          openAnswersQuery.data
            ?.map((a) => a.changeOneThing)
            .filter((t): t is string => !!t && t.trim().length > 0) ?? []
        }
        whatWorkedAnswers={
          openAnswersQuery.data
            ?.map((a) => a.whatWorked ?? '')
            .filter((t) => t.trim().length > 0) ?? []
        }
        showWhatWorked={personaEnabled}
      />
    );
  }

  // Caminho 2: fallback legado (estrelas 1-5 + comentário do MbrClosingStep antigo)
  return <RitualFeedbackSection reflectionData={reflectionData} />;
});
