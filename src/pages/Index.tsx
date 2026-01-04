import { HubLayout } from "@/components/layout/HubLayout";
import { ModulesBlock } from "@/components/home/ModulesBlock";
import { NewJetimobersBlock } from "@/components/home/NewJetimobersBlock";
import { BirthdaysBlock } from "@/components/home/BirthdaysBlock";
import { WorkAnniversariesBlock } from "@/components/home/WorkAnniversariesBlock";
import { QuickStats } from "@/components/home/QuickStats";
import { CultureCard } from "@/components/home/CultureCard";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBu } from "@/contexts/BuContext";
import { useHubGreeting } from "@/hooks/useHubGreeting";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  usePageTitle("Home");
  const { profile } = useAuth();
  const { currentBu } = useBu();

  const { greeting, subtext, isLoading: greetingLoading } = useHubGreeting({
    userName: profile?.first_name,
    userGender: null, // Profile doesn't have gender field yet
    buName: currentBu?.name,
  });

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

        {/* Culture Card */}
        <CultureCard />

        {/* Quick Stats */}
        <QuickStats />

        {/* Modules Section */}
        <ModulesBlock />

        {/* People Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <NewJetimobersBlock />
          <BirthdaysBlock />
          <WorkAnniversariesBlock />
        </div>
      </div>
    </HubLayout>
  );
};

export default Index;
