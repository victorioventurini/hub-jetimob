import { Link } from "react-router-dom";
import {
  Target,
  BarChart3,
  Calendar,
  FileText,
  Briefcase,
  Users,
  Building2,
  Settings,
  Plug,
  Box,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useModules } from "@/hooks/useHomeData";
import { EmptyState } from "@/components/ui/empty-state";

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  target: Target,
  "bar-chart-3": BarChart3,
  calendar: Calendar,
  "file-text": FileText,
  briefcase: Briefcase,
  users: Users,
  "building-2": Building2,
  settings: Settings,
  plug: Plug,
  box: Box,
};

// Color map for modules
const colorMap: Record<string, string> = {
  okrs: "from-blue-500 to-blue-600",
  metrics: "from-emerald-500 to-emerald-600",
  kpis: "from-emerald-500 to-emerald-600",
  cycles: "from-violet-500 to-violet-600",
  docs: "from-amber-500 to-amber-600",
  projects: "from-rose-500 to-rose-600",
  users: "from-cyan-500 to-cyan-600",
  teams: "from-indigo-500 to-indigo-600",
  assets: "from-orange-500 to-orange-600",
};

function getIconComponent(iconName: string): LucideIcon {
  const normalized = iconName?.toLowerCase().replace(/_/g, "-") || "box";
  return iconMap[normalized] || Box;
}

function getColorClass(moduleSlug: string): string {
  const slug = moduleSlug?.toLowerCase() || "";
  return colorMap[slug] || "from-gray-500 to-gray-600";
}

export function ModulesBlock() {
  const { data: modules, isLoading } = useModules();

  if (isLoading) {
    return (
      <section className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border p-5">
              <Skeleton className="h-12 w-12 rounded-xl mb-4" />
              <Skeleton className="h-5 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!modules || modules.length === 0) {
    return (
      <section className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Módulos</h2>
        </div>
        <EmptyState
          icon={Box}
          title="Nenhum módulo disponível"
          description="Não há módulos configurados para exibição."
          compact
        />
      </section>
    );
  }

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
          const Icon = getIconComponent(module.icon);
          const isComingSoon = module.status === "coming_soon";
          const colorClass = getColorClass(module.id);

          return (
            <Link
              key={module.id}
              to={isComingSoon ? "#" : module.route}
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
                  colorClass
                )}
              />
              <div className="relative">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                    "bg-gradient-to-br shadow-sm",
                    colorClass
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
