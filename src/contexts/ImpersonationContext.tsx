import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * ImpersonationContext
 * 
 * Permite que super_admin simule a experiência visual de qualquer usuário.
 * 
 * IMPORTANTE: Esta é uma impersonação de VISUALIZAÇÃO apenas.
 * - Permissões mostradas são do usuário impersonado
 * - Ações (create/update/delete) continuam executadas como o usuário REAL
 * - RLS sempre usa auth.uid() do super_admin
 */

export interface ImpersonatedUserInfo {
  id: string;
  displayName: string;
  email: string | null;
  photoUrl: string | null;
}

interface ImpersonationContextType {
  // Estado
  isImpersonating: boolean;
  impersonatedUserId: string | null;
  impersonatedUser: ImpersonatedUserInfo | null;
  
  // Ações
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
  
  // Helpers
  canImpersonate: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

const STORAGE_KEY = "hub_impersonation";

interface StoredImpersonation {
  userId: string;
  user: ImpersonatedUserInfo;
}

interface ImpersonationProviderProps {
  children: ReactNode;
}

export function ImpersonationProvider({ children }: ImpersonationProviderProps) {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUserInfo | null>(null);
  
  // Apenas super_admin pode impersonar
  const canImpersonate = role === "super_admin";
  const isImpersonating = canImpersonate && impersonatedUserId !== null;
  
  // Restaurar estado da sessionStorage ao montar
  useEffect(() => {
    if (!canImpersonate) {
      // Limpar se não for super_admin
      sessionStorage.removeItem(STORAGE_KEY);
      setImpersonatedUserId(null);
      setImpersonatedUser(null);
      return;
    }
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredImpersonation = JSON.parse(stored);
        setImpersonatedUserId(data.userId);
        setImpersonatedUser(data.user);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [canImpersonate]);
  
  const startImpersonation = useCallback(async (userId: string) => {
    if (!canImpersonate) {
      console.error("Apenas super_admin pode impersonar usuários");
      return;
    }
    
    // Buscar informações do usuário
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, display_name, work_email, photo_url")
      .eq("id", userId)
      .single();
    
    if (error || !profile) {
      console.error("Erro ao buscar perfil para impersonação:", error);
      return;
    }
    
    const userInfo: ImpersonatedUserInfo = {
      id: profile.id,
      displayName: profile.display_name || "Usuário",
      email: profile.work_email,
      photoUrl: profile.photo_url,
    };
    
    // Salvar na sessionStorage
    const stored: StoredImpersonation = {
      userId,
      user: userInfo,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    
    // Atualizar estado
    setImpersonatedUserId(userId);
    setImpersonatedUser(userInfo);
    
    // Invalidar cache de permissões, teams, assets e tickets para forçar refetch
    // Invalidate both 'real' and 'impersonated' variants
    queryClient.invalidateQueries({ queryKey: ["identity"] });
    queryClient.invalidateQueries({ queryKey: ["permissions"] });
    queryClient.invalidateQueries({ queryKey: ["okr-manageable-teams"] });
    queryClient.invalidateQueries({ queryKey: ["manageable-teams"] });
    queryClient.invalidateQueries({ queryKey: ["assets"] });
    queryClient.invalidateQueries({ queryKey: ["tickets"] }); // Tickets list
    queryClient.invalidateQueries({ queryKey: ["ticket"] }); // Ticket detail (singular)
    queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    queryClient.refetchQueries({ queryKey: ["okr-manageable-teams", "impersonated"] });
    queryClient.refetchQueries({ queryKey: ["manageable-teams", "impersonated"] });
  }, [canImpersonate, queryClient]);
  
  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setImpersonatedUserId(null);
    setImpersonatedUser(null);
    
    // Invalidar cache de permissões, teams, assets e tickets
    queryClient.invalidateQueries({ queryKey: ["identity"] });
    queryClient.invalidateQueries({ queryKey: ["permissions"] });
    queryClient.invalidateQueries({ queryKey: ["okr-manageable-teams"] });
    queryClient.invalidateQueries({ queryKey: ["manageable-teams"] });
    queryClient.invalidateQueries({ queryKey: ["assets"] });
    queryClient.invalidateQueries({ queryKey: ["tickets"] }); // Tickets list
    queryClient.invalidateQueries({ queryKey: ["ticket"] }); // Ticket detail (singular)
    queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    queryClient.refetchQueries({ queryKey: ["okr-manageable-teams", "real"] });
    queryClient.refetchQueries({ queryKey: ["manageable-teams", "real"] });
  }, [queryClient]);
  
  // Limpar impersonação quando usuário sair
  useEffect(() => {
    if (!user) {
      sessionStorage.removeItem(STORAGE_KEY);
      setImpersonatedUserId(null);
      setImpersonatedUser(null);
    }
  }, [user]);
  
  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating,
        impersonatedUserId,
        impersonatedUser,
        startImpersonation,
        stopImpersonation,
        canImpersonate,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  
  if (!context) {
    throw new Error("useImpersonation deve ser usado dentro de ImpersonationProvider");
  }
  
  return context;
}

/**
 * Hook seguro que pode ser usado fora do provider
 * Retorna valores padrão se não houver contexto
 */
export function useOptionalImpersonation(): ImpersonationContextType {
  const context = useContext(ImpersonationContext);
  
  if (!context) {
    return {
      isImpersonating: false,
      impersonatedUserId: null,
      impersonatedUser: null,
      startImpersonation: async () => {},
      stopImpersonation: () => {},
      canImpersonate: false,
    };
  }
  
  return context;
}
