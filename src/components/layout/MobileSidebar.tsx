import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useBuBranding } from "@/modules/bu/hooks/useBuBranding";
import { useModules } from "@/contexts/ModuleContext";
import { useBu } from "@/contexts/BuContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
import { useFavoriteLinks } from "@/shared/saved-links";
import {
  Home,
  Users,
  Building2,
  Target,
  Settings,
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
  Bell,
  Rocket,
  X,
  Layers,
  Network,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mapeamento de ícones por slug
const iconMap: Record<string, LucideIcon> = {
  "business-units": Briefcase,
  users: Users,
  profile: User,
  audit: Shield,
  integrations: Plug,
  teams: Building2,
  areas: Layers,
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
  tickets: FileText,
  wizards: Rocket,
};

// Itens fixos (sempre aparecem)
const fixedItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Rituais", href: "/wizards", icon: Rocket },
];

// Menu dentro da BU - ordem específica (módulos operacionais)
const buMenuItems = [
  { name: "OKRs", href: "/okrs", icon: Target, slug: "okrs" },
  { name: "KPIs", href: "/kpis", icon: BarChart3, slug: "kpis" },
  { name: "Tickets", href: "/tickets", icon: FileText, slug: "tickets" },
  { name: "Assets", href: "/assets", icon: Briefcase, slug: "assets" },
  { name: "Teams", href: "/teams", icon: Building2, slug: "teams" },
];

// Módulos globais que aparecem sempre (mesmo com BU selecionada)
const globalBuItems = [
  { name: "Jetimobers", href: "/users", icon: Users, slug: "users" },
];

// Links externos
const externalLinks = [
  { 
    name: "Conhecimento", 
    href: "https://www.notion.so/jetimobers/Jetimob-048e92e141744cc9b78435b8987f3566", 
    icon: BookOpen 
  },
];

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { currentBu, userRole } = useBu();
  const { symbolUrl, buName, primaryColor } = useBuBranding();
  const { globalModules, enabledOperationalModules, isLoading } = useModules();
  const { hasModuleAccess, isLoading: permissionsLoading } = useModuleAccess();
  const { isImpersonating } = useOptionalImpersonation();
  const { getFavoriteHref } = useFavoriteLinks();
  
  // Check if user is BU admin or higher
  // IMPORTANTE: Durante impersonação, NÃO conceder acesso admin - simular experiência real
  const isBuAdmin = !isImpersonating && (userRole === "admin" || isAdmin);

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

    const handleClick = () => {
      if (!external) {
        onOpenChange(false);
      }
    };

    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200",
            "hover:bg-accent active:bg-accent",
            "text-foreground/70 hover:text-foreground",
            "min-h-[44px]" // Touch target
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium truncate flex-1">{name}</span>
          <ExternalLink className="h-4 w-4 opacity-50" />
        </a>
      );
    }

    return (
      <Link
        to={href}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200",
          "hover:bg-accent active:bg-accent",
          isActive && "bg-primary text-primary-foreground hover:bg-primary",
          !isActive && "text-foreground/70 hover:text-foreground",
          "min-h-[44px]" // Touch target
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium truncate">{name}</span>
      </Link>
    );
  };

  const renderModuleItem = (module: { name: string; slug: string; route: string | null }) => {
    const Icon = iconMap[module.slug] || LayoutGrid;
    const href = module.route || `/${module.slug}`;
    return <NavItem key={module.slug} name={module.name} href={href} icon={Icon} />;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-3">
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
            <div className="flex flex-col text-left">
              <span className="text-lg font-bold">Hub</span>
              <span className="text-xs text-muted-foreground font-normal">{buName}</span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {isLoading || permissionsLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
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
                <div className="pt-4 mt-4 border-t space-y-1">
                  <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Geral
                  </p>
                  {globalModules
                    .filter((m) => !["profile"].includes(m.slug))
                    .map(renderModuleItem)}
                </div>
              )}

              {/* Menu da BU (ordem fixa, filtrado por módulos habilitados + permissões V2) */}
              {currentBu && (
                <div className="pt-4 mt-4 border-t space-y-1">
                  <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {currentBu.name}
                  </p>
                  {/* Módulos operacionais: habilitados + permissão V2 */}
                  {buMenuItems
                    .filter((item) => 
                      enabledOperationalModules.some((m) => m.slug === item.slug) &&
                      hasModuleAccess(item.slug)
                    )
                    .map((item) => (
                      <NavItem key={item.href} name={item.name} href={getFavoriteHref(item.slug, item.href)} icon={item.icon} />
                    ))}
                  {/* Módulos globais que aparecem dentro da BU + permissão V2 */}
                  {globalBuItems
                    .filter((item) => 
                      globalModules.some((m) => m.slug === item.slug) &&
                      hasModuleAccess(item.slug)
                    )
                    .map((item) => (
                      <NavItem key={item.href} name={item.name} href={item.href} icon={item.icon} />
                    ))}
                </div>
              )}

              {/* Links Externos */}
              <div className="pt-4 mt-4 border-t space-y-1">
                <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recursos
                </p>
                {externalLinks.map((item) => (
                  <NavItem key={item.href} name={item.name} href={item.href} icon={item.icon} external />
                ))}
              </div>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}