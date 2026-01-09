import { ReactNode } from "react";
import { SettingsSidebar } from "./SettingsSidebar";
import { Search } from "lucide-react";
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

interface SettingsLayoutProps {
  children: ReactNode;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  team_leader: "Líder de Time",
  collaborator: "Colaborador",
};

export function SettingsLayout({ children }: SettingsLayoutProps) {
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
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <div className="fixed top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col">
        {/* Header com logo */}
        <div className="flex items-center gap-3 h-16 px-4 border-b border-border">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            H
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">Hub</span>
            <span className="text-xs text-muted-foreground">Configurações Globais</span>
          </div>
        </div>
        <SettingsSidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 ml-64">
        {/* Top header with search */}
        <header className="fixed top-0 left-64 right-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            {/* Search */}
            <div className="flex flex-1 max-w-md">
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
                  className="gap-2"
                  asChild
                >
                  <Link to="/select-bu">
                    <Building2 className="h-4 w-4" />
                    Selecionar BU
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

        {/* Content */}
        <main className="pt-20 px-6 pb-6 lg:px-8 lg:pb-8 overflow-auto min-h-screen">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
