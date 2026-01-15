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
  ExternalLink,
  LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface HubGlobalMobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  { name: "Notificações", href: "/hub/notifications", icon: Bell },
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

export function HubGlobalMobileSidebar({ open, onOpenChange }: HubGlobalMobileSidebarProps) {
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

    if (external) {
      return (
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
          <Icon className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium truncate flex-1">{name}</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-50" />
        </a>
      );
    }

    return (
      <Link
        to={href}
        onClick={() => onOpenChange(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200",
          "hover:bg-muted",
          isActive && "bg-primary text-primary-foreground hover:bg-primary",
          !isActive && "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium truncate">{name}</span>
      </Link>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="left" className="w-[280px] p-0 bg-background">
        <SheetHeader className="h-16 border-b border-border px-4 flex flex-row items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            H
          </div>
          <SheetTitle className="flex flex-col items-start">
            <span className="text-lg font-bold text-foreground">Hub</span>
            <span className="text-xs text-muted-foreground font-normal">Configurações Globais</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
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
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Plataforma
            </p>
            {platformItems.map((item) => (
              <NavItem key={item.href} name={item.name} href={item.href} icon={item.icon} />
            ))}
          </div>

          {/* Recursos */}
          <div className="pt-4 mt-4 border-t border-border space-y-1">
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recursos
            </p>
            {externalLinks.map((item) => (
              <NavItem key={item.href} name={item.name} href={item.href} icon={item.icon} external />
            ))}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
