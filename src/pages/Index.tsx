import { HubLayout } from "@/components/layout/HubLayout";
import { NewJetimobersBlock } from "@/components/home/NewJetimobersBlock";
import { BirthdaysBlock } from "@/components/home/BirthdaysBlock";
import { WorkAnniversariesBlock } from "@/components/home/WorkAnniversariesBlock";
import { CultureCard } from "@/components/home/CultureCard";
import { VicCard } from "@/components/home/VicCard";
import { KpiSummaryCard } from "@/components/home/KpiSummaryCard";
import { OkrSummaryCard } from "@/components/home/OkrSummaryCard";
import { FocusCard } from "@/components/home/FocusCard";
import { TeamStatusCard } from "@/components/home/TeamStatusCard";
import { MyOkrsCard } from "@/components/home/MyOkrsCard";
import { MyTicketsHomeCard } from "@/components/home/MyTicketsHomeCard";
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
import { Lightbulb, Sparkles } from "lucide-react";

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
  
  // Verificar acesso aos módulos
  const canAccessOkrs = hasModuleAccess("okrs");
  const canAccessTickets = hasModuleAccess("tickets");
  
  // Determine profile for greeting
  const greetingProfile = isExecutive ? "executive" : isLeader ? "leader" : "collaborator";
  
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
        {/* Hero Section */}
        <section className="animate-fade-in">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
            {greeting}
          </h1>
          {/* Dica do Dia - abaixo do nome */}
          {tipLoading ? (
            <Skeleton className="h-5 w-80 mt-2" />
          ) : (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
              <span>{tip}</span>
              {isFromAI && (
                <Sparkles className="h-3 w-3 text-purple-400 shrink-0" aria-label="Gerada por IA" />
              )}
            </p>
          )}
        </section>

        {/* Culture Card - Full Width with Typewriter */}
        <CultureCard />

        {/* My Tickets Card - Only for users with tickets access */}
        {canAccessTickets && <MyTicketsHomeCard />}

        {/* Personal Check-in (Rituais) - Only for users with OKR access */}
        {canAccessOkrs && <CollaboratorWizardCard />}

        {/* Leader Section - Additional management tools for leaders */}
        {isLeader && !isExecutive && canAccessOkrs && (
          <LeaderDashboard />
        )}

        {/* Executive Section - Management wizards for executives (only with OKR access) */}
        {isExecutive && canAccessOkrs && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </section>
        )}

        {/* My OKRs Card - Shows pending check-ins for the user (only with OKR access) */}
        {canAccessOkrs && <MyOkrsCard />}

        {/* Dashboard Cards - Vision rápida */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiSummaryCard 
            kpis={dashboardData.kpis} 
            title={isExecutive ? "KPIs da BU" : "Meus KPIs"}
          />
          {/* OKR Summary Card - only for users with OKR access */}
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

        {/* People Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <NewJetimobersBlock />
          <BirthdaysBlock />
          <WorkAnniversariesBlock />
        </div>

        {/* Vic Card - Bottom (with profile-based suggestions) */}
        <VicCard profile={greetingProfile} />
      </div>
    </HubLayout>
  );
};

export default Index;
