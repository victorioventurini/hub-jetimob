import { Menu, LogOut, User, Settings, Building2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import { BuSelector } from "@/modules/bu/components/BuSelector";
import { NotificationCenter } from "@/components/notifications";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

interface HeaderProps {
  sidebarCollapsed: boolean;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  team_leader: "Líder de Time",
  collaborator: "Colaborador",
};

export function Header({ sidebarCollapsed }: HeaderProps) {
  const { profile, role, signOut } = useAuth();
  const { userRole } = useBu();
  const location = useLocation();
  const navigate = useNavigate();
  const isHubPage = location.pathname.startsWith("/hub");
  
  // Admin de BU ou super_admin podem acessar configurações
  const canAccessSettings = role === "super_admin" || role === "admin" || userRole === "admin";

  const displayName = profile?.display_name || "Jetimober";
  const email = profile?.work_email || "";
  const roleLabel =
    userRole === "admin" || userRole === "super_admin"
      ? "Administrador da BU"
      : role
        ? roleLabels[role]
        : "Colaborador";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Você saiu do Hub");
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border",
        "transition-all duration-300 ease-in-out",
        isHubPage 
          ? "left-0" 
          : cn("left-0 lg:left-64", sidebarCollapsed && "lg:left-20")
      )}
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-8">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md">
          <GlobalSearch />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* BU Selector - Show button on hub, dropdown elsewhere */}
          {isHubPage ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate("/select-bu")}
            >
              <Building2 className="h-4 w-4" />
              Selecionar BU
            </Button>
          ) : (
            <BuSelector />
          )}

          {/* Notifications */}
          <NotificationCenter />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.photo_url || undefined} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{displayName}</span>
                  <span className="text-xs text-muted-foreground">{roleLabel}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{displayName}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Meu Perfil
                </Link>
              </DropdownMenuItem>
              {canAccessSettings && (
                <DropdownMenuItem asChild>
                  <Link to="/hub" className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
