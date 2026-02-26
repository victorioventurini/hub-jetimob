/**
 * EventsSettingsPage — Configurações do módulo Events com abas
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlTab } from "@/shared/url";
import { Award, BarChart3, Webhook, Palette } from "lucide-react";
import { SponsorshipsTab } from "../components/settings/SponsorshipsTab";
import { RoiMetricsTab } from "../components/settings/RoiMetricsTab";
import { WebhooksTab } from "../components/settings/WebhooksTab";
import { VisualIdentityTab } from "../components/settings/VisualIdentityTab";

export default function EventsSettingsPage() {
  const [activeTab, setActiveTab] = useUrlTab("sponsorships");

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Configurações"
          description="Gerencie patrocínios, métricas, webhooks e identidade visual dos eventos"
          breadcrumbs={[
            { label: "Eventos", href: "/events" },
            { label: "Configurações" },
          ]}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="sponsorships" className="gap-2">
              <Award className="h-4 w-4" />
              Patrocínios
            </TabsTrigger>
            <TabsTrigger value="kpis" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Métricas para ROI
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="id-visual" className="gap-2">
              <Palette className="h-4 w-4" />
              ID Visual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sponsorships">
            <SponsorshipsTab />
          </TabsContent>
          <TabsContent value="kpis">
            <RoiMetricsTab />
          </TabsContent>
          <TabsContent value="webhooks">
            <WebhooksTab />
          </TabsContent>
          <TabsContent value="id-visual">
            <VisualIdentityTab />
          </TabsContent>
        </Tabs>
      </div>
    </HubLayout>
  );
}
