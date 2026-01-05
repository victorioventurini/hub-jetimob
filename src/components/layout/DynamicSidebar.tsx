import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useBuBranding } from "@/modules/bu/hooks/useBuBranding";
import { useModules } from "@/contexts/ModuleContext";
import { useBu } from "@/contexts/BuContext";
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
  Briefcase,
  FileText,
  User,
  BookOpen,
  ExternalLink,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface DynamicSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

// Mapeamento de ícones por slug
const iconMap: Record<string, LucideIcon> = {
  "business-units": Briefcase,
  users: Users,
  profile: User,
  audit: Shield,
  integrations: Plug,
  teams: Building2,
  okrs: Target,
  metrics: BarChart3,
  kpis: BarChart3,
  cycles: Calendar,
  projects: Briefcase,
  docs: FileText,
  modules: LayoutGrid,
  "modules-admin": LayoutGrid,
  settings: Settings,
  assets: Briefcase,
};

// Itens fixos (sempre aparecem)
const fixedItems = [
  { name: "Home", href: "/", icon: Home },
];

// Menu dentro da BU - ordem específica
const buMenuItems = [
  { name: "OKRs", href: "/okrs", icon: Target, slug: "okrs" },
  { name: "KPIs", href: "/kpis", icon: BarChart3, slug: "kpis" },
  { name: "Assets", href: "/assets", icon: Briefcase, slug: "assets" },
  { name: "Jetimobers", href: "/users", icon: Users, slug: "users" },
  { name: "Teams", href: "/teams", icon: Building2, slug: "teams" },
];

// Links externos
const externalLinks = [
  { 
    name: "Conhecimento", 
    href: "https://www.notion.so/jetimobers/Jetimob-048e92e141744cc9b78435b8987f3566", 
    icon: BookOpen 
  },
];

// Itens admin - só aparecem na área GLOBAL (sem BU selecionada)
const globalAdminItems: { name: string; href: string; icon: LucideIcon }[] = [
  // Menu de admin foi movido para módulos globais no banco
];

export function DynamicSidebar({ collapsed, onCollapse }: DynamicSidebarProps) {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { currentBu } = useBu();
  const { symbolUrl, buName, primaryColor } = useBuBranding();
  const { globalModules, enabledOperationalModules, isLoading } = useModules();

  const NavItem = ({ 
    name, 
    href, 
    icon: Icon,
    external = false,
  }: { 
    name: string; 
    href: string; 
    icon: LucideIcon;
    external?: boolean;
  }) => {
    const isActive = !external && (location.pathname === href || 
      (href !== "/" && location.pathname.startsWith(href)));

    const linkContent = external ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "hover:bg-sidebar-accent",
          "text-sidebar-foreground/70 hover:text-sidebar-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
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
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "hover:bg-sidebar-accent",
          isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary",
          !isActive && "text-sidebar-foreground/70 hover:text-sidebar-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <span className="text-sm font-medium truncate">{name}</span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const renderModuleItem = (module: { name: string; slug: string; route: string | null }) => {
    const Icon = iconMap[module.slug] || LayoutGrid;
    const href = module.route || `/${module.slug}`;
    return <NavItem key={module.slug} name={module.name} href={href} icon={Icon} />;
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
        {/* Logo - Dynamic BU Branding */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3">
            <Avatar className="w-10 h-10 rounded-xl">
              <AvatarImage
                src={symbolUrl || undefined}
                alt={buName}
                className="object-contain"
              />
              <AvatarFallback
                className="rounded-xl text-xl font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {buName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold text-sidebar-foreground">Hub</span>
                <span className="text-xs text-sidebar-foreground/60">{buName}</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Itens fixos */}
              <div className="space-y-1">
                {fixedItems.map((item) => (
                  <NavItem key={item.href} name={item.name} href={item.href} icon={item.icon} />
                ))}
              </div>

              {/* Módulos Globais - apenas quando NÃO há BU selecionada */}
              {!currentBu && globalModules.length > 0 && (
                <div className="pt-4 mt-4 border-t border-sidebar-border space-y-1">
                  {!collapsed && (
                    <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                      Geral
                    </p>
                  )}
                  {globalModules
                    .filter((m) => !["profile"].includes(m.slug)) // Profile fica no header
                    .map(renderModuleItem)}
                </div>
              )}

              {/* Menu da BU (ordem fixa) */}
              {currentBu && (
                <div className="pt-4 mt-4 border-t border-sidebar-border space-y-1">
                  {!collapsed && (
                    <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                      {currentBu.name}
                    </p>
                  )}
                  {buMenuItems.map((item) => (
                    <NavItem key={item.href} name={item.name} href={item.href} icon={item.icon} />
                  ))}
                </div>
              )}

              {/* Admin Only - Apenas na área GLOBAL (sem BU selecionada) */}
              {isAdmin && !currentBu && globalAdminItems.length > 0 && (
                <div className="pt-4 mt-4 border-t border-sidebar-border space-y-1">
                  {!collapsed && (
                    <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                      Admin
                    </p>
                  )}
                  {globalAdminItems.map((item) => (
                    <NavItem key={item.href} name={item.name} href={item.href} icon={item.icon} />
                  ))}
                </div>
              )}

              {/* Links Externos */}
              <div className="pt-4 mt-4 border-t border-sidebar-border space-y-1">
                {!collapsed && (
                  <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    Recursos
                  </p>
                )}
                {externalLinks.map((item) => (
                  <NavItem key={item.href} name={item.name} href={item.href} icon={item.icon} external />
                ))}
              </div>
            </>
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
