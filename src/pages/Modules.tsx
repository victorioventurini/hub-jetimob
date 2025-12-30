import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Target,
  BarChart3,
  Calendar,
  FileText,
  Briefcase,
  Settings,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Module {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  version: string;
  owner: string;
  status: "active" | "inactive" | "coming_soon";
  healthStatus: "healthy" | "degraded" | "down";
  lastUpdated: string;
}

const modules: Module[] = [
  {
    id: "1",
    name: "OKRs",
    slug: "okrs",
    description: "Gestão de Objetivos e Resultados-Chave para alinhamento estratégico",
    icon: Target,
    version: "1.2.0",
    owner: "Ricardo Mendes",
    status: "active",
    healthStatus: "healthy",
    lastUpdated: "2024-01-15",
  },
  {
    id: "2",
    name: "Métricas",
    slug: "metrics",
    description: "Registry central de KPIs e indicadores oficiais da empresa",
    icon: BarChart3,
    version: "1.0.0",
    owner: "Ana Costa",
    status: "active",
    healthStatus: "healthy",
    lastUpdated: "2024-01-10",
  },
  {
    id: "3",
    name: "Ciclos",
    slug: "cycles",
    description: "Gestão de quarters, planejamento e retrospectivas",
    icon: Calendar,
    version: "1.1.0",
    owner: "Lucas Oliveira",
    status: "active",
    healthStatus: "healthy",
    lastUpdated: "2024-01-12",
  },
  {
    id: "4",
    name: "Documentos",
    slug: "docs",
    description: "Base de conhecimento e documentação interna",
    icon: FileText,
    version: "0.1.0",
    owner: "Carolina Nunes",
    status: "coming_soon",
    healthStatus: "healthy",
    lastUpdated: "-",
  },
  {
    id: "5",
    name: "Projetos",
    slug: "projects",
    description: "Gestão de projetos e iniciativas estratégicas",
    icon: Briefcase,
    version: "0.1.0",
    owner: "Fernanda Lima",
    status: "coming_soon",
    healthStatus: "healthy",
    lastUpdated: "-",
  },
];

const statusConfig = {
  active: {
    label: "Ativo",
    color: "bg-success/10 text-success border-success/20",
  },
  inactive: {
    label: "Inativo",
    color: "bg-muted text-muted-foreground border-muted",
  },
  coming_soon: {
    label: "Em breve",
    color: "bg-accent/10 text-accent border-accent/20",
  },
};

const healthConfig = {
  healthy: {
    label: "Saudável",
    icon: CheckCircle2,
    color: "text-success",
  },
  degraded: {
    label: "Degradado",
    icon: AlertCircle,
    color: "text-warning",
  },
  down: {
    label: "Fora do ar",
    icon: AlertCircle,
    color: "text-destructive",
  },
};

export default function Modules() {
  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Módulos</h1>
            <p className="text-muted-foreground">
              Catálogo de módulos disponíveis no Hub
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {modules.filter((m) => m.status === "active").length}
              </p>
              <p className="text-sm text-muted-foreground">Módulos ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {modules.filter((m) => m.status === "coming_soon").length}
              </p>
              <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {modules.filter((m) => m.healthStatus === "healthy").length}
              </p>
              <p className="text-sm text-muted-foreground">100% saudáveis</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{modules.length}</p>
              <p className="text-sm text-muted-foreground">Total de módulos</p>
            </CardContent>
          </Card>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            const status = statusConfig[module.status];
            const health = healthConfig[module.healthStatus];
            const HealthIcon = health.icon;

            return (
              <Card
                key={module.id}
                className="hover:shadow-lg hover:border-accent/30 transition-all duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-accent/10">
                        <Icon className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {module.name}
                          <Badge variant="outline" className={status.color}>
                            {status.label}
                          </Badge>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          v{module.version} • {module.owner}
                        </p>
                      </div>
                    </div>
                    {module.status === "active" && (
                      <Switch checked={true} />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <HealthIcon className={`h-4 w-4 ${health.color}`} />
                      <span className="text-sm text-muted-foreground">
                        {health.label}
                      </span>
                    </div>
                    {module.status === "active" && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Atualizado em {module.lastUpdated}</span>
                      </div>
                    )}
                  </div>

                  {module.status === "active" && (
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/${module.slug}`}>Acessar</Link>
                      </Button>
                      <Button variant="ghost" size="icon-sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </HubLayout>
  );
}
