import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Building2,
  Blocks,
  Puzzle,
  Workflow,
  Shield,
  Briefcase,
  Bell,
  Users,
  Palette,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Activity,
  Handshake,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HubGlobalSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

// Itens do menu principal
const mainItems = [
  { name: "Início", href: "/hub", icon: Home, exact: true },
];

// Itens da seção Plataforma
const platformItems = [
  { name: "Unidades de Negócio", href: "/hub/business-units", icon: Building2 },
  { name: "Módulos", href: "/hub/modules", icon: Blocks },
  { name: "Integrações", href: "/hub/integrations", icon: Puzzle },
  { name: "Automações", href: "/hub/automations", icon: Workflow },
  { name: "Permissões", href: "/hub/permissions", icon: Shield },
  { name: "Cargos", href: "/hub/job-titles", icon: Briefcase },
  { name: "Usuários", href: "/hub/users", icon: Users },
  { name: "Parceiros", href: "/hub/partners", icon: Handshake },
  { name: "Notificações", href: "/hub/notifications", icon: Bell },
  { name: "Performance", href: "/hub/performance", icon: Activity },
  { name: "Catálogo UI", href: "/hub/ui", icon: Palette },
];

// Links externos
const externalLinks = [
  { 
    name: "Conhecimento", 
    href: "https://docs.jetimob.com", 
    icon: BookOpen 
  },
];

export function HubGlobalSidebar({ collapsed, onCollapse }: HubGlobalSidebarProps) {
  const location = useLocation();

  const NavItem = ({ 
    name, 
    href, 
    icon: Icon,
    external = false,
    exact = false,
  }: { 
    name: string; 
    href: string; 
    icon: LucideIcon;
    external?: boolean;
    exact?: boolean;
  }) => {
    const isActive = !external && (
      exact 
        ? location.pathname === href 
        : (location.pathname === href || location.pathname.startsWith(href + "/"))
    );

    const linkContent = external ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200",
          "hover:bg-muted",
          "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0 pointer-events-none" />
        {!collapsed && (
          <>
            <span className="text-sm font-medium truncate flex-1">{name}</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-50" />
          </>
        )}
      </a>
    ) : (
      <Link
        to={href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200",
          "hover:bg-muted",
          isActive && "bg-primary text-primary-foreground hover:bg-primary",
          !isActive && "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0 pointer-events-none" />
        {!collapsed && (
          <span className="text-sm font-medium truncate">{name}</span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 h-screen bg-background border-r border-border",
        "transition-all duration-300 ease-in-out",
        "hidden lg:flex lg:flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        <Link to="/hub" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            H
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">Hub</span>
              <span className="text-xs text-muted-foreground">Configurações Globais</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto [scrollbar-gutter:stable] p-3 space-y-1">
        {/* Início */}
        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavItem 
              key={item.href} 
              name={item.name} 
              href={item.href} 
              icon={item.icon} 
              exact={item.exact}
            />
          ))}
        </div>

        {/* Plataforma */}
        <div className="pt-4 mt-4 border-t border-border space-y-1">
          {!collapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Plataforma
            </p>
          )}
          {platformItems.map((item) => (
            <NavItem key={item.href} name={item.name} href={item.href} icon={item.icon} />
          ))}
        </div>

        {/* Recursos */}
        <div className="pt-4 mt-4 border-t border-border space-y-1">
          {!collapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recursos
            </p>
          )}
          {externalLinks.map((item) => (
            <NavItem key={item.href} name={item.name} href={item.href} icon={item.icon} external />
          ))}
        </div>
      </nav>

      {/* Collapse button */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className={cn("w-full", collapsed && "px-0 justify-center")}
          onClick={() => onCollapse(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
