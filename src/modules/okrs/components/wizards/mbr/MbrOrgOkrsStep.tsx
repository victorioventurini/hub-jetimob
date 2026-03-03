/**
 * MbrOrgOkrsStep - Etapa 5: OKRs Organizacionais
 * 
 * Validação de prioridades estratégicas com Key Results detalhados.
 * Se "Não é mais prioridade" → exige registro de Decisão/Ajuste de Foco.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, TrendingDown, Minus, ThumbsUp, ThumbsDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, WizardStepScaffold, InlineDecisionInput } from '../shared';
import { OkrProgressBar } from '../../OkrProgressBar';
import { OkrStatusBadge } from '../../OkrStatusBadge';
import type { MbrOrgOkrSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { OkrRagStatus, OkrDirection } from '@/modules/okrs/types';

// ============================================================
// TYPES
// ============================================================

export interface MbrOrgOkrsStepProps {
  orgOkrSnapshots: MbrOrgOkrSnapshot[];
  onOrgOkrSnapshotsChange: (snapshots: MbrOrgOkrSnapshot[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// HELPERS
// ============================================================

const TREND_MAP: Record<string, { icon: typeof TrendingUp; label: string; className: string }> = {
  improving: { icon: TrendingUp, label: 'Melhorando', className: 'text-status-green' },
  declining: { icon: TrendingDown, label: 'Declinando', className: 'text-status-red' },
  stable: { icon: Minus, label: 'Estável', className: 'text-muted-foreground' },
};

function TrendIndicator({ trend }: { trend: string }) {
  const config = TREND_MAP[trend] ?? TREND_MAP.stable;
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', config.className)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrOrgOkrsStep({
  orgOkrSnapshots,
  onOrgOkrSnapshotsChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: MbrOrgOkrsStepProps) {
  // Gate: OKRs marked as "not a priority" need a decision registered
  const okrsWithoutDecision = useMemo(() => {
    return orgOkrSnapshots.filter(okr => {
      if (okr.remainsStrategicPriority) return false;
      return !decisions.some(
        d => d.sourceStep === 'org-okrs' && d.text.toLowerCase().includes(okr.title.toLowerCase().substring(0, 20))
      );
    });
  }, [orgOkrSnapshots, decisions]);

  const canProceed = okrsWithoutDecision.length === 0;

  const handleTogglePriority = (objectiveId: string, remains: boolean) => {
    onOrgOkrSnapshotsChange(
      orgOkrSnapshots.map(o => o.objectiveId === objectiveId ? { ...o, remainsStrategicPriority: remains } : o)
    );
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title="OKRs Organizacionais"
          description="Validação de prioridades estratégicas"
          variant="purple"
          badge={`${orgOkrSnapshots.length}`}
        />
      }
      bottomFixed={
        <div className="border-t">
          <InlineDecisionInput
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
            sourceStep="org-okrs"
            placeholder="Nota geral sobre OKRs organizacionais..."
          />
        </div>
      }
      footer={
        <>
          <WizardStepFooter
            onBack={onBack}
            onPrimary={onContinue}
            primaryLabel="Consolidar Diretrizes"
            primaryDisabled={!canProceed}
          />
          {!canProceed && (
            <p className="text-xs text-status-amber text-center pb-2">
              Registre decisões para OKRs que não são mais prioridade
            </p>
          )}
        </>
      }
    >
      <div className="p-6 space-y-4">
        {orgOkrSnapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma OKR organizacional carregada. Os snapshots serão preenchidos conforme a integração.
          </p>
        ) : (
          orgOkrSnapshots.map((okr) => (
            <Card key={okr.objectiveId} className={cn(
              'transition-colors',
              !okr.remainsStrategicPriority && 'border-status-amber/40 bg-status-amber/5'
            )}>
              <CardContent className="p-4 space-y-3">
                {/* Objective header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{okr.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <TrendIndicator trend={okr.trend} />
                      <OkrStatusBadge status={okr.status as any} type="objective" className="text-[10px]" />
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {Math.round(okr.progress)}%
                  </Badge>
                </div>

                {/* Key Results list */}
                {okr.keyResults.length > 0 && (
                  <div className="space-y-2 pl-3 border-l-2 border-muted">
                    {okr.keyResults.map((kr) => (
                      <div key={kr.krId} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <OkrStatusBadge status={kr.status as OkrRagStatus} type="kr" className="shrink-0" />
                          <span className="text-xs truncate flex-1 min-w-0">{kr.title}</span>
                          {kr.ownerName && (
                            <span className="text-[10px] text-muted-foreground shrink-0 inline-flex items-center gap-0.5">
                              <User className="h-3 w-3" />
                              {kr.ownerName}
                            </span>
                          )}
                        </div>
                        <OkrProgressBar
                          baseline={kr.baseline}
                          current={kr.current}
                          target={kr.target}
                          direction={kr.direction as OkrDirection}
                          status={kr.status as OkrRagStatus}
                          unit={kr.unit}
                          size="sm"
                          showLabels={false}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Priority question */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <p className="text-sm">Continua sendo prioridade estratégica?</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={okr.remainsStrategicPriority ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 gap-1"
                      onClick={() => handleTogglePriority(okr.objectiveId, true)}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Sim
                    </Button>
                    <Button
                      variant={!okr.remainsStrategicPriority ? 'destructive' : 'outline'}
                      size="sm"
                      className="h-7 gap-1"
                      onClick={() => handleTogglePriority(okr.objectiveId, false)}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                      Não
                    </Button>
                  </div>
                </div>

                {/* Decision required when not priority */}
                {!okr.remainsStrategicPriority && (
                  <div className="border rounded-lg border-status-amber/30">
                    <InlineDecisionInput
                      decisions={decisions}
                      onDecisionsChange={onDecisionsChange}
                      sourceStep="org-okrs"
                      placeholder={`Decisão ou ajuste sobre "${okr.title.substring(0, 30)}..."...`}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </WizardStepScaffold>
  );
}
