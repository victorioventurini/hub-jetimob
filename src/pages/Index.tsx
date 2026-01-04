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
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBu } from "@/contexts/BuContext";
import { useHubGreeting } from "@/hooks/useHubGreeting";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  usePageTitle("Home");
  const { profile } = useAuth();
  const { currentBu } = useBu();
  const dashboardData = useHomeDashboard();

  const { greeting, subtext, isLoading: greetingLoading } = useHubGreeting({
    userName: profile?.first_name,
    userGender: null,
    buName: currentBu?.name,
  });

  const isExecutive = dashboardData.role === "ceo" || dashboardData.role === "director";

  return (
    <HubLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <section className="animate-fade-in">
          {greetingLoading ? (
            <>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-6 w-96" />
            </>
          ) : (
            <>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {greeting}
              </h1>
              <p className="text-lg text-muted-foreground">
                {subtext}
              </p>
            </>
          )}
        </section>

        {/* Culture Card - Full Width with Typewriter */}
        <CultureCard />

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
            title={isExecutive ? "OKRs Organizacionais" : "Meus OKRs"}
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
