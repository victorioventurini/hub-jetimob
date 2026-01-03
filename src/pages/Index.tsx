import { HubLayout } from "@/components/layout/HubLayout";
import { ModulesBlock } from "@/components/home/ModulesBlock";
import { NewJetimobersBlock } from "@/components/home/NewJetimobersBlock";
import { BirthdaysBlock } from "@/components/home/BirthdaysBlock";
import { WorkAnniversariesBlock } from "@/components/home/WorkAnniversariesBlock";
import { QuickStats } from "@/components/home/QuickStats";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { profile } = useAuth();

  // Get current greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const firstName = profile?.first_name?.trim();

  return (
    <HubLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <section className="animate-fade-in">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}! 👋
          </h1>
          <p className="text-lg text-muted-foreground">
            Bem-vindo ao Hub da Jetimob. Aqui você encontra tudo sobre a nossa empresa.
          </p>
        </section>

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
