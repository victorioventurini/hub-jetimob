import { HubLayout } from "@/components/layout/HubLayout";
import { NewJetimobersBlock } from "@/components/home/NewJetimobersBlock";
import { BirthdaysBlock } from "@/components/home/BirthdaysBlock";
import { WorkAnniversariesBlock } from "@/components/home/WorkAnniversariesBlock";
import { CultureCard } from "@/components/home/CultureCard";
import { VicCard, type VicCardProfile } from "@/components/home/VicCard";
import { DashboardHero } from "@/components/home/DashboardHero";
import { MyTicketsCard } from "@/components/home/MyTicketsCard";
import { KpiSummaryCard } from "@/components/home/KpiSummaryCard";
import { OkrSummaryCard } from "@/components/home/OkrSummaryCard";
import { FocusCard } from "@/components/home/FocusCard";
import { TeamStatusCard } from "@/components/home/TeamStatusCard";
import { MyOkrsCard } from "@/components/home/MyOkrsCard";
import { LeaderDashboard } from "@/modules/home/components/LeaderDashboard";
import { CollaboratorWizardCard } from "@/modules/okrs/components/wizards/collaborator/CollaboratorWizardCard";
import { ManagersCheckinWizardCard } from "@/modules/okrs/components/wizards/managers-checkin/ManagersCheckinWizardCard";
import { CLevelCheckinWizardCard } from "@/modules/okrs/components/wizards/clevel-checkin/CLevelCheckinWizardCard";
import { useLeaderTeams } from "@/modules/home/hooks";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { useGreeting } from "@/hooks/useGreeting";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useProductivityTip } from "@/hooks/useProductivityTip";
import { useBu } from "@/contexts/BuContext";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigate } from "react-router-dom";

const Index = () => {
  usePageTitle("Início");
  const { profile } = useAuth();
  const { currentBu } = useBu();
  const { isImpersonating, impersonatedUser } = useOptionalImpersonation();
  const dashboardData = useHomeDashboard();
  const { isLeader, isLoading: isLeaderLoading, teams: leaderTeams } = useLeaderTeams();
  const { isExternal, isLoading: isExternalLoading } = useExternalUser();
  const { hasModuleAccess } = useModuleAccess();

  const isExecutive = dashboardData.role === "executive";
  
  // During impersonation, check if impersonated user is external
  const isViewingAsExternal = isImpersonating && impersonatedUser?.employmentStatus === "external";
  
  // Verificar acesso aos módulos
  const canAccessOkrs = hasModuleAccess("okrs");
  const canAccessTickets = hasModuleAccess("tickets");
  
  // Hide internal-only cards when viewing as external user
  const showInternalOnlyCards = !isViewingAsExternal;
  
  // Determine profile for greeting and VicCard
  const greetingProfile: VicCardProfile = isExecutive ? "executive" : isLeader ? "leader" : "collaborator";
  
  // Use impersonated user's first name when impersonating
  const displayName = isImpersonating && impersonatedUser
    ? impersonatedUser.displayName.split(' ')[0]
    : profile?.first_name;
  
  const { greeting } = useGreeting({ 
    userName: displayName,
    profile: greetingProfile,
    buName: currentBu?.name,
    teamName: leaderTeams?.[0]?.team_name,
  });
  

  // Productivity tip for display below greeting
  const { tip, isLoading: tipLoading, isFromAI } = useProductivityTip();

  // Redirect external users to their dedicated dashboard
  if (!isExternalLoading && isExternal) {
    return <Navigate to="/dashboard/external" replace />;
  }

  // Loading state while determining if user is a leader or external
  if (isLeaderLoading || isExternalLoading) {
    return (
      <HubLayout>
        <div className="space-y-8">
          <section className="animate-fade-in">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-48" />
          </section>
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </HubLayout>
    );
  }

  // Unified Dashboard - everyone is a user first
  // Leaders and Executives get additional sections

  // Default Dashboard (Executive or Collaborator)
  return (
    <HubLayout>
      <div className="space-y-8">
        {/* 1. Hero Section - Boas-vindas + Dica de produtividade */}
        <DashboardHero
          greeting={greeting}
          tip={tip}
          tipLoading={tipLoading}
          isFromAI={isFromAI}
        />

        {/* 2. Culture Card */}
        <CultureCard />

        {/* 3. Wizards Section */}
        {canAccessOkrs && (
          <section className="space-y-4">
            {/* Collaborator Wizard - All users */}
            <CollaboratorWizardCard />

            {/* Leader Dashboard - Leaders only (not executives) */}
            {isLeader && !isExecutive && <LeaderDashboard />}

            {/* Executive Wizards */}
            {isExecutive && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ManagersCheckinWizardCard isLoading={dashboardData.isLoading} />
                <CLevelCheckinWizardCard 
                  overallProgress={
                    dashboardData.okrSummary.onTrack + 
                    dashboardData.okrSummary.atRisk + 
                    dashboardData.okrSummary.offTrack > 0 
                      ? (dashboardData.okrSummary.onTrack / 
                        (dashboardData.okrSummary.onTrack + dashboardData.okrSummary.atRisk + dashboardData.okrSummary.offTrack)) * 100 
                      : 0
                  }
                  atRiskCount={dashboardData.okrSummary.offTrack}
                  isLoading={dashboardData.isLoading}
                />
              </div>
            )}
          </section>
        )}

        {/* 4. My OKRs Card */}
        {canAccessOkrs && <MyOkrsCard />}

        {/* 5. KPIs + OKRs Summary + Focus - Hidden for external users */}
        {showInternalOnlyCards && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiSummaryCard 
              kpis={dashboardData.kpis} 
              title={isExecutive ? `KPIs da ${currentBu?.name || 'BU'}` : "Meus KPIs"}
            />
            {canAccessOkrs && (
              <OkrSummaryCard 
                onTrack={dashboardData.okrSummary.onTrack}
                atRisk={dashboardData.okrSummary.atRisk}
                offTrack={dashboardData.okrSummary.offTrack}
                title={isExecutive ? `OKRs ${currentBu?.name || 'da Empresa'}` : "Meus OKRs"}
              />
            )}
            {dashboardData.teamStatus && canAccessOkrs ? (
              <TeamStatusCard
                teamName={dashboardData.teamStatus.teamName}
                onTrackPercent={dashboardData.teamStatus.onTrackPercent}
                atRiskPercent={dashboardData.teamStatus.atRiskPercent}
                offTrackPercent={dashboardData.teamStatus.offTrackPercent}
                title={isExecutive ? "Visão Geral" : "Meu Time"}
              />
            ) : (
              <FocusCard 
                items={dashboardData.focusItems}
                title="Seu Foco"
              />
            )}
          </section>
        )}

        {/* 6. Tickets */}
        {canAccessTickets && <MyTicketsCard />}

        {/* 7. People Blocks */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <NewJetimobersBlock />
          <BirthdaysBlock />
          <WorkAnniversariesBlock />
        </section>

        {/* 8. Vic Card - Always at the end */}
        <VicCard 
          profile={greetingProfile} 
          teamId={isLeader ? leaderTeams?.[0]?.team_id : undefined}
          teamName={isLeader ? leaderTeams?.[0]?.team_name : undefined}
        />
      </div>
    </HubLayout>
  );
};

export default Index;
