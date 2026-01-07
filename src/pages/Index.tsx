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
import { LeaderDashboard } from "@/modules/home/components/LeaderDashboard";
import { useLeaderTeams } from "@/modules/home/hooks/useLeaderTeams";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { useGreeting } from "@/hooks/useGreeting";
import { useBu } from "@/contexts/BuContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigate } from "react-router-dom";

const Index = () => {
  usePageTitle("Home");
  const { profile } = useAuth();
  const { currentBu } = useBu();
  const dashboardData = useHomeDashboard();
  const { greeting, subtext } = useGreeting({ userName: profile?.first_name });
  const { isLeader, isLoading: isLeaderLoading } = useLeaderTeams();
  const { isExternal, isLoading: isExternalLoading } = useExternalUser();

  const isExecutive = dashboardData.role === "executive";

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

  // Leader Dashboard - show for users who lead at least one team (but not executives)
  if (isLeader && !isExecutive) {
    return (
      <HubLayout>
        <div className="space-y-8">
          {/* Hero Section */}
          <section className="animate-fade-in">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
              {greeting}
            </h1>
            <p className="text-lg text-muted-foreground">
              {subtext}
            </p>
          </section>

          {/* Culture Card */}
          <CultureCard />

          {/* Leader Dashboard */}
          <LeaderDashboard />
        </div>
      </HubLayout>
    );
  }

  // Default Dashboard (Executive or Collaborator)
  return (
    <HubLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <section className="animate-fade-in">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
            {greeting}
          </h1>
          <p className="text-lg text-muted-foreground">
            {subtext}
          </p>
        </section>

        {/* Culture Card - Full Width with Typewriter */}
        <CultureCard />

        {/* My OKRs Card - Shows pending check-ins for the user */}
        <MyOkrsCard />

        {/* Dashboard Cards - Vision rápida */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiSummaryCard 
            kpis={dashboardData.kpis} 
            title={isExecutive ? "KPIs da BU" : "Meus KPIs"}
          />
          <OkrSummaryCard 
            onTrack={dashboardData.okrSummary.onTrack}
            atRisk={dashboardData.okrSummary.atRisk}
            offTrack={dashboardData.okrSummary.offTrack}
            title={isExecutive ? `OKRs ${currentBu?.name || 'da Empresa'}` : "Meus OKRs"}
          />
          <FocusCard 
            items={dashboardData.focusItems}
            title="Seu Foco"
          />
          {dashboardData.teamStatus && (
            <TeamStatusCard
              teamName={dashboardData.teamStatus.teamName}
              onTrackPercent={dashboardData.teamStatus.onTrackPercent}
              atRiskPercent={dashboardData.teamStatus.atRiskPercent}
              offTrackPercent={dashboardData.teamStatus.offTrackPercent}
              title={isExecutive ? "Visão Geral" : "Meu Time"}
            />
          )}
        </section>

        {/* People Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <NewJetimobersBlock />
          <BirthdaysBlock />
          <WorkAnniversariesBlock />
        </div>

        {/* Vic Card - Bottom */}
        <VicCard />
      </div>
    </HubLayout>
  );
};

export default Index;
