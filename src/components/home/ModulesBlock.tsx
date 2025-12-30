import { Link } from "react-router-dom";
import { Target, BarChart3, Calendar, FileText, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  status: "active" | "coming_soon";
  color: string;
}

const modules: Module[] = [
  {
    id: "okrs",
    name: "OKRs",
    description: "Objetivos e Resultados-Chave",
    icon: Target,
    href: "/okrs",
    status: "active",
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "metrics",
    name: "Métricas",
    description: "KPIs e indicadores oficiais",
    icon: BarChart3,
    href: "/metrics",
    status: "active",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    id: "cycles",
    name: "Ciclos",
    description: "Planejamento e retrospectivas",
    icon: Calendar,
    href: "/cycles",
    status: "active",
    color: "from-violet-500 to-violet-600",
  },
  {
    id: "docs",
    name: "Documentos",
    description: "Base de conhecimento",
    icon: FileText,
    href: "/docs",
    status: "coming_soon",
    color: "from-amber-500 to-amber-600",
  },
  {
    id: "projects",
    name: "Projetos",
    description: "Gestão de projetos",
    icon: Briefcase,
    href: "/projects",
    status: "coming_soon",
    color: "from-rose-500 to-rose-600",
  },
];

export function ModulesBlock() {
  return (
    <section className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Módulos</h2>
        <Link
          to="/modules"
          className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
        >
          Ver todos
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          const isComingSoon = module.status === "coming_soon";

          return (
            <Link
              key={module.id}
              to={isComingSoon ? "#" : module.href}
              className={cn(
                "group relative overflow-hidden rounded-xl p-5 transition-all duration-300",
                "bg-card border border-border hover:border-accent/30",
                "hover:shadow-lg hover:-translate-y-1",
                isComingSoon && "opacity-60 cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300",
                  "bg-gradient-to-br",
                  module.color
                )}
              />
              <div className="relative">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                    "bg-gradient-to-br shadow-sm",
                    module.color
                  )}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {module.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {module.description}
                </p>
                {isComingSoon && (
                  <span className="inline-block mt-3 px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                    Em breve
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
