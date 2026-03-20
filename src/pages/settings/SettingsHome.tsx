import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/globalClient";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
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
import { PageHeader } from "@/components/ui/page-header";

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
  usePageTitle("Configurações do Hub", { 
    skipBu: true, 
    customDescription: "Painel central de configurações globais do Hub." 
  });
  const { currentBu } = useBu();

  // Fetch Business Units count
  const { data: busData, isLoading: busLoading } = useQuery({
    queryKey: queryKeys.settings.busCount(),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("bu_units")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch Modules count - optimized with parallel count queries
  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    queryKey: queryKeys.settings.modulesCount(),
    queryFn: async () => {
      const [activeResult, totalResult] = await Promise.all([
        supabase
          .from("modules")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("modules")
          .select("id", { count: "exact", head: true }),
      ]);
      if (activeResult.error) throw activeResult.error;
      if (totalResult.error) throw totalResult.error;
      return { active: activeResult.count || 0, total: totalResult.count || 0 };
    },
  });

  // Fetch Integrations count - optimized with parallel count queries
  const { data: integrationsData, isLoading: integrationsLoading } = useQuery({
    queryKey: queryKeys.settings.integrationsCount(),
    queryFn: async () => {
      const [catalogResult, enabledResult] = await Promise.all([
        supabase
          .from("hub_integrations_catalog")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("hub_integrations_global_config")
          .select("id", { count: "exact", head: true })
          .eq("is_enabled_global", true),
      ]);
      if (catalogResult.error) throw catalogResult.error;
      if (enabledResult.error) throw enabledResult.error;
      return { total: catalogResult.count || 0, enabled: enabledResult.count || 0 };
    },
  });

  // Fetch Profiles count - scoped to current BU using canonical view
  const { data: profilesData, isLoading: profilesLoading } = useQuery({
    queryKey: queryKeys.settings.profilesCount(currentBu?.id ?? null),
    queryFn: async () => {
      if (!currentBu?.id) return 0;
      const { count, error } = await supabase
        .from("v_bu_active_profiles")
        .select("*", { count: "exact", head: true })
        .eq("bu_id", currentBu.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentBu?.id,
  });

  // Fetch Teams count - scoped to current BU
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: queryKeys.settings.teamsCount(currentBu?.id ?? null),
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
      <PageHeader
        title="Painel de Configurações"
        description="Gerencie as configurações globais do Hub"
        breadcrumbs={[{ label: "Configurações" }]}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Business Units"
          value={busData ?? 0}
          subtitle="Ativas"
          icon={Building2}
          subtitleIcon={Activity}
          subtitleIconColor="text-success"
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
          subtitleIconColor="text-status-orange"
          loading={integrationsLoading}
        />
        <StatCard
          title="Usuários"
          value={profilesData ?? 0}
          subtitle="Ativos"
          icon={Users}
          subtitleIcon={Activity}
          subtitleIconColor="text-info"
          loading={profilesLoading}
        />
      </div>

      {/* Quick Access - Plataforma */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Configurações da Plataforma</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <QuickAccessCard
            to="/hub/business-units"
            icon={Building2}
            iconBgColor="bg-success-muted text-success"
            title="Business Units"
            description="Gerenciar unidades de negócio"
            count={busData}
            loading={busLoading}
          />
          <QuickAccessCard
            to="/hub/modules"
            icon={Blocks}
            iconBgColor="bg-status-purple-muted text-status-purple"
            title="Módulos"
            description="Configurar módulos do Hub"
            count={modulesData?.total}
            loading={modulesLoading}
          />
          <QuickAccessCard
            to="/hub/integrations"
            icon={Puzzle}
            iconBgColor="bg-status-orange-muted text-status-orange"
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
              to="/hub/business-units"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-success" />
                <span>Criar nova Business Unit</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/hub/modules"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <Blocks className="h-4 w-4 text-status-purple" />
                <span>Gerenciar módulos</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/hub/integrations"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
            >
              <div className="flex items-center gap-2">
                <Puzzle className="h-4 w-4 text-status-orange" />
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
