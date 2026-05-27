/**
 * OkrFullConstructionReviewPage - Avaliação consolidada de OKRs de TODOS os times do quarter
 * 
 * Visão cross-team para identificar sinergias e sugerir OKRs compartilhadas.
 * 
 * @route /okrs/construction-review-cross
 * @access requiresBuAdmin
 */

import { useMemo, useEffect, useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { 
  ChevronLeft, Sparkles, Users, ChevronDown, ChevronRight, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useUrlState } from "@/shared/url/useUrlState";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useActiveCycles, useFullConstructionReview } from "@/modules/okrs/hooks";
import { useVic } from "@/modules/vic/contexts/VicContext";
import { ConstructionScoreCard, ObjectiveChecklistCard } from "../components/construction";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { SharedObjectiveSuggestion } from "../types/construction-review";
import type { TeamGroup } from "../hooks/useFullConstructionReview";

export default function OkrFullConstructionReviewPage() {
  const { openPanel } = useVic();

  const { data: activeCycles, isLoading: isLoadingCycles } = useActiveCycles();
  const defaultCycleId = activeCycles?.[0]?.id || '';

  const cycleIdState = useUrlState<string>({ key: 'cycle', defaultValue: '', parse: v => v || '', serialize: v => v || '' });

  useEffect(() => {
    if (!cycleIdState.value && defaultCycleId) cycleIdState.set(defaultCycleId);
  }, [cycleIdState.value, defaultCycleId]);

  const selectedCycleId = cycleIdState.value || defaultCycleId;
  const selectedCycle = useMemo(() => activeCycles?.find(c => c.id === selectedCycleId), [activeCycles, selectedCycleId]);

  usePageTitle(selectedCycle ? `Avaliação Cross-Team - ${selectedCycle.name}` : 'Avaliação Cross-Team');

  const { result, isLoading, reEvaluateObjective, criteria, cycleName } = useFullConstructionReview(selectedCycleId || null);

  // Track which team sections are open
  const [openTeams, setOpenTeams] = useState<Set<string>>(new Set());

  // Auto-open all teams on first load
  useEffect(() => {
    if (result.teams.length > 0 && openTeams.size === 0) {
      setOpenTeams(new Set(result.teams.map(t => t.teamId)));
    }
  }, [result.teams]);

  const toggleTeam = useCallback((teamId: string) => {
    setOpenTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }, []);

  // Vic handler: Collaboration suggestion
  const handleAskVicAboutCollaboration = useCallback((suggestion: SharedObjectiveSuggestion) => {
    openPanel({
      agentSlug: 'validador-metodologico-okrs',
      actionContext: 'okr-overview-insights',
      context: {
        type: 'collaboration-suggestion',
        title: `Colaboração: ${suggestion.objectiveTitle} ↔ ${suggestion.suggestedTeamName}`,
        description: 'Sinergia identificada entre objetivos',
        additionalData: {
          objectiveId: suggestion.objectiveId,
          objectiveTitle: suggestion.objectiveTitle,
          suggestedTeamId: suggestion.suggestedTeamId,
          suggestedTeamName: suggestion.suggestedTeamName,
          suggestedLeaderFirstName: suggestion.suggestedLeaderFirstName,
          suggestedObjectiveId: suggestion.suggestedObjectiveId,
          suggestedObjectiveTitle: suggestion.suggestedObjectiveTitle,
          reason: suggestion.reason,
          cycleName,
        },
      },
    });
  }, [openPanel, cycleName]);

  // Vic handler: Alignment analysis
  const handleAskVicAboutAlignment = useCallback(() => {
    if (!result.crossTeamAnalysis?.orgAlignmentAnalysis) return;
    openPanel({
      agentSlug: 'validador-metodologico-okrs',
      actionContext: 'okr-check-alignment',
      context: {
        type: 'alignment-analysis',
        title: 'Alinhamento organizacional — todos os times',
        description: `Score de alinhamento: ${result.crossTeamAnalysis.orgAlignmentAnalysis.score}%`,
        additionalData: {
          alignmentScore: result.crossTeamAnalysis.orgAlignmentAnalysis.score,
          feedback: result.crossTeamAnalysis.orgAlignmentAnalysis.feedback,
          coveredOrgObjectives: result.crossTeamAnalysis.orgAlignmentAnalysis.coveredOrgObjectives,
          uncoveredOrgObjectives: result.crossTeamAnalysis.orgAlignmentAnalysis.uncoveredOrgObjectives,
          cycleName,
        },
      },
    });
  }, [openPanel, result.crossTeamAnalysis, cycleName]);

  const getTeamScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    if (score > 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      <Helmet>
        <title>Avaliação Cross-Team{selectedCycle ? ` - ${selectedCycle.name}` : ''} | Next Jetimob</title>
        <meta name="description" content="Avaliação consolidada por IA de OKRs de todos os times — identifica sinergias e sugere colaborações." />
      </Helmet>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/okrs"><ChevronLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Avaliação Cross-Team
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise consolidada por IA — todos os times do quarter
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCycleId} onValueChange={v => cycleIdState.set(v)} disabled={isLoadingCycles}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Ciclo" /></SelectTrigger>
            <SelectContent>
              {activeCycles?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : result.totalObjectives === 0 ? (
        <Alert>
          <AlertTitle>Nenhum objetivo encontrado</AlertTitle>
          <AlertDescription>Nenhum time tem OKRs criadas para o ciclo selecionado.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <ConstructionScoreCard
              avgScore={result.globalAvgScore}
              approvedCount={result.totalApproved}
              needsImprovementCount={result.totalNeedsImprovement}
              pendingCount={result.totalPending}
              totalObjectives={result.totalObjectives}
              isLoading={false}
              teamAnalysis={result.crossTeamAnalysis}
              teamAnalysisLoading={result.crossTeamAnalysisLoading}
              collaborationSuggestionsLimit={8}
              onAskVicAboutAlignment={handleAskVicAboutAlignment}
              onAskVicAboutCollaboration={handleAskVicAboutCollaboration}
            />

            {/* Team index */}
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {result.teams.length} times · {result.totalObjectives} objetivos
              </h3>
              <div className="space-y-1">
                {result.teams.map(team => (
                  <button
                    key={team.teamId}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors text-left"
                    onClick={() => {
                      if (!openTeams.has(team.teamId)) toggleTeam(team.teamId);
                      document.getElementById(`team-${team.teamId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <span className="truncate">{team.teamName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {team.objectives.length} obj
                      </Badge>
                      <span className={cn("text-xs font-medium", getTeamScoreColor(team.avgScore))}>
                        {team.avgScore || '—'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main content: teams grouped */}
          <div className="lg:col-span-2 space-y-4">
            {result.teams.map(team => (
              <TeamSection
                key={team.teamId}
                team={team}
                isOpen={openTeams.has(team.teamId)}
                onToggle={() => toggleTeam(team.teamId)}
                criteria={criteria}
                onReEvaluate={reEvaluateObjective}
                cycleId={selectedCycleId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Team Section (collapsible)
// ============================================================

function TeamSection({ 
  team, isOpen, onToggle, criteria, onReEvaluate, cycleId,
}: { 
  team: TeamGroup;
  isOpen: boolean;
  onToggle: () => void;
  criteria: any[];
  onReEvaluate: (objectiveId: string) => void;
  cycleId: string;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    if (score > 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div id={`team-${team.teamId}`} className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{team.teamName}</h3>
                  <a
                    href={`/okrs/construction-review?cycle=${cycleId}&team=${team.teamId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title={`Ver análise de ${team.teamName} em nova aba`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  {team.objectives.length} objetivo{team.objectives.length !== 1 ? 's' : ''}
                  {' · '}
                  {team.approvedCount} OK · {team.needsImprovementCount} melhorar · {team.pendingCount} pendente
                </p>
              </div>
            </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-lg font-bold", getScoreColor(team.avgScore))}>
              {team.avgScore || '—'}
            </span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px]",
                team.avgScore >= 80 && "border-success/30 text-success",
                team.avgScore >= 50 && team.avgScore < 80 && "border-warning/30 text-warning",
                team.avgScore > 0 && team.avgScore < 50 && "border-destructive/30 text-destructive",
              )}
            >
              Score Médio
            </Badge>
          </div>
        </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t p-4 space-y-4">
            {team.objectives.map(obj => (
              <ObjectiveChecklistCard
                key={obj.objectiveId}
                review={obj}
                criteria={criteria}
                onReEvaluate={onReEvaluate}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
