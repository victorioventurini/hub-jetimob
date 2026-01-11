import { ReactNode } from "react";
import { SettingsSidebar } from "./SettingsSidebar";
import { Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface SettingsLayoutProps {
  children: ReactNode;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  team_leader: "Líder de Time",
  collaborator: "Colaborador",
};

function SettingsHeader() {
  const { profile, role, signOut } = useAuth();
  const { hasMultipleBus } = useBu();
  const { isMobile } = useSidebar();

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
    <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-full px-4 lg:px-8">
        {/* Mobile menu trigger + Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          {isMobile && (
            <SidebarTrigger className="-ml-1">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          )}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar no Hub..."
              className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

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
                  <span className="text-xs font-normal text-muted-foreground underline">
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

function SettingsSidebarWrapper() {
  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border">
      <SidebarHeader className="h-16 border-b border-border px-4 flex flex-row items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
          H
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-lg font-bold text-foreground">Hub</span>
          <span className="text-xs text-muted-foreground truncate">Configurações Globais</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SettingsSidebar />
      </SidebarContent>
    </Sidebar>
  );
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <SettingsSidebarWrapper />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          <SettingsHeader />
          
          {/* Content */}
          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
