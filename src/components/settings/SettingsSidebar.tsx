import { NavLink, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  ExternalLink,
  Building2,
  Blocks,
  Puzzle,
  Workflow,
  Shield,
} from "lucide-react";

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  external?: boolean;
  preserveParams?: boolean;
}

function NavItem({ to, icon: Icon, label, external }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </div>
        <ExternalLink className="h-4 w-4 opacity-50" />
      </a>
    );
  }

  return (
    <NavLink
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}

export function SettingsSidebar() {
  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {/* Home */}
      <div>
        <NavItem to="/hub" icon={Home} label="Home" />
      </div>

      {/* Plataforma Section */}
      <div className="pt-4 mt-4 border-t border-border space-y-1">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Plataforma
        </p>
        <NavItem to="/hub/business-units" icon={Building2} label="Business Units" />
        <NavItem to="/hub/modules" icon={Blocks} label="Módulos" />
        <NavItem to="/hub/integrations" icon={Puzzle} label="Integrações" />
        <NavItem to="/hub/automations" icon={Workflow} label="Automações" />
        <NavItem to="/hub/permissions" icon={Shield} label="Permissões" />
      </div>

      {/* Recursos Section */}
      <div className="pt-4 mt-4 border-t border-border space-y-1">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Recursos
        </p>
        <NavItem
          to="https://docs.jetimob.com"
          icon={BookOpen}
          label="Conhecimento"
          external
        />
      </div>
    </nav>
  );
}
