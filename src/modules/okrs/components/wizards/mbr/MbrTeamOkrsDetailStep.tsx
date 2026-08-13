/**
 * MbrTeamOkrsDetailStep - Análise detalhada 1 time por vez
 *
 * Usa WizardStepScaffold para layout estável (footer sempre acessível).
 * Navegação interna prev/next via currentTeamIndex — tudo dentro do wizard.
 */

import { useMemo, useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Users, Target, CheckCircle2, ArrowLeft, ArrowRight, FileText, AlertTriangle, XCircle, Compass, Sparkles, RefreshCw, ListChecks, MessageSquare, Lightbulb, Eye, EyeOff, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { AddendumBadge } from '../shared/AddendumBadge';
import { OkrProgressBar } from '@/modules/okrs/components/OkrProgressBar';
import { OkrStatusBadge } from '@/modules/okrs/components/OkrStatusBadge';
import { LastCheckinBadge } from '../shared/LastCheckinBadge';
import { KrLinkedDetails } from '../shared/KrLinkedDetails';
import { RAG_STATUS_COLORS } from '@/lib/colors';
import { ProjectsSummary } from '@/modules/projects/components/ProjectsSummary';
import { useMbrPreTeamProjects } from '@/modules/okrs/hooks/useMbrPreTeamProjects';
import type { MbrTeamOkrSnapshot, TeamCheckinDecision, MbrPreTeamSubmission } from '@/modules/okrs/types/wizard';
import { formatPercent } from '@/modules/okrs/utils/formatPercent';

// ============================================================
// TYPES
// ============================================================

export interface MbrTeamOkrsDetailStepProps {
  teamOkrSnapshots: MbrTeamOkrSnapshot[];
  onTeamOkrSnapshotsChange: (snapshots: MbrTeamOkrSnapshot[]) => void;
  currentTeamIndex: number;
  onCurrentTeamIndexChange: (index: number) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  /** Addendums from mbr-pre sessions, keyed by teamId */
  teamAddendums?: Record<string, Array<{ text: string; created_at: string; created_by: string }>>;
  /** Submissão pré-MBR consolidada por time (highlights, nextSteps, etc.) */
  mbrPreByTeam?: Record<string, MbrPreTeamSubmission>;
  /** Mês de referência do MBR (YYYY-MM) — usado para resolver nomes de projetos/marcos. */
  referenceMonth?: string | null;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function toRagStatus(status: string): 'green' | 'yellow' | 'red' | 'not_started' {
  if (status === 'green' || status === 'on_track') return 'green';
  if (status === 'yellow' || status === 'at_risk') return 'yellow';
  if (status === 'red' || status === 'off_track') return 'red';
  return 'not_started';
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrTeamOkrsDetailStep({
  teamOkrSnapshots,
  onTeamOkrSnapshotsChange,
  currentTeamIndex,
  onCurrentTeamIndexChange,
  decisions,
  onDecisionsChange,
  teamAddendums = {},
  mbrPreByTeam = {},
  referenceMonth = null,
  onContinue,
  onBack,
}: MbrTeamOkrsDetailStepProps) {
  // Navegáveis = times com OKRs próprias ∪ times que submeteram Pré-MBR
  // (um time pode contribuir via KRs de outro time e não ter OKR própria).
  const teamsWithOkrs = useMemo(
    () =>
      teamOkrSnapshots.filter(
        (team) => team.objectives.length > 0 || !!mbrPreByTeam[team.teamId],
      ),
    [teamOkrSnapshots, mbrPreByTeam]
  );


  const totalTeams = teamsWithOkrs.length;
  const reviewedCount = teamsWithOkrs.filter((team) => team.reviewed).length;
  const allReviewed = teamsWithOkrs.every((team) => team.reviewed);

  // Clamp index to valid range
  const safeIndex = Math.max(0, Math.min(currentTeamIndex, totalTeams - 1));
  const currentTeam = teamsWithOkrs[safeIndex] ?? null;

  // Toggle: hide/show on-track OKRs (default: hidden — focus on risk/off-track)
  const [showOnTrack, setShowOnTrack] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  // Objetivo "on track" = todos os KRs verdes/not_started e nenhum em risco
  const isObjectiveOnTrack = useCallback((obj: { krsAtRisk: number; keyResults: Array<{ status?: string | null }> }) => {
    if (obj.krsAtRisk > 0) return false;
    return obj.keyResults.every((kr) => {
      const rag = toRagStatus(kr.status ?? 'not_started');
      return rag === 'green' || rag === 'not_started';
    });
  }, []);

  const visibleObjectives = useMemo(() => {
    if (!currentTeam) return [];
    if (showOnTrack) return currentTeam.objectives;
    return currentTeam.objectives.filter((obj) => !isObjectiveOnTrack(obj));
  }, [currentTeam, showOnTrack, isObjectiveOnTrack]);

  const hiddenOnTrackCount = currentTeam
    ? currentTeam.objectives.length - (showOnTrack ? currentTeam.objectives.length : visibleObjectives.length)
    : 0;

  // Resolve nomes de projetos/marcos do time atual (BU-scoped, cache compartilhado com Pré-MBR)
  const { projects: teamProjects } = useMbrPreTeamProjects(currentTeam?.teamId ?? null, referenceMonth);
  const projectNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of teamProjects) m.set(p.id, p.name);
    return m;
  }, [teamProjects]);
  const milestoneNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of teamProjects) for (const ms of p.milestones) m.set(ms.id, ms.name);
    return m;
  }, [teamProjects]);

  const isFirstTeam = safeIndex === 0;
  const isLastTeam = safeIndex === totalTeams - 1;

  const handleToggleReviewed = useCallback((teamId: string, checked: boolean) => {
    onTeamOkrSnapshotsChange(
      teamOkrSnapshots.map((team) =>
        team.teamId === teamId ? { ...team, reviewed: checked } : team
      )
    );
  }, [teamOkrSnapshots, onTeamOkrSnapshotsChange]);

  const handleBack = useCallback(() => {
    if (isFirstTeam) {
      onBack();
    } else {
      onCurrentTeamIndexChange(safeIndex - 1);
    }
  }, [isFirstTeam, safeIndex, onBack, onCurrentTeamIndexChange]);

  const handleNext = useCallback(() => {
    if (isLastTeam) {
      if (allReviewed) onContinue();
    } else {
      onCurrentTeamIndexChange(safeIndex + 1);
    }
  }, [isLastTeam, allReviewed, safeIndex, onContinue, onCurrentTeamIndexChange]);

  // ── Empty state ────────────────────────────────────────────
  if (totalTeams === 0) {
    return (
      <WizardStepScaffold
        header={
          <WizardStepHeader
            icon={Target}
            title="Análise por Time"
          tooltip="mbr-team-okrs-detail"
            description="Nenhum time disponível"
            variant="primary"
          />
        }
        footer={
          <WizardStepFooter
            onBack={onBack}
            onPrimary={onContinue}
            primaryLabel="Prosseguir para OKRs Org"
          />
        }
      >
        <div className="flex-1 flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Nenhum time com OKRs para revisar.</p>
        </div>
      </WizardStepScaffold>
    );
  }

  // ── Primary labels ─────────────────────────────────────────
  const backLabel = isFirstTeam ? 'Voltar' : 'Time anterior';
  const primaryLabel = isLastTeam ? 'Prosseguir para OKRs Org' : 'Próximo time';

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title="Análise por Time"
          tooltip="mbr-team-okrs-detail"
          description={`Time ${safeIndex + 1} de ${totalTeams} — ${currentTeam?.teamName ?? ''}`}
          variant="primary"
        />
      }
      topFixed={
        <>
          {/* Progress bar — h-1 as per wizard-ui-consistency-standard */}
          <Progress
            value={(reviewedCount / Math.max(1, totalTeams)) * 100}
            className="h-1"
          />
          <div className="px-6 py-2 flex flex-wrap items-center justify-between gap-2 border-b min-w-0">
            {/* Review counter */}
            <span className="text-xs text-muted-foreground shrink-0">
              {reviewedCount}/{totalTeams} revisados
            </span>

            <div className="flex items-center gap-4 min-w-0 flex-wrap">
              {/* Toggle: show on-track OKRs */}
              {currentTeam && (
                <div className="flex items-center gap-1.5 min-w-0">
                  {showOnTrack ? (
                    <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <Label
                    htmlFor="toggle-on-track"
                    className="text-xs cursor-pointer min-w-0 truncate"
                  >
                    Mostrar OKRs on track
                    {!showOnTrack && hiddenOnTrackCount > 0 && (
                      <span className="text-muted-foreground ml-1">({hiddenOnTrackCount} ocultos)</span>
                    )}
                  </Label>
                  <Switch
                    id="toggle-on-track"
                    checked={showOnTrack}
                    onCheckedChange={setShowOnTrack}
                  />
                </div>
              )}

              {/* Toggle: show team projects */}
              {currentTeam && (
                <div className="flex items-center gap-1.5 min-w-0">
                  {showProjects ? (
                    <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <Label
                    htmlFor="toggle-projects"
                    className="text-xs cursor-pointer min-w-0 truncate"
                  >
                    Mostrar projetos
                  </Label>
                  <Switch
                    id="toggle-projects"
                    checked={showProjects}
                    onCheckedChange={setShowProjects}
                  />
                </div>
              )}

              {/* Reviewed checkbox for current team */}
              {currentTeam && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Checkbox
                    id={`reviewed-${currentTeam.teamId}`}
                    checked={currentTeam.reviewed}
                    onCheckedChange={(checked) =>
                      handleToggleReviewed(currentTeam.teamId, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`reviewed-${currentTeam.teamId}`}
                    className="text-xs cursor-pointer flex items-center gap-1 min-w-0"
                  >
                    <CheckCircle2
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        currentTeam.reviewed ? 'text-status-green' : 'text-muted-foreground'
                      )}
                    />
                    <span className="truncate">Marcar como revisado</span>
                  </Label>
                </div>
              )}
            </div>
          </div>
        </>
      }
      bottomFixed={
        <>
          <div className="border-t">
            <InlineDecisionInput
              decisions={decisions}
              onDecisionsChange={onDecisionsChange}
              sourceStep="team-okrs-detail"
              placeholder={`Nota sobre ${currentTeam?.teamName ?? 'este time'}...`}
              subStep={currentTeam?.teamId ?? null}
              metadataFactory={
                currentTeam ? () => ({ team_id: currentTeam.teamId }) : undefined
              }
            />
          </div>
          {isLastTeam && !allReviewed && (
            <p className="text-xs text-muted-foreground text-center pb-2 px-4">
              Revise todos os times antes de prosseguir ({reviewedCount}/{totalTeams})
            </p>
          )}
        </>
      }
      footer={
        <WizardStepFooter
          onBack={handleBack}
          backLabel={backLabel}
          onPrimary={handleNext}
          primaryLabel={primaryLabel}
          primaryDisabled={isLastTeam && !allReviewed}
        />
      }
    >
      {/* Scrollable content — single team's OKRs */}
      {currentTeam && (
        <div className="p-6 space-y-4 w-full min-w-0 max-w-full overflow-x-hidden">
          {/* Team header card */}
          <div className="flex flex-wrap items-center gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <p className="font-semibold truncate min-w-0 flex-1">{currentTeam.teamName}</p>
            <span className="text-xs text-muted-foreground min-w-0 max-w-full truncate">
              {currentTeam.objectives.length} OKRs · {currentTeam.objectives.reduce((sum, obj) => sum + obj.krCount, 0)} KRs
            </span>
            {teamAddendums[currentTeam.teamId]?.length > 0 && (
              <AddendumBadge addendums={teamAddendums[currentTeam.teamId]} badgeOnly />
            )}
          </div>

          {/* Addendum from mbr-pre */}
          {teamAddendums[currentTeam.teamId]?.length > 0 && (
            <AddendumBadge addendums={teamAddendums[currentTeam.teamId]} />
          )}

          {/* Preparação do líder (vinda do pré-MBR) */}
          {(() => {
            const sub = mbrPreByTeam[currentTeam.teamId];
            if (!sub) {
              return (
                <Card className="border-dashed">
                  <CardContent className="p-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Sem pré-MBR submetido neste mês.
                    </p>
                  </CardContent>
                </Card>
              );
            }
            const {
              highlights,
              nextSteps,
              submittedByName,
              submittedAt,
              kpiJustifications = {},
              kpiNoDataReasons = {},
              kpiOutdatedUpdates = {},
              projectJustifications = { projects: {}, milestones: {} },
              kpisToCreate = [],
              agendaSuggestions = [],
              monthAnalysis = null,
              kpiSnapshots = [],
            } = sub;

            const kpiNameById = new Map<string, string>();
            for (const k of kpiSnapshots) if (k?.kpiId) kpiNameById.set(k.kpiId, k.name ?? k.kpiId);
            const kpiName = (id: string) => kpiNameById.get(id) ?? id;

            const justifEntries = Object.entries(kpiJustifications).filter(([, v]) => (v ?? '').trim());
            const noDataEntries = Object.entries(kpiNoDataReasons).filter(([, v]) => (v ?? '').trim());
            const outdatedEntries = Object.entries(kpiOutdatedUpdates);
            const projJustifEntries = Object.entries(projectJustifications.projects ?? {}).filter(([, v]) => (v ?? '').trim());
            const milestoneJustifEntries = Object.entries(projectJustifications.milestones ?? {}).filter(([, v]) => (v ?? '').trim());

            const hasAny =
              highlights.accelerated.trim() ||
              highlights.blocked.trim() ||
              highlights.needsDecision.trim() ||
              nextSteps.focus.trim() ||
              nextSteps.prioritizedItems.length > 0 ||
              nextSteps.crossDependencies.length > 0 ||
              justifEntries.length > 0 ||
              noDataEntries.length > 0 ||
              outdatedEntries.length > 0 ||
              projJustifEntries.length > 0 ||
              milestoneJustifEntries.length > 0 ||
              kpisToCreate.length > 0 ||
              agendaSuggestions.length > 0 ||
              !!monthAnalysis;
            if (!hasAny) return null;

            return (
              <>
                {/* Análise mensal IA */}
                {monthAnalysis && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-sm font-semibold">Análise mensal (IA)</p>
                        <Badge variant="outline" className="text-[10px] ml-auto">
                          {monthAnalysis.origin === 'ai-generated' ? 'IA' : 'Manual'}
                        </Badge>
                      </div>
                      {monthAnalysis.summary?.trim() && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{monthAnalysis.summary}</p>
                      )}
                      {monthAnalysis.highlights?.slice(0, 2).map((h, i) => (
                        <div key={`h-${i}`} className="flex gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-status-green shrink-0 mt-0.5" />
                          <p className="text-muted-foreground"><span className="font-medium">{h.title}:</span> {h.detail}</p>
                        </div>
                      ))}
                      {monthAnalysis.risks?.slice(0, 2).map((r, i) => (
                        <div key={`r-${i}`} className="flex gap-2 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5 text-status-amber shrink-0 mt-0.5" />
                          <p className="text-muted-foreground"><span className="font-medium">{r.title}:</span> {r.detail}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-sm font-semibold">Preparação do líder</p>
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {submittedByName ?? 'Líder'} · {new Date(submittedAt).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>
                    {highlights.accelerated.trim() && (
                      <div className="flex gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-status-green shrink-0 mt-0.5" />
                        <p className="text-muted-foreground"><span className="font-medium text-status-green">Acelerou:</span> {highlights.accelerated}</p>
                      </div>
                    )}
                    {highlights.blocked.trim() && (
                      <div className="flex gap-2 text-xs">
                        <XCircle className="h-3.5 w-3.5 text-status-red shrink-0 mt-0.5" />
                        <p className="text-muted-foreground"><span className="font-medium text-status-red">Travou:</span> {highlights.blocked}</p>
                      </div>
                    )}
                    {highlights.needsDecision.trim() && (
                      <div className="flex gap-2 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-status-amber shrink-0 mt-0.5" />
                        <p className="text-muted-foreground"><span className="font-medium text-status-amber">Precisa de decisão:</span> {highlights.needsDecision}</p>
                      </div>
                    )}
                    {nextSteps.focus.trim() && (
                      <div className="flex gap-2 text-xs">
                        <Compass className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-muted-foreground"><span className="font-medium">Foco do mês:</span> {nextSteps.focus}</p>
                      </div>
                    )}
                    {nextSteps.prioritizedItems.length > 0 && (
                      <div className="text-xs text-muted-foreground space-y-0.5 pl-5">
                        {nextSteps.prioritizedItems.slice(0, 5).map((item, i) => (
                          <p key={i}>{i + 1}. {item}</p>
                        ))}
                      </div>
                    )}
                    {nextSteps.crossDependencies.length > 0 && (
                      <div className="pt-2 border-t border-primary/20 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-status-amber shrink-0" />
                          <p className="text-xs font-semibold">
                            Dependências cross-team ({nextSteps.crossDependencies.length})
                          </p>
                        </div>
                        {nextSteps.crossDependencies.map((dep, i) => (
                          <p key={i} className="text-xs text-muted-foreground pl-5">
                            • {dep}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* KPIs do time (snapshots congelados no Pré-MBR) */}
                    {kpiSnapshots.length > 0 && (
                      <div className="pt-2 border-t border-primary/20 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Gauge className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="text-xs font-semibold">
                            KPIs do time no Pré-MBR ({kpiSnapshots.length})
                          </p>
                        </div>
                        {kpiSnapshots.map((k) => (
                          <div key={k.kpiId} className="pl-5 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-medium">{k.name}</p>
                              <span className="text-xs text-muted-foreground">
                                {k.currentValue ?? '—'}
                                {k.unit ? ` ${k.unit}` : ''}
                                {k.target != null
                                  ? ` · meta ${k.target}${k.unit ? ` ${k.unit}` : ''}`
                                  : ''}
                              </span>
                              <OkrStatusBadge
                                status={toRagStatus(k.ragStatus)}
                                type="kr"
                                className="shrink-0 text-[10px]"
                              />
                            </div>
                            {k.impactAssessment?.trim() && (
                              <p className="text-xs text-muted-foreground">
                                {k.impactAssessment}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}


                    {/* KPI: justificativas */}
                    {justifEntries.length > 0 && (
                      <div className="pt-2 border-t border-primary/20 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-status-amber shrink-0" />
                          <p className="text-xs font-semibold">Justificativas de KPI ({justifEntries.length})</p>
                        </div>
                        {justifEntries.map(([id, txt]) => (
                          <p key={id} className="text-xs text-muted-foreground pl-5">
                            <span className="font-medium">{kpiName(id)}:</span> {txt}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* KPI: sem dados */}
                    {noDataEntries.length > 0 && (
                      <div className="pt-2 border-t border-primary/20 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <p className="text-xs font-semibold">KPIs sem dados ({noDataEntries.length})</p>
                        </div>
                        {noDataEntries.map(([id, txt]) => (
                          <p key={id} className="text-xs text-muted-foreground pl-5">
                            <span className="font-medium">{kpiName(id)}:</span> {txt}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* KPI: atualizados durante o pré-MBR */}
                    {outdatedEntries.length > 0 && (
                      <div className="pt-2 border-t border-primary/20 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <RefreshCw className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="text-xs font-semibold">KPIs atualizados na sessão ({outdatedEntries.length})</p>
                        </div>
                        {outdatedEntries.map(([id, upd]) => (
                          <p key={id} className="text-xs text-muted-foreground pl-5">
                            <span className="font-medium">{kpiName(id)}:</span> {upd.newValue} ({upd.inputType}) · {new Date(upd.referenceDate).toLocaleDateString('pt-BR')}
                            {upd.notes ? ` — ${upd.notes}` : ''}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Projetos / milestones atrasados */}
                    {(projJustifEntries.length > 0 || milestoneJustifEntries.length > 0) && (
                      <div className="pt-2 border-t border-primary/20 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <ListChecks className="h-3.5 w-3.5 text-status-amber shrink-0" />
                          <p className="text-xs font-semibold">
                            Justificativas de projeto ({projJustifEntries.length + milestoneJustifEntries.length})
                          </p>
                        </div>
                        {projJustifEntries.map(([id, txt]) => (
                          <p key={`p-${id}`} className="text-xs text-muted-foreground pl-5">
                            <span className="font-medium">Projeto · {projectNameById.get(id) ?? '(removido)'}:</span> {txt}
                          </p>
                        ))}
                        {milestoneJustifEntries.map(([id, txt]) => (
                          <p key={`m-${id}`} className="text-xs text-muted-foreground pl-5">
                            <span className="font-medium">Marco · {milestoneNameById.get(id) ?? '(removido)'}:</span> {txt}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* KPIs sugeridos */}
                    {kpisToCreate.length > 0 && (
                      <div className="pt-2 border-t border-primary/20 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="text-xs font-semibold">KPIs sugeridos ({kpisToCreate.length})</p>
                        </div>
                        {kpisToCreate.map((k, i) => (
                          <p key={i} className="text-xs text-muted-foreground pl-5">
                            <span className="font-medium">{k.suggestedScope}:</span> {k.description}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Sugestões de pauta */}
                    {agendaSuggestions.length > 0 && (
                      <div className="pt-2 border-t border-primary/20 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Compass className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="text-xs font-semibold">Sugestões de pauta ({agendaSuggestions.length})</p>
                        </div>
                        {agendaSuggestions.slice(0, 5).map((s: any, i) => (
                          <p key={i} className="text-xs text-muted-foreground pl-5">
                            • {s.title ?? s.text ?? JSON.stringify(s)}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}

          {/* OKRs for current team */}
          {(() => {
            const sub = mbrPreByTeam[currentTeam.teamId];
            const krJustifMap: Record<string, string> = sub?.krJustifications ?? {};
            const krFinalStateMap = new Map<string, { state: string; finalProgress: number; paceStatus: string }>();
            for (const f of sub?.krFinalStates ?? []) {
              if (f?.krId) krFinalStateMap.set(f.krId, { state: f.state, finalProgress: f.finalProgress, paceStatus: f.paceStatus });
            }
            if (currentTeam.objectives.length === 0) {
              return (
                <Card className="border-dashed">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-medium">Sem OKRs próprias no ciclo</p>
                    <p className="text-xs text-muted-foreground">
                      Este time entrou na pauta pelo Pré-MBR enviado. A contribuição
                      acontece via KRs de outros times — veja abaixo/acima os KPIs,
                      destaques e próximos passos informados pelo líder.
                    </p>
                    {contributedKrStates.length > 0 && (
                      <div className="pt-2 border-t space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="text-xs font-semibold">
                            Contribuições em KRs de outros times ({contributedKrStates.length})
                          </p>
                        </div>
                        {contributedKrStates.map((f) => {
                          const detail = contributedKrDetails?.get(f.krId);
                          const justif = (krJustifMap[f.krId] ?? '').trim();
                          return (
                            <div key={f.krId} className="pl-5 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-medium">
                                  {detail?.krTitle ?? f.krTitle ?? '(KR removido)'}
                                </p>
                                {detail?.ownerTeamName && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {detail.ownerTeamName}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[10px]">
                                  Pré-MBR: {f.state} · {f.finalProgress}%
                                </Badge>
                                {f.paceStatus && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {f.paceStatus}
                                  </span>
                                )}
                              </div>
                              {detail?.objectiveTitle && (
                                <p className="text-xs text-muted-foreground">
                                  Objetivo: {detail.objectiveTitle}
                                </p>
                              )}
                              {justif && (
                                <p className="text-xs text-muted-foreground">{justif}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }

            if (visibleObjectives.length === 0 && currentTeam.objectives.length > 0) {

              return (
                <Card className="border-dashed">
                  <CardContent className="p-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-status-green shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Todos os {currentTeam.objectives.length} OKRs deste time estão on track. Ative "Mostrar OKRs on track" para visualizá-los.
                    </p>
                  </CardContent>
                </Card>
              );
            }
            return visibleObjectives.map((objective) => (
            <Card
              key={objective.objectiveId}
              className={cn(
                'w-full overflow-hidden min-w-0 max-w-full',
                objective.krsAtRisk > 0 && RAG_STATUS_COLORS.red.border
              )}
            >
              <CardContent className="p-4 space-y-2 w-full min-w-0 max-w-full overflow-x-hidden">
                {/* Objective header */}
                <div className="flex items-center gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                  <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                  <p className="text-sm font-medium truncate flex-1 min-w-0">{objective.title}</p>
                  <span className="text-xs font-medium shrink-0">{formatPercent(objective.progress)}</span>
                </div>

                {objective.krsAtRisk > 0 && (
                  <p className={cn('text-xs', RAG_STATUS_COLORS.red.text)}>
                    {objective.krsAtRisk} KR{objective.krsAtRisk > 1 ? 's' : ''} em risco
                  </p>
                )}

                {/* KRs */}
                <div className="space-y-1.5 w-full min-w-0 max-w-full overflow-x-hidden">
                  {objective.keyResults.map((kr) => {
                    const rag = toRagStatus(kr.status ?? 'not_started');
                    const krJustif = (krJustifMap[kr.krId] ?? '').trim();
                    const finalState = krFinalStateMap.get(kr.krId);

                    return (
                      <div
                        key={kr.krId}
                        className={cn('p-2 rounded border w-full min-w-0 max-w-full overflow-x-hidden', RAG_STATUS_COLORS[rag].border)}
                      >
                        <div className="flex items-center gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                          <p className="text-xs font-medium truncate flex-1 min-w-0">{kr.title}</p>
                          {finalState && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              Pré-MBR: {finalState.state} · {finalState.finalProgress}%
                            </Badge>
                          )}
                          <OkrStatusBadge status={rag} type="kr" className="shrink-0 text-[10px]" />
                        </div>

                        <div className="mt-1.5 w-full min-w-0 max-w-full overflow-x-hidden">
                          <OkrProgressBar
                            baseline={kr.baseline}
                            current={kr.current}
                            target={kr.target}
                            direction={kr.direction}
                            status={rag}
                            unit={kr.unit ?? '%'}
                            size="sm"
                            className="w-full min-w-0 max-w-full"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground min-w-0 w-full max-w-full overflow-x-hidden">
                          {kr.ownerName && (
                            <span className="truncate min-w-0 max-w-full flex-1">{kr.ownerName}</span>
                          )}
                          <div className="min-w-0 max-w-full flex-1 overflow-x-hidden">
                            <LastCheckinBadge lastCompletedAt={kr.lastCheckinAt ?? null} className="w-full min-w-0 max-w-full" />
                          </div>
                        </div>

                        {krJustif && (
                          <div className="flex gap-2 mt-1.5 text-xs">
                            <MessageSquare className="h-3.5 w-3.5 text-status-amber shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">
                              <span className="font-medium">Justificativa do líder:</span> {krJustif}
                            </p>
                          </div>
                        )}

                        {/* Linked initiatives & projects */}
                        <KrLinkedDetails krId={kr.krId} defaultExpanded />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ));
          })()}

          {/* Projetos do time — bloco aditivo */}
          {showProjects && (
            <ProjectsSummary teamId={currentTeam.teamId} mode="detail" className="mt-2" />
          )}
        </div>
      )}
    </WizardStepScaffold>
  );
}
