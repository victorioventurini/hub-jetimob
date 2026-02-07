import { useState } from "react";
import { Eye, Search, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useBu } from "@/contexts/BuContext";
import { useBuUsersDirectory } from "@/hooks/useBuUsersDirectory";
import { useCloseOnRouteChange } from "@/hooks/useCloseOnRouteChange";
import { toast } from "sonner";

export function UserImpersonationDialog() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { startImpersonation, canImpersonate, isImpersonating, stopImpersonation } = useImpersonation();
  const { currentBuId } = useBu();
  
  // Fecha o dialog ao mudar de rota
  useCloseOnRouteChange(open, setOpen);
  
  // Usa o hook canônico com busca server-side
  const { data: users = [], isLoading } = useBuUsersDirectory({
    q: searchTerm,
    pageSize: 100,
    enabled: open && canImpersonate && !!currentBuId,
    excludeExternal: true,
  });
  
  const handleSelectUser = async (userId: string, displayName: string) => {
    await startImpersonation(userId);
    setOpen(false);
    toast.success(`Visualizando como ${displayName}`);
  };
  
  if (!canImpersonate) {
    return null;
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isImpersonating ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-status-orange text-status-orange hover:bg-status-orange-muted"
            onClick={(e) => {
              e.preventDefault();
              stopImpersonation();
              toast.success("Simulação encerrada");
            }}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden md:inline">Encerrar simulação</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden md:inline">Ver como usuário</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Simular visão de usuário
          </DialogTitle>
          <DialogDescription>
            Veja a plataforma com as permissões de outro usuário. 
            Ações continuam sendo executadas como você.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          
          {/* Lista de usuários */}
          <ScrollArea className="h-[320px] rounded-lg border bg-muted/30">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner size="md" />
              </div>
            ) : !currentBuId ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Users className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm text-center">
                  Selecione uma BU para ver os usuários
                </p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                <Users className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">
                  Nenhum usuário encontrado
                </p>
                {searchTerm && (
                  <p className="text-xs mt-1 opacity-70">
                    Tente buscar por outro termo
                  </p>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {users.map((user) => {
                  const initials = (user.display_name || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user.id, user.display_name || "Usuário")}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-background transition-colors text-left group"
                    >
                      <OptimizedAvatar
                        src={user.photo_url}
                        fallback={initials}
                        size="sm"
                        className="h-10 w-10 ring-2 ring-background"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {user.display_name || "Sem nome"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.job_title_name || user.work_email || "—"}
                        </div>
                      </div>
                      {user.employment_status === 'external' && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Externo
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          
          <p className="text-xs text-muted-foreground text-center py-1">
            💡 Esta é uma simulação visual. Criações e edições são feitas com sua conta real.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
