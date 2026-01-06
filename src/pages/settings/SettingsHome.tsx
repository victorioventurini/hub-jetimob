import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";
import {
  Users,
  Building2,
  Blocks,
  Puzzle,
  ChevronRight,
  Activity,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickAccessCardProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  title: string;
  description: string;
  count?: number;
  loading?: boolean;
}

function QuickAccessCard({ to, icon: Icon, iconBgColor, title, description, count, loading }: QuickAccessCardProps) {
  return (
    <Link to={to} className="block">
      <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${iconBgColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{title}</p>
                {loading ? (
                  <Skeleton className="h-5 w-8 rounded-full" />
                ) : count !== undefined ? (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    {count}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitleIcon: React.ComponentType<{ className?: string }>;
  subtitleIconColor: string;
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, subtitleIcon: SubIcon, subtitleIconColor, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16 mb-1" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <SubIcon className={`h-3 w-3 ${subtitleIconColor}`} />
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

export default function SettingsHome() {
  usePageTitle("Configurações do Hub", { skipBu: true });
  const { currentBu } = useBu();

  // Fetch Business Units count
  const { data: busData, isLoading: busLoading } = useQuery({
    queryKey: ["settings-bus-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("bu_units")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch Modules count
  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    queryKey: ["settings-modules-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("status");
      if (error) throw error;
      const active = data?.filter((m) => m.status === "active").length || 0;
      const total = data?.length || 0;
      return { active, total };
    },
  });

  // Fetch Integrations count
  const { data: integrationsData, isLoading: integrationsLoading } = useQuery({
    queryKey: ["settings-integrations-count"],
    queryFn: async () => {
      const { data: catalog, error: catalogError } = await supabase
        .from("hub_integrations_catalog")
        .select("integration_key, status");
      if (catalogError) throw catalogError;
      
      const { data: globalConfig, error: globalError } = await supabase
        .from("hub_integrations_global_config")
        .select("integration_key, is_enabled_global");
      if (globalError) throw globalError;
      
      const total = catalog?.length || 0;
      const enabled = globalConfig?.filter((c) => c.is_enabled_global).length || 0;
      return { total, enabled };
    },
  });

  // Fetch Profiles count - scoped to current BU
  const { data: profilesData, isLoading: profilesLoading } = useQuery({
    queryKey: ["settings-profiles-count", currentBu?.id],
    queryFn: async () => {
      if (!currentBu?.id) return 0;
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("bu_id", currentBu.id)
        .eq("employment_status", "active")
        .is("deleted_at", null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentBu?.id,
  });

  // Fetch Teams count - scoped to current BU
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["settings-teams-count", currentBu?.id],
    queryFn: async () => {
      if (!currentBu?.id) return 0;
      const { count, error } = await supabase
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("bu_id", currentBu.id)
        .eq("status", "active")
        .is("deleted_at", null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentBu?.id,
  });

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Painel de Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as configurações globais do Hub
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Business Units"
          value={busData ?? 0}
          subtitle="Ativas"
          icon={Building2}
          subtitleIcon={Activity}
          subtitleIconColor="text-green-500"
          loading={busLoading}
        />
        <StatCard
          title="Módulos"
          value={`${modulesData?.active ?? 0}/${modulesData?.total ?? 0}`}
          subtitle="Ativos"
          icon={Blocks}
          subtitleIcon={CheckCircle2}
          subtitleIconColor="text-primary"
          loading={modulesLoading}
        />
        <StatCard
          title="Integrações"
          value={`${integrationsData?.enabled ?? 0}/${integrationsData?.total ?? 0}`}
          subtitle="Habilitadas"
          icon={Puzzle}
          subtitleIcon={Zap}
          subtitleIconColor="text-orange-500"
          loading={integrationsLoading}
        />
        <StatCard
          title="Usuários"
          value={profilesData ?? 0}
          subtitle="Ativos"
          icon={Users}
          subtitleIcon={Activity}
          subtitleIconColor="text-blue-500"
          loading={profilesLoading}
        />
      </div>

      {/* Quick Access - Plataforma */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Configurações da Plataforma</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <QuickAccessCard
            to="/settings/business-units"
            icon={Building2}
            iconBgColor="bg-green-500/10 text-green-500"
            title="Business Units"
            description="Gerenciar unidades de negócio"
            count={busData}
            loading={busLoading}
          />
          <QuickAccessCard
            to="/settings/modules"
            icon={Blocks}
            iconBgColor="bg-purple-500/10 text-purple-500"
            title="Módulos"
            description="Configurar módulos do Hub"
            count={modulesData?.total}
            loading={modulesLoading}
          />
          <QuickAccessCard
            to="/settings/integrations"
            icon={Puzzle}
            iconBgColor="bg-orange-500/10 text-orange-500"
            title="Integrações"
            description="APIs e conexões externas"
            count={integrationsData?.total}
            loading={integrationsLoading}
          />
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Business Units ativas</span>
              {busLoading ? <Skeleton className="h-4 w-8" /> : <span className="font-medium">{busData}</span>}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Módulos ativos</span>
              {modulesLoading ? <Skeleton className="h-4 w-8" /> : <span className="font-medium">{modulesData?.active}</span>}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Integrações habilitadas</span>
              {integrationsLoading ? <Skeleton className="h-4 w-8" /> : <span className="font-medium">{integrationsData?.enabled}</span>}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Usuários ativos</span>
              {profilesLoading ? <Skeleton className="h-4 w-8" /> : <span className="font-medium">{profilesData}</span>}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Times ativos</span>
              {teamsLoading ? <Skeleton className="h-4 w-8" /> : <span className="font-medium">{teamsData}</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              to="/settings/business-units"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-green-500" />
                <span>Criar nova Business Unit</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/settings/modules"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <Blocks className="h-4 w-4 text-purple-500" />
                <span>Gerenciar módulos</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/settings/integrations"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <Puzzle className="h-4 w-4 text-orange-500" />
                <span>Configurar integrações</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
