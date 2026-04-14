/**
 * CollaboratorDecisionsStep - Step de pendências (decisões/registros) no check-in do colaborador.
 * 
 * Exibe decisões pendentes atribuídas ao usuário efetivo com thread de mensagens
 * e possibilidade de resolução.
 */

import { ClipboardCheck, Inbox } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WizardStepHeader } from '@/modules/okrs/components/wizards/shared/WizardStepHeader';
import { WizardStepFooter } from '@/modules/okrs/components/wizards/shared/WizardStepFooter';
import { WizardStepScaffold } from '@/modules/okrs/components/wizards/shared/WizardStepScaffold';
import { DecisionFollowUpRow } from '@/modules/okrs/components/wizards/shared/DecisionFollowUpRow';
import { useMyPendingDecisions, type PendingDecisionItem } from '@/modules/okrs/hooks/useMyPendingDecisions';
import { useUpdateDecisionFollowUp } from '@/modules/okrs/hooks/useRitualHistory';
import { useDecisionThread } from '@/modules/okrs/hooks/useDecisionThread';
import { Skeleton } from '@/components/ui/skeleton';

export interface CollaboratorDecisionsStepProps {
  effectiveUserId: string | null;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function CollaboratorDecisionsStep({
  effectiveUserId,
  onContinue,
  onBack,
  onSkip,
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
            variant="secondary"
          />
        }
        footer={
          <WizardStepFooter
            onBack={onBack}
            onNext={onContinue}
            nextLabel="Continuar"
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
          variant="secondary"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onNext={onContinue}
          nextLabel="Continuar"
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
