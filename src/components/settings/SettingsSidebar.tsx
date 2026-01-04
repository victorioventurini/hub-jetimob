import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Target,
  BarChart3,
  Users,
  UsersRound,
  BookOpen,
  ExternalLink,
  Building2,
  Blocks,
  Puzzle,
} from "lucide-react";

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  external?: boolean;
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
          "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
}

function NavGroup({ title, children }: NavGroupProps) {
  return (
    <div className="space-y-1">
      <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {children}
    </div>
  );
}

export function SettingsSidebar() {
  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Logo / Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            H
          </div>
          <div>
            <p className="font-semibold text-foreground">Hub</p>
            <p className="text-sm text-muted-foreground">Configurações Globais</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6">
        {/* Home */}
        <div>
          <NavItem to="/settings" icon={Home} label="Home" />
        </div>

        {/* Plataforma Section */}
        <NavGroup title="Plataforma">
          <NavItem to="/business-units" icon={Building2} label="Business Units" />
          <NavItem to="/modules" icon={Blocks} label="Módulos" />
          <NavItem to="/settings/integrations" icon={Puzzle} label="Integrações" />
        </NavGroup>

        {/* Recursos Section */}
        <NavGroup title="Recursos">
          <NavItem
            to="https://docs.jetimob.com"
            icon={BookOpen}
            label="Conhecimento"
            external
          />
        </NavGroup>
      </nav>
    </aside>
  );
}
