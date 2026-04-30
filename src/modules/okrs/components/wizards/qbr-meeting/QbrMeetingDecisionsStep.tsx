/**
 * QbrMeetingDecisionsStep - Step 3: Decisões com donos e prazos (gate)
 *
 * owner_user_id obrigatório. deadline obrigatório.
 * Gate: mínimo de uma decisão registrada.
 * Inclui: vínculo a diretivas C-Level (promoção via DIRECTIVE_TO_DECISION_MAP).
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Crown, Gavel, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
  DecisionCard,
  CarryOverDecisionsSection,
} from '../shared';
import type { TeamCheckinDecision, QbrCLevelSnapshot } from '@/modules/okrs/types/wizard';
import {
  DIRECTIVE_TO_DECISION_MAP,
  type DecisionCategory,
  type DirectiveCategory,
} from '@/modules/okrs/types/wizard/vocabulary';

// ============================================================
// TYPES
// ============================================================

export interface QbrMeetingDecisionsStepProps {
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  /** Diretivas do C-Level para vínculo */
  cLevelDirectives?: QbrCLevelSnapshot['directives'];
  /** Decisões pendentes do QBR anterior do mesmo time (carry-over). */
  carryOverDecisions?: TeamCheckinDecision[];
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const DIRECTIVE_LABEL: Record<DirectiveCategory, string> = {
  strategic_question: 'Questão estratégica',
  hypothesis: 'Hipótese',
  non_priority: 'Despriorização',
  challenge: 'Desafio',
};

const DECISION_LABEL: Record<DecisionCategory, string> = {
  decision: 'Decisão',
  focus_adjustment: 'Ajuste de Foco',
  next_step: 'Próximo Passo',
  strategic_proposal: 'Proposta Estratégica',
};

const DECISION_ACCENT: Record<DecisionCategory, string> = {
  decision: 'border-l-status-blue bg-status-blue-muted/30',
  focus_adjustment: 'border-l-status-purple bg-status-purple-muted/30',
  next_step: 'border-l-status-green bg-status-green-muted/30',
  strategic_proposal: 'border-l-status-amber bg-status-amber-muted/30',
};

const DECISION_BADGE: Record<DecisionCategory, string> = {
  decision: 'bg-status-blue-muted text-status-blue',
  focus_adjustment: 'bg-status-purple-muted text-status-purple',
  next_step: 'bg-status-green-muted text-status-green',
  strategic_proposal: 'bg-status-amber-muted text-status-amber',
};

// ============================================================
// COMPONENT
// ============================================================

export function QbrMeetingDecisionsStep({
  decisions,
  onDecisionsChange,
  cLevelDirectives = [],
  carryOverDecisions,
  onContinue,
  onBack,
}: QbrMeetingDecisionsStepProps) {
  const hasMinimumDecisions = decisions.length >= 1;
  const allHaveOwners = decisions.every(d => d.owner?.id);

  // Diretivas já promovidas: identificadas via metadata (texto da diretiva como chave estável,
  // pois o snapshot C-Level não atribui id às diretivas).
  const promotedDirectiveTexts = new Set(
    decisions
      .filter(d => d.metadata?.source === 'clevel_directive')
      .map(d => (d.metadata?.directiveText as string | undefined) ?? ''),
  );

  const handlePromote = (directive: QbrCLevelSnapshot['directives'][number]) => {
    const targetCategory = DIRECTIVE_TO_DECISION_MAP[directive.category];
    const newDecision: TeamCheckinDecision = {
      id: `decision-clevel-${Date.now()}`,
      text: directive.text,
      category: targetCategory,
      sourceStep: 'qbr-meeting-decisions',
      metadata: {
        source: 'clevel_directive',
        directiveCategory: directive.category,
        directiveText: directive.text,
        ...(directive.targetTeamId ? { targetTeamId: directive.targetTeamId } : {}),
      },
    };
    onDecisionsChange([...decisions, newDecision]);
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Gavel}
          title="Decisões da reunião"
          tooltip="qbr-meeting-decisions"
          description="Cada decisão precisa de dono e prazo. Sem isso, não é decisão — é intenção."
          variant="primary"
          badge={`${decisions.length} decisão(ões)`}
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="qbr-meeting-decisions"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={!hasMinimumDecisions}
          primaryLabel={hasMinimumDecisions ? 'Continuar' : 'Registre pelo menos 1 decisão'}
        />
      }
    >
      <div className="p-6 space-y-4">

        {decisions.length === 0 ? (
          <div className="text-center py-12">
            <Gavel className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma decisão registrada. Use o campo abaixo para adicionar.
            </p>
          </div>
        ) : (
          decisions.map((decision) => (
            <div key={decision.id} className="space-y-2">
              <DecisionCard
                decision={decision}
                onUpdate={(id, updates) => {
                  onDecisionsChange(
                    decisions.map(d => d.id === id ? { ...d, ...updates } : d)
                  );
                }}
                onRemove={(id) => {
                  onDecisionsChange(decisions.filter(d => d.id !== id));
                }}
                showOwnerDeadline
              />

            </div>
          ))
        )}

        {decisions.length > 0 && !allHaveOwners && (
          <p className="text-xs text-status-amber flex items-center gap-1">
            ⚠ Algumas decisões não têm dono definido. Defina antes de encerrar.
          </p>
        )}

        {/* ────────── Diretivas C-Level (promoção) ────────── */}
        {cLevelDirectives.length > 0 && (
          <section className="space-y-2 pt-2" data-testid="clevel-directives-section">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-status-amber" />
              <h4 className="text-sm font-semibold">
                Diretivas do C-Level ({cLevelDirectives.length})
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Promova cada diretiva a decisão para garantir dono e prazo. A categoria-alvo é sugerida automaticamente.
            </p>
            <div className="space-y-2">
              {cLevelDirectives.map((directive, idx) => {
                const targetCategory = DIRECTIVE_TO_DECISION_MAP[directive.category];
                const isPromoted = promotedDirectiveTexts.has(directive.text);
                return (
                  <Card
                    key={`directive-${idx}`}
                    className={cn(
                      'p-3 border-l-4 flex items-start gap-3',
                      DECISION_ACCENT[targetCategory],
                    )}
                    data-testid={`clevel-directive-${idx}`}
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {directive.text}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {DIRECTIVE_LABEL[directive.category]}
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground self-center" />
                        <Badge variant="outline" className={cn('text-xs', DECISION_BADGE[targetCategory])}>
                          {DECISION_LABEL[targetCategory]}
                        </Badge>
                      </div>
                    </div>
                    {isPromoted ? (
                      <Badge
                        variant="outline"
                        className="bg-status-green-muted text-status-green shrink-0 gap-1"
                        data-testid={`clevel-directive-promoted-${idx}`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Promovida
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromote(directive)}
                        className="shrink-0 gap-1"
                        data-testid={`clevel-directive-promote-${idx}`}
                      >
                        Promover
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <CarryOverDecisionsSection
          items={carryOverDecisions}
          contextLabel="do QBR anterior"
        />
      </div>
    </WizardStepScaffold>
  );
}
