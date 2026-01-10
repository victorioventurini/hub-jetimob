/**
 * LeaderDashboard - Main dashboard layout for team leaders
 */
import { useLeaderScope } from "../hooks/useLeaderScope";
import { useLeaderDashboard } from "../hooks/useLeaderDashboard";
import { usePermissions } from "@/hooks/usePermissions";
import { LeaderScopeSelector } from "./LeaderScopeSelector";
import {
  TeamCriticalAlertsCard,
  LeaderTodayFocusCard,
  TeamOkrsCard,
  TeamKpisCard,
  TicketsTeamInboxCard,
  AssetsTeamLoansCard,
  VicLeaderInsightsCard,
} from "./leader";
import { LeaderPrepWizardCard } from "@/modules/okrs/components/wizards/leader-prep/LeaderPrepWizardCard";
import { TeamCheckinWizardCard } from "@/modules/okrs/components/wizards/team-checkin/TeamCheckinWizardCard";
import { TeamOkrCreationWizardCard } from "@/modules/okrs/components/wizards/team-okr-creation/TeamOkrCreationWizardCard";
import { NewJetimobersBlock } from "@/components/home/NewJetimobersBlock";
import { BirthdaysBlock } from "@/components/home/BirthdaysBlock";
import { WorkAnniversariesBlock } from "@/components/home/WorkAnniversariesBlock";
import { Skeleton } from "@/components/ui/skeleton";

export function LeaderDashboard() {
  const {
    teams,
    selectedTeamId,
    selectedTeam,
    selectTeam,
    hasMultipleTeams,
    isLoading: isScopeLoading,
  } = useLeaderScope();

  const {
    summary,
    focusItems,
    criticalAlerts,
    isLoading: isDashboardLoading,
  } = useLeaderDashboard(selectedTeamId);

  const { has } = usePermissions();

  // Check module permissions
  const canViewOkrs = has("okrs.read");
  const canViewKpis = has("kpis.read");
  const canViewTickets = has("tickets.read");
  const canViewAssets = has("assets.read");
  
  // Check OKR creation permission (team-scoped)
  // Note: useLeaderScope already filters to teams where user is leader
  const canCreateTeamOkrs = has("okrs.team_objective.create:team");

  const isLoading = isScopeLoading || isDashboardLoading;

  if (isScopeLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Selector */}
      <section className="max-w-md">
        <LeaderScopeSelector
          teams={teams}
          selectedTeam={selectedTeam}
          onSelectTeam={selectTeam}
          hasMultipleTeams={hasMultipleTeams}
          isLoading={isScopeLoading}
        />
      </section>

      {/* Wizard Entry Points */}
      {selectedTeam && (
        <section className="space-y-4">
          {/* OKR Creation Wizard - Always show for leaders with permission */}
          {canCreateTeamOkrs && (
            <TeamOkrCreationWizardCard
              teamId={selectedTeamId || ''}
              teamName={selectedTeam.team_name}
              hasActiveOkrs={Boolean(
                summary?.okrs && 
                (summary.okrs.green + summary.okrs.yellow + summary.okrs.red + summary.okrs.not_started) > 0
              )}
              cycleStartingSoon={false}
              isLoading={isDashboardLoading}
            />
          )}
          
          {/* Check-in Wizards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LeaderPrepWizardCard
              teamId={selectedTeamId || ''}
              teamName={selectedTeam.team_name}
              atRiskCount={summary?.okrs?.red || 0}
              pendingCount={summary?.okrs?.pending_checkins || 0}
              isLoading={isDashboardLoading}
            />
            <TeamCheckinWizardCard
              teamId={selectedTeamId || ''}
              teamName={selectedTeam.team_name}
              pendingKrsCount={summary?.okrs?.pending_checkins || 0}
              isLoading={isDashboardLoading}
            />
          </div>
        </section>
      )}

      {/* Critical Alerts - Full width, only if there are items */}
      {criticalAlerts.length > 0 && (
        <section>
          <TeamCriticalAlertsCard alerts={criticalAlerts} />
        </section>
      )}

      {/* Today Focus */}
      <section>
        <LeaderTodayFocusCard items={focusItems} isLoading={isDashboardLoading} />
      </section>

      {/* Execution Grid - 2x2 on desktop */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {canViewOkrs && (
          <TeamOkrsCard
            okrs={summary?.okrs}
            teamId={selectedTeamId}
            isLoading={isDashboardLoading}
          />
        )}
        {canViewKpis && (
          <TeamKpisCard
            kpis={summary?.kpis}
            teamId={selectedTeamId}
            isLoading={isDashboardLoading}
          />
        )}
        {canViewTickets && (
          <TicketsTeamInboxCard
            tickets={summary?.tickets}
            teamId={selectedTeamId}
            isLoading={isDashboardLoading}
          />
        )}
        {canViewAssets && (
          <AssetsTeamLoansCard
            assets={summary?.assets}
            teamId={selectedTeamId}
            isLoading={isDashboardLoading}
          />
        )}
      </section>

      {/* Vic Insights */}
      <section>
        <VicLeaderInsightsCard
          teamId={selectedTeamId}
          teamName={selectedTeam?.team_name}
        />
      </section>

      {/* People Blocks */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NewJetimobersBlock />
        <BirthdaysBlock />
        <WorkAnniversariesBlock />
      </section>
    </div>
  );
}
