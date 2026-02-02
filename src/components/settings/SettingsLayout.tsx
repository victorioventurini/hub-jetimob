import { ReactNode, useEffect, useState } from "react";
import { HubGlobalSidebar } from "../layout/HubGlobalSidebar";
import { HubGlobalMobileSidebar } from "../layout/HubGlobalMobileSidebar";
import { Menu } from "lucide-react";
import { NotificationCenter } from "@/components/notifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Building2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SettingsLayoutProps {
  children: ReactNode;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  team_leader: "Líder de Time",
  collaborator: "Colaborador",
};

interface SettingsHeaderProps {
  sidebarCollapsed: boolean;
  onMobileMenuToggle: () => void;
}

function SettingsHeader({ sidebarCollapsed, onMobileMenuToggle }: SettingsHeaderProps) {
  const { profile, role, signOut } = useAuth();
  const { hasMultipleBus } = useBu();

  const displayName = profile?.display_name || "Jetimober";
  const email = profile?.work_email || "";
  const roleLabel = role ? roleLabels[role] : "Colaborador";

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
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-full px-4 lg:px-8">
        {/* Mobile menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMobileMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* BU Selector button - only show if user has multiple BUs */}
          {hasMultipleBus && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 hidden sm:flex"
              asChild
            >
              <Link to="/select-bu">
                <Building2 className="h-4 w-4" />
                <span className="hidden md:inline">Selecionar BU</span>
              </Link>
            </Button>
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
              <DropdownMenuLabel className="cursor-default">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium no-underline">{displayName}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hasMultipleBus && (
                <>
                  <DropdownMenuItem asChild className="sm:hidden">
                    <Link to="/select-bu" className="cursor-pointer">
                      <Building2 className="h-4 w-4 mr-2" />
                      Selecionar BU
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="sm:hidden" />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Meu Perfil
                </Link>
              </DropdownMenuItem>
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

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Fecha menu mobile ao navegar entre páginas
  // Nota: cleanup de pointer-events centralizado em useRadixFocusRecovery (App.tsx)
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <HubGlobalSidebar 
        collapsed={sidebarCollapsed} 
        onCollapse={setSidebarCollapsed} 
      />
      
      {/* Mobile Sidebar (Sheet) */}
      <HubGlobalMobileSidebar 
        open={mobileMenuOpen} 
        onOpenChange={setMobileMenuOpen} 
      />
      
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        <SettingsHeader 
          sidebarCollapsed={sidebarCollapsed} 
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
