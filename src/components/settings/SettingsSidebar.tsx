import { NavLink, useLocation } from "react-router-dom";
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
  Briefcase,
  Bell,
  Users,
  Palette,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  external?: boolean;
}

function NavItem({ to, icon: Icon, label, external }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;
  const { setOpenMobile, isMobile } = useSidebar();

  const handleClick = () => {
    // Close mobile sidebar on navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  if (external) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <a
            href={to}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </div>
            <ExternalLink className="h-4 w-4 opacity-50" />
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <NavLink
          to={to}
          onClick={handleClick}
          className={cn(
            "flex items-center gap-3",
            isActive && "font-medium"
          )}
        >
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SettingsSidebar() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Início */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <NavItem to="/hub" icon={Home} label="Início" />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Plataforma Section */}
      <SidebarGroup>
        <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <NavItem to="/hub/business-units" icon={Building2} label="Unidades de Negócio" />
            <NavItem to="/hub/modules" icon={Blocks} label="Módulos" />
            <NavItem to="/hub/integrations" icon={Puzzle} label="Integrações" />
            <NavItem to="/hub/automations" icon={Workflow} label="Automações" />
            <NavItem to="/hub/permissions" icon={Shield} label="Permissões" />
            <NavItem to="/hub/job-titles" icon={Briefcase} label="Cargos" />
            <NavItem to="/hub/users" icon={Users} label="Usuários" />
            <NavItem to="/hub/notifications" icon={Bell} label="Notificações" />
            <NavItem to="/hub/ui" icon={Palette} label="Catálogo UI" />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Recursos Section */}
      <SidebarGroup>
        <SidebarGroupLabel>Recursos</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <NavItem
              to="https://docs.jetimob.com"
              icon={BookOpen}
              label="Conhecimento"
              external
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}
