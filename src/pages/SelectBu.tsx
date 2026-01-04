import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ArrowRight, Loader2, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import JetimobIcon from "@/assets/jetimob-icon.svg";
import { CreateBuDialog } from "@/modules/bu/components/CreateBuDialog";

export default function SelectBu() {
  usePageTitle("", { hubOnly: true });
  
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const { userBus, isLoading, selectBu } = useBu();

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
          
          {/* Actions and User info */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <CreateBuDialog
                  trigger={
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nova BU</span>
                    </Button>
                  }
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/settings")}
                  title="Configurações do Hub"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </>
            )}
            <div className="w-px h-6 bg-border mx-1" />
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.photo_url || undefined} />
              <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                {profile?.display_name?.charAt(0) || "J"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{profile?.display_name}</p>
              <p className="text-xs text-muted-foreground">{profile?.work_email}</p>
            </div>
          </div>
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
