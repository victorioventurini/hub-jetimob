import { useState } from "react";
import { Eye, Search, Loader2, Users } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useBu } from "@/contexts/BuContext";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";

interface UserForImpersonation {
  id: string;
  display_name: string | null;
  work_email: string | null;
  photo_url: string | null;
  job_title: string | null;
}

export function UserImpersonationDialog() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { startImpersonation, canImpersonate, isImpersonating, stopImpersonation } = useImpersonation();
  const { currentBuId } = useBu();
  
  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setDebouncedSearch(value);
  }, 300);
  
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSetSearch(value);
  };
  
  // Buscar usuários da BU atual
  const { data: users, isLoading } = useQuery({
    queryKey: ["impersonation", "users", currentBuId, debouncedSearch],
    queryFn: async () => {
      if (!currentBuId) return [];
      
      // Buscar membros ativos da BU usando a view
      const { data, error } = await supabase
        .from("v_bu_active_profiles")
        .select("id, display_name, work_email, photo_url, job_title_name, role_in_bu")
        .eq("bu_id", currentBuId)
        .order("display_name", { ascending: true })
        .limit(50);
      
      if (error) {
        console.error("Erro ao buscar usuários:", error);
        return [];
      }
      
      // Mapear e filtrar por termo de busca
      let mappedUsers = (data || []).map((p) => ({
        id: p.id,
        display_name: p.display_name,
        work_email: p.work_email,
        photo_url: p.photo_url,
        job_title: p.job_title_name,
        role: p.role_in_bu,
      }));
      
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        mappedUsers = mappedUsers.filter(
          (u) =>
            u.display_name?.toLowerCase().includes(searchLower) ||
            u.work_email?.toLowerCase().includes(searchLower) ||
            u.job_title?.toLowerCase().includes(searchLower)
        );
      }
      
      return mappedUsers;
    },
    enabled: open && canImpersonate && !!currentBuId,
  });
  
  const handleSelectUser = async (userId: string, displayName: string) => {
    await startImpersonation(userId);
    setOpen(false);
    toast.success(`Agora você está visualizando como ${displayName}`);
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
            className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
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
            <Users className="h-5 w-5" />
            Simular visão de usuário
          </DialogTitle>
          <DialogDescription>
            Veja a plataforma com as permissões de outro usuário. 
            Ações continuam sendo executadas como você.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou cargo..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Lista de usuários */}
          <ScrollArea className="h-[300px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !currentBuId ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Users className="h-8 w-8 mb-2" />
                <p className="text-sm text-center">
                  Selecione uma BU para ver os usuários disponíveis
                </p>
              </div>
            ) : users?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Users className="h-8 w-8 mb-2" />
                <p className="text-sm text-center">
                  {debouncedSearch
                    ? "Nenhum usuário encontrado"
                    : "Nenhum usuário nesta BU"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {users?.map((user) => {
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
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <OptimizedAvatar
                        src={user.photo_url}
                        fallback={initials}
                        size="sm"
                        className="h-9 w-9"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {user.display_name || "Sem nome"}
                          </span>
                          {user.role && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {user.role}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.job_title || user.work_email || "—"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          
          <p className="text-xs text-muted-foreground text-center">
            💡 Esta é uma simulação visual. Criações e edições são feitas com sua conta real.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
