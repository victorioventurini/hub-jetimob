/**
 * KrsStep — Step genérico de KRs (modes: all | attention-only | teams-overview).
 *
 * Edição inline:
 * - Botão "Marcar revisado" (gate `allMarkedKrsReviewed` quando `requireReview=true`).
 * - Campo `attentionReason` editável inline (visível quando KR está em alerta
 *   ou quando o usuário expande detalhes).
 *
 * Permanece data-driven: nenhum efeito de rede aqui — alterações fluem via
 * `onDataChange` para o hospedeiro persistir conforme o rito (draft).
 */

import { memo, useCallback } from 'react';
import { Target, CheckCircle2, ChevronDown, ChevronUp, Users, UserRound } from 'lucide-react';
import { useState } from 'react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { KrsStepConfig } from '../types';
import type { KrsItem } from '../config/stepContentAdapters';
import { InlineDecisionsSlot } from './_InlineDecisionsSlot';
import { cn } from '@/lib/utils';

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
  /**
   * Apenas em mode='leader-actions': notas de pauta da reunião.
   * Renderiza um Textarea no rodapé do step quando definido.
   */
  meetingNotes?: string;
  onMeetingNotesChange?: (next: string) => void;
}

const STATUS_BADGE_VARIANT: Record<KrsItem['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'on-track': 'secondary',
  'at-risk': 'destructive',
  'blocked': 'destructive',
  'completed': 'default',
  'stagnant': 'destructive',
  'unknown': 'outline',
};

export const KrsStep = memo(function KrsStep({
  persona,
  version,
  stepId,
  config,
  data,
  onDataChange,
  decisions,
  onDecisionsChange,
  footer,
  suppressInlineDecisions,
}: KrsStepProps) {
  const label = getStepLabel(persona, stepId, version);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const visible =
    config.mode === 'attention-only'
      ? data.filter(
          (k) =>
            k.attentionReason ||
            k.status === 'at-risk' ||
            k.status === 'blocked' ||
            k.status === 'stagnant',
        )
      : data;

  const updateKr = useCallback(
    (id: string, patch: Partial<KrsItem>) => {
      onDataChange(data.map((k) => (k.id === id ? { ...k, ...patch } : k)));
    },
    [data, onDataChange],
  );

  const pendingReview = config.requireReview
    ? visible.filter((k) => !k.reviewed).length
    : 0;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title={label.title}
          description={label.subtitle}
          variant={pendingReview > 0 ? 'amber' : 'primary'}
          badge={
            config.requireReview
              ? `${visible.length - pendingReview}/${visible.length} revisados`
              : visible.length > 0
              ? `${visible.length}`
              : undefined
          }
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
          visible.map((kr) => {
            const isExpanded = expanded[kr.id] ?? Boolean(kr.attentionReason);
            const inAttention =
              kr.status === 'at-risk' || kr.status === 'blocked' || kr.status === 'stagnant';

            return (
              <Card
                key={kr.id}
                className={cn(
                  'p-4 transition-colors',
                  config.requireReview && !kr.reviewed && inAttention && 'border-status-amber/40',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {kr.objectiveTitle && (
                      <p className="text-xs text-muted-foreground truncate">{kr.objectiveTitle}</p>
                    )}
                    <p className="font-medium text-sm">{kr.title}</p>
                    {kr.ownerName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{kr.ownerName}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={STATUS_BADGE_VARIANT[kr.status]} className="text-xs">
                      {kr.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{Math.round(kr.progress)}%</span>
                    {config.requireReview && (
                      <Badge
                        variant={kr.reviewed ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {kr.reviewed ? 'Revisado' : 'Pendente'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Edição inline */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setExpanded((e) => ({ ...e, [kr.id]: !isExpanded }))}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    )}
                    {kr.attentionReason ? 'Editar nota' : 'Adicionar nota'}
                  </Button>

                  {config.requireReview && (
                    <Button
                      type="button"
                      variant={kr.reviewed ? 'outline' : 'default'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => updateKr(kr.id, { reviewed: !kr.reviewed })}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {kr.reviewed ? 'Desmarcar revisão' : 'Marcar revisado'}
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-2">
                    <Textarea
                      value={kr.attentionReason ?? ''}
                      onChange={(e) => updateKr(kr.id, { attentionReason: e.target.value })}
                      placeholder="Observação ou motivo da atenção..."
                      className="min-h-[64px] text-xs"
                    />
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </WizardStepScaffold>
  );
});
