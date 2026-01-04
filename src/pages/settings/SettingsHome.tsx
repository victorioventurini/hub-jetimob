import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  Target,
  BarChart3,
  Users,
  UsersRound,
  Building2,
  Blocks,
  Puzzle,
  ChevronRight,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickAccessCardProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  title: string;
  description: string;
}

function QuickAccessCard({ to, icon: Icon, iconBgColor, title, description }: QuickAccessCardProps) {
  return (
    <Link to={to} className="block">
      <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${iconBgColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function SettingsHome() {
  usePageTitle("Configurações do Hub", { skipBu: true });

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Painel de Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as configurações globais do Hub Jetimob
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Jetimobers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              Ativos no Hub
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Business Units
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3 text-primary" />
              Ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Times
            </CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3 text-primary" />
              Cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access - Jetimob */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Gestão Jetimob</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <QuickAccessCard
            to="/settings/okrs"
            icon={Target}
            iconBgColor="bg-violet-500/10 text-violet-500"
            title="OKRs"
            description="Objetivos e resultados-chave"
          />
          <QuickAccessCard
            to="/settings/kpis"
            icon={BarChart3}
            iconBgColor="bg-blue-500/10 text-blue-500"
            title="KPIs"
            description="Indicadores de performance"
          />
          <QuickAccessCard
            to="/settings/jetimobers"
            icon={Users}
            iconBgColor="bg-emerald-500/10 text-emerald-500"
            title="Jetimobers"
            description="Gerenciar colaboradores"
          />
          <QuickAccessCard
            to="/settings/teams"
            icon={UsersRound}
            iconBgColor="bg-amber-500/10 text-amber-500"
            title="Times"
            description="Estrutura organizacional"
          />
        </div>
      </div>

      {/* Quick Access - Plataforma */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Plataforma</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <QuickAccessCard
            to="/settings/bus"
            icon={Building2}
            iconBgColor="bg-green-500/10 text-green-500"
            title="Business Units"
            description="Gerenciar BUs"
          />
          <QuickAccessCard
            to="/settings/modules"
            icon={Blocks}
            iconBgColor="bg-purple-500/10 text-purple-500"
            title="Módulos"
            description="Ativar/desativar módulos"
          />
          <QuickAccessCard
            to="/settings/integrations"
            icon={Puzzle}
            iconBgColor="bg-orange-500/10 text-orange-500"
            title="Integrações"
            description="APIs e conexões"
          />
        </div>
      </div>
    </div>
  );
}
