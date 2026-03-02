/**
 * MbrOrgOkrsStep - Etapa 3: OKRs Organizacionais
 * 
 * Validação de prioridades estratégicas.
 * Se "Não é mais prioridade" → exige registro de Decisão/Ajuste de Foco.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, TrendingDown, Minus, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import type { MbrOrgOkrSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

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

function TrendIcon({ trend }: { trend: string }) {
  switch (trend) {
    case 'improving': return <TrendingUp className="h-3.5 w-3.5 text-status-green" />;
    case 'declining': return <TrendingDown className="h-3.5 w-3.5 text-status-red" />;
    default: return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  }
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
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={Target}
        title="OKRs Organizacionais"
        description="Validação de prioridades estratégicas"
        variant="purple"
        badge={`${orgOkrSnapshots.length}`}
      />

      <ScrollArea className="flex-1">
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{okr.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <TrendIcon trend={okr.trend} />
                        <span className="text-xs text-muted-foreground capitalize">{okr.trend === 'improving' ? 'Melhorando' : okr.trend === 'declining' ? 'Declinando' : 'Estável'}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(okr.progress)}%
                    </Badge>
                  </div>

                  <Progress value={Math.min(100, okr.progress)} className="h-1.5" />

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
      </ScrollArea>

      {/* Inline decisions for general notes */}
      <div className="border-t">
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="org-okrs"
          placeholder="Nota geral sobre OKRs organizacionais..."
        />
      </div>

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
    </div>
  );
}
