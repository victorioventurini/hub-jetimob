import { useEffect } from "react";
import { useNavigate, Link, useLocation, type Location } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, ArrowRight, Loader2, LogOut, Settings, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JetimobIcon from "@/assets/jetimob-icon.svg";

export default function SelectBu() {
  usePageTitle("", { hubOnly: true });

  const navigate = useNavigate();
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const { userBus, isLoading: buLoading, selectBu } = useBu();

  const from = (location.state as { from?: Location } | null)?.from;
  const returnTo = (() => {
    if (!from) return "/";
    const path = `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
    // Avoid loops back to auth/selection screens.
    if (path === "/auth" || path === "/select-bu") return "/";
    return path;
  })();

  // Fetch all active BUs
  const { data: allBus = [], isLoading: allBusLoading } = useQuery({
    queryKey: queryKeys.bu.allList(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_units")
        .select("id, name, description, logo_url, symbol_url, primary_color, status")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = buLoading || allBusLoading;

  // Create a set of BU IDs the user has access to
  const userBuIds = new Set(userBus.map((m) => m.bu_id));

  // Auto-redirect if user has access to only one BU
  useEffect(() => {
    if (!isLoading && userBus.length === 1) {
      selectBu(userBus[0].bu_id);
      navigate(returnTo, { replace: true });
    }
  }, [isLoading, userBus, selectBu, navigate, returnTo]);

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Administrador",
    team_leader: "Líder de Time",
    collaborator: "Colaborador",
  };

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

  const handleSelectBu = (buId: string, hasAccess: boolean) => {
    if (!hasAccess) {
      toast.error("Você não tem acesso a esta Business Unit");
      return;
    }
    selectBu(buId);
    navigate(returnTo, { replace: true });
  };

  // Show loader while checking, or if auto-redirecting
  if (isLoading || (!isLoading && userBus.length === 1)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Sort BUs: user's BUs first, then others
  const sortedBus = [...allBus].sort((a, b) => {
    const aHasAccess = userBuIds.has(a.id);
    const bHasAccess = userBuIds.has(b.id);
    if (aHasAccess && !bHasAccess) return -1;
    if (!aHasAccess && bHasAccess) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <img src={JetimobIcon} alt="Hub" className="w-6 h-6" style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <span className="text-lg font-semibold">Hub</span>
          </div>
          
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
                <div className="hidden sm:flex flex-col items-start">
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
              {role === "super_admin" && (
                <DropdownMenuItem asChild>
                  <Link to="/hub" className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
              )}
              {role === "super_admin" && <DropdownMenuSeparator />}
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
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-2">
              Olá, {profile?.first_name || "Jetimober"}! 👋
            </h1>
            <p className="text-muted-foreground text-lg">
              Selecione a Business Unit que deseja acessar
            </p>
          </motion.div>

          <div className="grid gap-4">
            {sortedBus.map((bu, index) => {
              const hasAccess = userBuIds.has(bu.id);
              const membership = userBus.find((m) => m.bu_id === bu.id);

              return (
                <motion.div
                  key={bu.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Card 
                    className={`transition-all ${
                      hasAccess 
                        ? "cursor-pointer hover:shadow-lg hover:border-primary/50 group" 
                        : "opacity-60 cursor-not-allowed"
                    }`}
                    onClick={() => handleSelectBu(bu.id, hasAccess)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        {/* BU Logo/Icon */}
                        <div 
                          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                          style={{ 
                            backgroundColor: bu.primary_color ? `${bu.primary_color}15` : 'hsl(var(--muted))'
                          }}
                        >
                          {bu.symbol_url ? (
                            <img 
                              src={bu.symbol_url} 
                              alt={bu.name} 
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <Building2 
                              className="w-7 h-7" 
                              style={{ color: bu.primary_color || 'hsl(var(--primary))' }}
                            />
                          )}
                        </div>

                        {/* BU Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold truncate">{bu.name}</h3>
                          {bu.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {bu.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {membership?.is_default && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground">
                                Padrão
                              </span>
                            )}
                            {!hasAccess && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                <Lock className="w-3 h-3" />
                                Sem acesso
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Access button */}
                        {hasAccess ? (
                          <Button 
                            variant="outline" 
                            className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          >
                            Acessar
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            disabled
                            className="gap-2"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {allBus.length === 0 && (
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>Nenhuma Business Unit</CardTitle>
                <CardDescription>
                  Não há Business Units cadastradas no sistema.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {allBus.length > 0 && userBus.length === 0 && (
            <Card className="mt-6 border-warning/50 bg-warning/5">
              <CardContent className="p-4">
                <p className="text-sm text-center text-muted-foreground">
                  Você ainda não tem acesso a nenhuma Business Unit. 
                  Entre em contato com um administrador para solicitar acesso.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border px-6 py-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Jetimob. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
