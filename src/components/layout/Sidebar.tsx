import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  Home,
  Users,
  Building2,
  Target,
  Settings,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  BarChart3,
  Calendar,
  Plug,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Jetimobers", href: "/users", icon: Users },
  { name: "Times", href: "/teams", icon: Building2 },
  { name: "Módulos", href: "/modules", icon: LayoutGrid },
  { name: "OKRs", href: "/okrs", icon: Target },
  { name: "Métricas", href: "/metrics", icon: BarChart3 },
  { name: "Ciclos", href: "/cycles", icon: Calendar },
  { name: "Integrações", href: "/integrations", icon: Plug },
];

const adminNavigation = [
  { name: "Configurações", href: "/settings", icon: Settings },
  { name: "Auditoria", href: "/audit", icon: Shield },
];

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const NavItem = ({ item }: { item: typeof navigation[0] }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "hover:bg-sidebar-accent",
          isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary",
          !isActive && "text-sidebar-foreground/70 hover:text-sidebar-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <span className="text-sm font-medium truncate">{item.name}</span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <>
      {/* Mobile overlay */}
      <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden hidden" />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen bg-sidebar border-r border-sidebar-border",
          "transition-all duration-300 ease-in-out",
          "hidden lg:flex lg:flex-col",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <span className="text-xl font-bold text-sidebar-primary-foreground">J</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold text-sidebar-foreground">Hub</span>
                <span className="text-xs text-sidebar-foreground/60">Jetimob</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-sidebar-border space-y-1">
              {!collapsed && (
                <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Admin
                </p>
              )}
              {adminNavigation.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          )}
        </nav>

        {/* Collapse button */}
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="sidebar"
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
    </>
  );
}
