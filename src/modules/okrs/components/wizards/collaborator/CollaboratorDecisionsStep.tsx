/**
 * CollaboratorDecisionsStep - Step de pendências (decisões/registros) no check-in do colaborador.
 *
 * Exibe decisões pendentes atribuídas ao usuário efetivo com thread de mensagens
 * e possibilidade de resolução.
 *
 * IMPORTANTE: as interações inline (atualizar follow-up, adicionar mensagem)
 * APENAS bufferizam no draft via callbacks `onPendingFollowUpUpdate` /
 * `onPendingThreadMessage`. A persistência acontece SOMENTE no Concluir do
 * Summary (handleComplete em CollaboratorCheckinPage). Sem callbacks
 * fornecidos, mantém comportamento ao vivo (compat retro com outros consumidores).
 */

import { ClipboardCheck, Inbox } from 'lucide-react';
import { WizardStepHeader } from '@/modules/okrs/components/wizards/shared/WizardStepHeader';
import { WizardStepFooter } from '@/modules/okrs/components/wizards/shared/WizardStepFooter';
import { WizardStepScaffold } from '@/modules/okrs/components/wizards/shared/WizardStepScaffold';
import { InlineAgendaSuggestionInput } from '@/modules/okrs/components/wizards/shared/InlineAgendaSuggestionInput';
import { DecisionFollowUpRow } from '@/modules/okrs/components/wizards/shared/DecisionFollowUpRow';
import { useMyPendingDecisions } from '@/modules/okrs/hooks';
import { useUpdateDecisionFollowUp } from '@/modules/okrs/hooks';
import { useDecisionThread } from '@/modules/okrs/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import type { RitualAgendaSuggestion, PendingDecisionFollowUpUpdate, PendingDecisionThreadMessage } from '@/modules/okrs/types/wizard';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

export interface CollaboratorDecisionsStepProps {
  effectiveUserId: string | null;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
  /** Atualizações de follow-up bufferizadas (para preview/badge "alterado"). */
  pendingFollowUpUpdates?: PendingDecisionFollowUpUpdate[];
  /** Bufferiza atualização ao invés de persistir ao vivo. */
  onPendingFollowUpUpdate?: (update: PendingDecisionFollowUpUpdate) => void;
  /** Mensagens de thread bufferizadas. */
  pendingThreadMessages?: PendingDecisionThreadMessage[];
  /** Bufferiza mensagem ao invés de persistir ao vivo. */
  onPendingThreadMessage?: (message: PendingDecisionThreadMessage) => void;
  /** Sugestões de pauta (draft do rito); se ausente, o input não é renderizado. */
  agendaSuggestions?: RitualAgendaSuggestion[];
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  agendaTriggerLabel?: string;
}

const AGENDA_SOURCE_STEP = 'collaborator-decisions';

export function CollaboratorDecisionsStep({
  effectiveUserId,
  onContinue,
  onBack,
  onSkip,
  pendingFollowUpUpdates,
  onPendingFollowUpUpdate,
  pendingThreadMessages,
  onPendingThreadMessage,
  agendaSuggestions,
  onAgendaSuggestionsChange,
  agendaTriggerLabel,
}: CollaboratorDecisionsStepProps) {
  const { data: pendingItems = [], isLoading } = useMyPendingDecisions(effectiveUserId);
  // Mantidos para fallback (consumidores que não passam callbacks).
  const { mutate: updateFollowUp, isPending: isUpdating } = useUpdateDecisionFollowUp();
  const { mutate: addThreadMessage, isPending: isAddingMessage } = useDecisionThread();

  const useBuffer = !!onPendingFollowUpUpdate;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full max-w-lg" />
        <Skeleton className="h-24 w-full max-w-lg" />
      </div>
    );
  }

  const agendaSlot =
    agendaSuggestions && onAgendaSuggestionsChange && agendaTriggerLabel ? (
      <InlineAgendaSuggestionInput
        suggestions={agendaSuggestions}
        onSuggestionsChange={onAgendaSuggestionsChange}
        sourceStep={AGENDA_SOURCE_STEP}
        triggerLabel={agendaTriggerLabel}
      />
    ) : undefined;

  // Empty state
  if (pendingItems.length === 0) {
    return (
      <WizardStepScaffold
        header={
          <WizardStepHeader
            title="Pendências"
            description="Decisões e registros atribuídos a você"
            icon={ClipboardCheck}
            variant="default"
          />
        }
        footer={
          <WizardStepFooter
            onBack={onBack}
            onPrimary={onContinue}
            primaryLabel="Continuar"
          />
        }
        bottomFixed={agendaSlot}
      >
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <Inbox className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Nenhuma pendência encontrada. Tudo em dia! 🎉
          </p>
        </div>
      </WizardStepScaffold>
    );
  }

  // Mescla updates bufferizados sobre as decisões fetched (preview de status pendente)
  const pendingByDecision = new Map<string, PendingDecisionFollowUpUpdate>();
  (pendingFollowUpUpdates ?? []).forEach((u) => {
    pendingByDecision.set(`${u.sessionId}:${u.decisionId}`, u);
  });

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          title="Pendências"
          description={`${pendingItems.length} decisão(ões)/registro(s) pendente(s) atribuído(s) a você`}
          icon={ClipboardCheck}
          variant="default"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryLabel="Continuar"
          showSkip
          onSkip={onSkip}
          skipLabel="Pular"
        />
      }
      bottomFixed={agendaSlot}
    >
      <div className="space-y-3 pb-4">
        {pendingItems.map((item) => {
          const buffered = pendingByDecision.get(`${item.sessionId}:${item.decision.id}`);
          const decisionWithOverlay: TeamCheckinDecision & { followUpStatus?: string } =
            buffered
              ? { ...item.decision, ...(buffered.updates as Partial<TeamCheckinDecision>) }
              : item.decision;

          return (
            <DecisionFollowUpRow
              key={`${item.sessionId}-${item.decision.id}`}
              decision={decisionWithOverlay}
              sessionId={item.sessionId}
              onUpdate={({ sessionId, decisionId, updates }) => {
                if (useBuffer && onPendingFollowUpUpdate) {
                  onPendingFollowUpUpdate({ sessionId, decisionId, updates });
                } else {
                  updateFollowUp({ sessionId, decisionId, updates });
                }
              }}
              isPending={useBuffer ? false : isUpdating}
              onAddMessage={({ sessionId, decisionId, content }) => {
                if (useBuffer && onPendingThreadMessage) {
                  onPendingThreadMessage({ sessionId, decisionId, content });
                } else {
                  addThreadMessage({ sessionId, decisionId, content });
                }
              }}
              isAddingMessage={useBuffer ? false : isAddingMessage}
            />
          );
        })}
      </div>
    </WizardStepScaffold>
  );
}
