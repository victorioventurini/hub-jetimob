/**
 * MbrOrgOkrsStep - Etapa 5: OKRs Organizacionais
 * 
 * Validação de prioridades estratégicas com Key Results detalhados.
 * v1.2: Mostra contribuição dos times por KR org.
 * Se "Não é mais prioridade" → exige registro de Decisão/Ajuste de Foco.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Target, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, WizardStepScaffold, InlineDecisionInput } from '../shared';
import { ObjectiveListItem } from '@/modules/okrs/components/dashboard/ObjectiveListItem';
import type { MbrOrgOkrSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { OrgObjectiveWithKrs } from '@/modules/okrs/hooks/queries';

// ============================================================
// TYPES
// ============================================================

export interface MbrOrgOkrsStepProps {
  orgOkrSnapshots: MbrOrgOkrSnapshot[];
  onOrgOkrSnapshotsChange: (snapshots: MbrOrgOkrSnapshot[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  /** v1.2: Live org objectives with team contributions */
  orgObjectives?: OrgObjectiveWithKrs[];
  onContinue: () => void;
  onBack: () => void;
  /** Quando false, oculta o InlineDecisionInput do rodapé. Default: true. */
  showInlineDecisionInput?: boolean;
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
  orgObjectives = [],
  onContinue,
  onBack,
  showInlineDecisionInput = true,
}: MbrOrgOkrsStepProps) {
  const [showTeamKrs, setShowTeamKrs] = useState(true);
  const total = orgOkrSnapshots.length;

  const [currentObjectiveIndex, setCurrentObjectiveIndex] = useState(0);
  useEffect(() => {
    if (currentObjectiveIndex > Math.max(0, total - 1)) {
      setCurrentObjectiveIndex(Math.max(0, total - 1));
    }
  }, [total, currentObjectiveIndex]);

  const currentOkr = total > 0 ? orgOkrSnapshots[currentObjectiveIndex] : undefined;

  // Gate por página: o objetivo atual marcado como "não é mais prioridade"
  // exige decisão registrada com sourceStep="org-okrs" referenciando seu título.
  const currentNeedsDecision = useMemo(() => {
    if (!currentOkr) return false;
    if (currentOkr.remainsStrategicPriority) return false;
    const titleKey = currentOkr.title.toLowerCase().substring(0, 20);
    return !decisions.some(
      (d) => d.sourceStep === 'org-okrs' && d.text.toLowerCase().includes(titleKey),
    );
  }, [currentOkr, decisions]);

  const isFirst = currentObjectiveIndex === 0;
  const isLast = total === 0 || currentObjectiveIndex >= total - 1;

  // Build a lookup map from live org objectives for team contributions
  const orgKrContributions = useMemo(() => {
    const map = new Map<string, { teamName: string; krTitle: string; progress: number; status: string }[]>();
    for (const obj of orgObjectives) {
      for (const kr of obj.orgKrs) {
        const contribs = kr.linkedTeamKrs.map(tkr => ({
          teamName: tkr.team_name,
          krTitle: tkr.title,
          progress: tkr.progress,
          status: tkr.status as string,
        }));
        map.set(kr.id, contribs);
      }
    }
    return map;
  }, [orgObjectives]);

  const handleTogglePriority = (objectiveId: string, remains: boolean) => {
    onOrgOkrSnapshotsChange(
      orgOkrSnapshots.map(o => o.objectiveId === objectiveId ? { ...o, remainsStrategicPriority: remains } : o)
    );
  };

  const handlePrimary = useCallback(() => {
    if (currentNeedsDecision) return;
    if (isLast) onContinue();
    else setCurrentObjectiveIndex((i) => Math.min(total - 1, i + 1));
  }, [currentNeedsDecision, isLast, onContinue, total]);

  const handleBack = useCallback(() => {
    if (isFirst) onBack();
    else setCurrentObjectiveIndex((i) => Math.max(0, i - 1));
  }, [isFirst, onBack]);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title="OKRs Organizacionais"
          tooltip="mbr-org-okrs"
          description="Validação de prioridades estratégicas"
          variant="purple"
          badge={total > 0 ? `${currentObjectiveIndex + 1} / ${total}` : '0'}
          rightContent={
            <TeamKrsToggle visible={showTeamKrs} onToggle={() => setShowTeamKrs(v => !v)} />
          }
        />
      }
      bottomFixed={
        showInlineDecisionInput ? (
          <div className="border-t">
            <InlineDecisionInput
              decisions={decisions}
              onDecisionsChange={onDecisionsChange}
              sourceStep="org-okrs"
              placeholder={
                currentOkr
                  ? `Decisão sobre: ${currentOkr.title}...`
                  : 'Nota geral sobre OKRs organizacionais...'
              }
              subStep={currentOkr?.objectiveId ?? null}
              metadataFactory={
                currentOkr ? () => ({ objective_id: currentOkr.objectiveId }) : undefined
              }
            />
          </div>
        ) : undefined
      }
      footer={
        <>
          <WizardStepFooter
            onBack={handleBack}
            backLabel={isFirst ? 'Voltar' : 'Anterior'}
            onPrimary={handlePrimary}
            primaryLabel={isLast ? 'Consolidar Diretrizes' : 'Próximo Objetivo'}
            primaryDisabled={currentNeedsDecision}
          />
          {currentNeedsDecision && (
            <p className="text-xs text-status-amber text-center pb-2">
              Registre uma decisão para este OKR que não é mais prioridade
            </p>
          )}
        </>
      }
    >
      <div className="p-6 space-y-4">
        {!currentOkr ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma OKR organizacional carregada. Os snapshots serão preenchidos conforme a integração.
          </p>
        ) : (
          (() => {
            const okr = currentOkr;
            return (
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
                    {okr.keyResults.map((kr) => {
                      const contributions = orgKrContributions.get(kr.krId) || [];
                      return (
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

                          {/* v1.2: Team contributions */}
                          {showTeamKrs && (
                            contributions.length > 0 ? (
                              <div className="pl-2 space-y-0.5">
                                {contributions.map((c, idx) => {
                                  const emoji = c.status === 'on_track' ? '✅' : c.status === 'at_risk' ? '🟡' : c.status === 'off_track' ? '🔴' : '⚪';
                                  return (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                      <span>{emoji}</span>
                                      <span className="font-medium truncate">{c.teamName}</span>
                                      <span className="text-muted-foreground truncate flex-1">{c.krTitle}</span>
                                      <span className="text-muted-foreground shrink-0">{formatPercent(c.progress)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 pl-2 text-xs">
                                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                  Sem cobertura
                                </Badge>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </CardContent>
            </Card>
            );
          })()
        )}
      </div>
    </WizardStepScaffold>
  );
}
