/**
 * CollaboratorDecisionsStep - Step de pendências (decisões/registros) no check-in do colaborador.
 * 
 * Exibe decisões pendentes atribuídas ao usuário efetivo com thread de mensagens
 * e possibilidade de resolução.
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
import type { RitualAgendaSuggestion } from '@/modules/okrs/types/wizard';

export interface CollaboratorDecisionsStepProps {
  effectiveUserId: string | null;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
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
  agendaSuggestions,
  onAgendaSuggestionsChange,
  agendaTriggerLabel,
}: CollaboratorDecisionsStepProps) {
  const { data: pendingItems = [], isLoading } = useMyPendingDecisions(effectiveUserId);
  const { mutate: updateFollowUp, isPending: isUpdating } = useUpdateDecisionFollowUp();
  const { mutate: addThreadMessage, isPending: isAddingMessage } = useDecisionThread();

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full max-w-lg" />
        <Skeleton className="h-24 w-full max-w-lg" />
      </div>
    );
  }

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
    >
      <div className="space-y-3 pb-4">
        {pendingItems.map((item) => (
          <DecisionFollowUpRow
            key={`${item.sessionId}-${item.decision.id}`}
            decision={item.decision}
            sessionId={item.sessionId}
            onUpdate={({ sessionId, decisionId, updates }) => {
              updateFollowUp({ sessionId, decisionId, updates });
            }}
            isPending={isUpdating}
            onAddMessage={({ sessionId, decisionId, content }) => {
              addThreadMessage({ sessionId, decisionId, content });
            }}
            isAddingMessage={isAddingMessage}
          />
        ))}
      </div>
    </WizardStepScaffold>
  );
}
