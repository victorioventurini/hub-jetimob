/**
 * OkrConstructionReviewPage - Página de avaliação AUTOMÁTICA de construção das OKRs por IA
 * 
 * Controle de acesso:
 * - Admin/Super Admin: pode ver todos os times
 * - Líder de time: pode ver APENAS seus próprios times (time que lidera diretamente)
 */

import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, ShieldX, ClipboardCheck, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUrlState } from "@/shared/url/useUrlState";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useLeaderTeams } from "@/modules/home/hooks/useLeaderTeams";
import { useActiveCycles } from "@/modules/okrs/hooks/useCycleData";
import { useConstructionReview } from "../hooks/useConstructionReview";
import { usePermissions } from "@/hooks/usePermissions";
import { useHierarchicalTeamList, type FlatTeamItem } from "@/modules/teams/hooks/useTeams";
import { TeamSelect } from "@/components/selects/TeamSelect";
import { ConstructionScoreCard, ObjectiveChecklistCard } from "../components/construction";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function OkrConstructionReviewPage() {
  const navigate = useNavigate();
  const { isWildcard, isLoading: isLoadingPermissions } = usePermissions();

  const { teams: leaderTeamsRaw, isLeader, isLoading: isLoadingLeaderTeams } = useLeaderTeams();
  const { teams: allTeams, isLoading: isLoadingAllTeams } = useHierarchicalTeamList();

  const isAdmin = isWildcard;
  
  // Times que o usuário pode acessar (admin = todos, líder = apenas seus times)
  const allowedTeams: FlatTeamItem[] = useMemo(() => {
    if (isAdmin) return allTeams;
    return leaderTeamsRaw.map(t => ({ id: t.team_id, name: t.team_name, level: 0, parentId: null }));
  }, [isAdmin, allTeams, leaderTeamsRaw]);

  // IDs dos times permitidos para validação
  const allowedTeamIds = useMemo(() => new Set(allowedTeams.map(t => t.id)), [allowedTeams]);

  const isLoadingTeams = isLoadingPermissions || (isAdmin ? isLoadingAllTeams : isLoadingLeaderTeams);
  const hasAccess = isAdmin || isLeader;

  const { data: activeCycles, isLoading: isLoadingCycles } = useActiveCycles();
  const defaultCycleId = activeCycles?.[0]?.id || '';

  const teamIdState = useUrlState<string>({ key: 'team', defaultValue: '', parse: v => v || '', serialize: v => v || '' });
  const cycleIdState = useUrlState<string>({ key: 'cycle', defaultValue: '', parse: v => v || '', serialize: v => v || '' });

  // Validar se o time da URL é permitido para este usuário
  const requestedTeamId = teamIdState.value;
  const isTeamAccessDenied = !isLoadingTeams && requestedTeamId && !allowedTeamIds.has(requestedTeamId);

  // Time selecionado: apenas se permitido
  const selectedTeamId = useMemo(() => {
    if (isTeamAccessDenied) return ''; // Acesso negado ao time solicitado
    return requestedTeamId || allowedTeams[0]?.id || '';
  }, [isTeamAccessDenied, requestedTeamId, allowedTeams]);

  const selectedCycleId = cycleIdState.value || defaultCycleId;

  // Auto-select primeiro time permitido se nenhum selecionado
  useEffect(() => {
    if (!teamIdState.value && allowedTeams.length > 0 && !isLoadingTeams) {
      teamIdState.set(allowedTeams[0].id);
    }
  }, [teamIdState.value, allowedTeams, isLoadingTeams]);

  // Auto-select ciclo default
  useEffect(() => {
    if (!cycleIdState.value && defaultCycleId) cycleIdState.set(defaultCycleId);
  }, [cycleIdState.value, defaultCycleId]);

  const selectedTeam = useMemo(() => allowedTeams?.find(t => t.id === selectedTeamId), [allowedTeams, selectedTeamId]);
  const selectedCycle = useMemo(() => activeCycles?.find(c => c.id === selectedCycleId), [activeCycles, selectedCycleId]);

  usePageTitle(selectedTeam ? `Avaliação OKRs - ${selectedTeam.name}` : 'Avaliação de Construção');

  // Só carrega dados se o time for permitido
  const { teamReview, objectives, isLoading: isLoadingReview, reEvaluateObjective, criteria } = useConstructionReview(
    isTeamAccessDenied ? null : selectedTeamId || null, 
    selectedCycleId || null
  );

  if (isLoadingTeams) {
    return (
      <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container max-w-7xl mx-auto py-6 px-4">
        <Helmet>
          <title>Acesso Restrito | Hub Jetimob</title>
        </Helmet>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4"><ShieldX className="w-12 h-12 text-muted-foreground" /></div>
          <h1 className="text-xl font-semibold mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-6">Esta página é exclusiva para líderes de time.</p>
          <Button onClick={() => navigate('/okrs')}><ChevronLeft className="w-4 h-4 mr-2" />Voltar</Button>
        </div>
      </div>
    );
  }

  // Acesso negado ao time específico (líder tentando acessar time de outro líder)
  if (isTeamAccessDenied) {
    return (
      <div className="container max-w-7xl mx-auto py-6 px-4">
        <Helmet>
          <title>Acesso Negado | Hub Jetimob</title>
        </Helmet>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-destructive/10 mb-4"><Lock className="w-12 h-12 text-destructive" /></div>
          <h1 className="text-xl font-semibold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">Você só pode acessar a avaliação dos times que lidera.</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/okrs')}><ChevronLeft className="w-4 h-4 mr-2" />Voltar</Button>
            {allowedTeams.length > 0 && (
              <Button onClick={() => teamIdState.set(allowedTeams[0].id)}>
                Ver meu time
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      <Helmet>
        <title>Avaliação de Construção{selectedTeam ? ` - ${selectedTeam.name}` : ''} | Hub Jetimob</title>
        <meta name="description" content="Avaliação automática por IA da qualidade de construção das OKRs." />
      </Helmet>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/okrs')}><ChevronLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Avaliação de Construção
            </h1>
            <p className="text-sm text-muted-foreground">Análise automática por IA antes de iniciar o ciclo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TeamSelect value={selectedTeamId} onValueChange={v => teamIdState.set(v || '')} teams={allowedTeams} placeholder="Selecione o time" triggerClassName="w-[220px]" />
          <Select value={selectedCycleId} onValueChange={v => cycleIdState.set(v)} disabled={isLoadingCycles}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ciclo" /></SelectTrigger>
            <SelectContent>
              {activeCycles?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {objectives.length === 0 && !isLoadingReview ? (
        <Alert>
          <AlertTitle>Nenhum objetivo encontrado</AlertTitle>
          <AlertDescription>Este time não tem OKRs criadas para o ciclo selecionado.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ConstructionScoreCard
              avgScore={teamReview?.avgScore || 0}
              approvedCount={teamReview?.approvedCount || 0}
              needsImprovementCount={teamReview?.needsImprovementCount || 0}
              pendingCount={teamReview?.pendingCount || 0}
              totalObjectives={objectives.length}
              globalAlignmentSuggestion={teamReview?.globalAlignmentSuggestion}
              isLoading={isLoadingReview}
              teamAnalysis={teamReview?.teamAnalysis}
              teamAnalysisLoading={teamReview?.teamAnalysisLoading}
            />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {objectives.map(obj => (
              <ObjectiveChecklistCard
                key={obj.objectiveId}
                review={obj}
                criteria={criteria}
                onReEvaluate={reEvaluateObjective}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
