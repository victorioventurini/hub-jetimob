import { useState } from "react";
import { Menu, LogOut, User, Settings, Building2, Sun, Moon, Monitor } from "lucide-react";
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
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { useCloseOnRouteChange } from "@/hooks/useCloseOnRouteChange";
import { toast } from "sonner";
import { BuSelector } from "@/modules/bu/components/BuSelector";
import { BuSymbol } from "@/modules/bu/components/BuSymbol";
import { useBuBranding } from "@/modules/bu/hooks";
import { NotificationCenter } from "@/components/notifications";
import { UserImpersonationDialog } from "@/components/impersonation";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import { CycleProgressHeader } from "./CycleProgressHeader";
import { useTheme, type Theme } from "@/contexts/ThemeContext";

interface HeaderProps {
  sidebarCollapsed: boolean;
  onMobileMenuToggle?: () => void;
}

export function Header({ sidebarCollapsed, onMobileMenuToggle }: HeaderProps) {
  const { profile, role, signOut, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { userRole, hasMultipleBus, currentBuId } = useBu();
  const location = useLocation();
  const navigate = useNavigate();
  const isNextPage = location.pathname.startsWith("/next");
  const { isImpersonating } = useOptionalImpersonation();
  const { isExternal, externalInfo } = useExternalUser();
  const { symbolUrl, buName, primaryColor } = useBuBranding();
  
  // Estado para controlar o dropdown do usuário
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Fecha o dropdown ao mudar de rota
  useCloseOnRouteChange(userMenuOpen, setUserMenuOpen);
  
  // Admin de BU ou acesso administrativo podem acessar configurações
  // isAdmin já considera super_admin e admin via useAuth
  // IMPORTANTE: Durante impersonação, NÃO mostrar acesso a configurações - simular experiência real
  const canAccessSettings = !isImpersonating && (isAdmin || userRole === "admin");

  // Usuários externos usam externalInfo, internos usam profile
  const displayName = profile?.display_name || externalInfo?.name || "Usuário";
  const email = profile?.work_email || externalInfo?.email || "";
  // Exibir job_title do perfil para internos, nome da empresa para externos, fallback para "Membro"
  const jobTitleLabel = profile?.job_title || (isExternal ? externalInfo?.companyName : null) || "Membro";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Você saiu do Next");
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border",
        "transition-all duration-300 ease-in-out",
        isNextPage 
          ? "left-0" 
          : cn("left-0 lg:left-64", sidebarCollapsed && "lg:left-20")
      )}
    >
      <div className="flex items-center justify-between h-full px-3 sm:px-4 lg:px-8">
        {/* Mobile: menu button + BU logo (logo sempre visível, menu aberto ou fechado) */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            className="min-w-[44px] min-h-[44px]"
            onClick={onMobileMenuToggle}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {currentBuId && (
            <Link
              to="/"
              className="flex items-center min-h-[44px] px-1"
              aria-label={`Ir para Home — ${buName}`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: primaryColor ? `${primaryColor}20` : undefined }}
              >
                <BuSymbol
                  symbolUrl={symbolUrl}
                  primaryColor={primaryColor}
                  name={buName}
                  size="md"
                />
              </div>
            </Link>
          )}
        </div>

        {/* Cycle Progress Indicator */}
        {!isNextPage && currentBuId && <CycleProgressHeader variant="segmented" />}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right section */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* BU Selector - Show button on next (if multiple BUs), dropdown elsewhere */}
          {isNextPage ? (
            hasMultipleBus && (
              <Button asChild variant="outline" size="sm" className="gap-2 hidden sm:flex">
                <Link to="/select-bu">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden md:inline">Selecionar BU</span>
                </Link>
              </Button>
            )
          ) : (
            <div className="hidden sm:block">
              <BuSelector />
            </div>
          )}

          {/* Impersonation (super_admin only) */}
          {role === 'super_admin' && <UserImpersonationDialog />}

          {/* Notifications */}
          <NotificationCenter />

          {/* User menu */}
          <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 sm:gap-3 px-2 min-h-[44px]">
                <OptimizedAvatar
                  src={profile?.photo_url}
                  fallback={initials}
                  size="sm"
                  className="h-8 w-8"
                  fallbackClassName="bg-accent text-accent-foreground text-sm font-semibold"
                />
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium" spellCheck={false} translate="no">{displayName}</span>
                  <span className="text-xs text-muted-foreground" spellCheck={false} translate="no">{jobTitleLabel}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="cursor-default">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium no-underline" spellCheck={false} translate="no">{displayName}</span>
                  <span className="text-xs font-normal text-muted-foreground" spellCheck={false} translate="no">
                    {email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Mobile-only: BU Selection */}
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
              {canAccessSettings && (
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações da BU
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {/* Theme toggle */}
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground cursor-default">
                Aparência
              </DropdownMenuLabel>
              <div className="flex items-center gap-1 px-2 py-1.5">
                {([
                  { value: 'light' as Theme, icon: Sun, label: 'Claro' },
                  { value: 'dark' as Theme, icon: Moon, label: 'Escuro' },
                  { value: 'system' as Theme, icon: Monitor, label: 'Sistema' },
                ] as const).map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    variant={theme === value ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1 gap-1.5 h-8 text-xs"
                    onClick={() => setTheme(value)}
                    title={label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
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