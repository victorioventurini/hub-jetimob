import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ArrowRight, Loader2, LogOut, Settings } from "lucide-react";
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
import { toast } from "sonner";
import JetimobIcon from "@/assets/jetimob-icon.svg";

export default function SelectBu() {
  usePageTitle("", { hubOnly: true });
  
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { userBus, isLoading, selectBu } = useBu();

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

  const handleSelectBu = (buId: string) => {
    selectBu(buId);
    navigate("/", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando suas Business Units...</p>
        </div>
      </div>
    );
  }

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
            {userBus.map((membership, index) => {
              const bu = membership.bu_unit;
              if (!bu) return null;

              return (
                <motion.div
                  key={membership.bu_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card 
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group"
                    onClick={() => handleSelectBu(membership.bu_id)}
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
                          {membership.is_default && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground mt-1">
                              Padrão
                            </span>
                          )}
                        </div>

                        {/* Access button */}
                        <Button 
                          variant="outline" 
                          className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        >
                          Acessar
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {userBus.length === 0 && (
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>Nenhuma Business Unit</CardTitle>
                <CardDescription>
                  Você ainda não tem acesso a nenhuma Business Unit.
                  Entre em contato com um administrador.
                </CardDescription>
              </CardHeader>
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
