import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBu } from "@/contexts/BuContext";
import { Shield, Bell, ChevronRight, Building2, Handshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";

interface SettingsCardProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  title: string;
  description: string;
}

function SettingsCard({ to, icon: Icon, iconBgColor, title, description }: SettingsCardProps) {
  return (
    <Link to={to} className="block">
      <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${iconBgColor}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-base">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function BuSettingsPage() {
  const { currentBu } = useBu();
  usePageTitle("Configurações da BU", {
    customDescription: "Gerencie as configurações específicas desta unidade de negócio."
  });

  return (
    <HubLayout>
      <div className="space-y-8 max-w-3xl mx-auto">
        <PageHeader
          title="Configurações da BU"
          description={`Gerencie as configurações de ${currentBu?.name || "sua Business Unit"}`}
          breadcrumbs={[{ label: "Configurações" }]}
        />

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Configurações Disponíveis</h2>
            <div className="grid gap-4">
              <SettingsCard
                to="/settings/permissions"
                icon={Shield}
                iconBgColor="bg-status-blue-muted text-status-blue"
                title="Permissões"
                description="Gerenciar templates de permissões e acessos dos usuários"
              />
              <SettingsCard
                to="/settings/notifications"
                icon={Bell}
                iconBgColor="bg-status-amber-muted text-status-amber"
                title="Notificações"
                description="Configurar canais e preferências de notificações da BU"
              />
              <SettingsCard
                to="/settings/areas"
                icon={Building2}
                iconBgColor="bg-status-emerald-muted text-status-emerald"
                title="Áreas"
                description="Gerenciar áreas estratégicas que agrupam os times"
              />
              <SettingsCard
                to="/settings/partners"
                icon={Handshake}
                iconBgColor="bg-status-purple-muted text-status-purple"
                title="Parceiros"
                description="Gerenciar empresas parceiras ativas nesta unidade de negócio"
              />
            </div>
          </div>
        </div>
      </div>
    </HubLayout>
  );
}
