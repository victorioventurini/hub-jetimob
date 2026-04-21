/**
 * KrsStep — Step genérico de KRs (modes: all | attention-only | teams-overview).
 */

import { memo } from 'react';
import { Target } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { KrsStepConfig } from '../types';
import type { KrsItem } from '../config/stepContentAdapters';
import { InlineDecisionsSlot } from './_InlineDecisionsSlot';

export interface KrsStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: KrsStepConfig;
  data: KrsItem[];
  onDataChange: (next: KrsItem[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
  suppressInlineDecisions?: boolean;
}

export const KrsStep = memo(function KrsStep({
  persona,
  version,
  stepId,
  config,
  data,
  decisions,
  onDecisionsChange,
  footer,
  suppressInlineDecisions,
}: KrsStepProps) {
  const label = getStepLabel(persona, stepId, version);
  const visible =
    config.mode === 'attention-only'
      ? data.filter((k) => k.attentionReason || k.status === 'at-risk' || k.status === 'blocked' || k.status === 'stagnant')
      : data;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title={label.title}
          description={label.subtitle}
          variant="primary"
          badge={visible.length > 0 ? `${visible.length}` : undefined}
        />
      }
      bottomFixed={
        suppressInlineDecisions ? undefined : (
          <InlineDecisionsSlot
            stepId={stepId}
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
          />
        )
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-3">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum KR para exibir.</p>
        ) : (
          visible.map((kr) => (
            <Card key={kr.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {kr.objectiveTitle && (
                    <p className="text-xs text-muted-foreground truncate">{kr.objectiveTitle}</p>
                  )}
                  <p className="font-medium text-sm">{kr.title}</p>
                  {kr.attentionReason && (
                    <p className="text-xs text-status-amber mt-1">{kr.attentionReason}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className="text-xs">{kr.status}</Badge>
                  <span className="text-xs text-muted-foreground">{Math.round(kr.progress)}%</span>
                  {config.requireReview && (
                    <Badge variant={kr.reviewed ? 'secondary' : 'destructive'} className="text-xs">
                      {kr.reviewed ? 'Revisado' : 'Pendente'}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </WizardStepScaffold>
  );
});
