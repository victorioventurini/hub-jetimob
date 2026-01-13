import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { useImpersonation } from "@/contexts/ImpersonationContext";

/**
 * Banner fixo exibido quando super_admin está impersonando um usuário.
 * Mostra claramente que está em modo simulação e permite encerrar.
 */
export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUser, stopImpersonation } = useImpersonation();
  
  if (!isImpersonating || !impersonatedUser) {
    return null;
  }
  
  const initials = impersonatedUser.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-status-amber text-status-amber-foreground py-2 px-4 shadow-lg">
      <div className="flex items-center justify-center gap-3 max-w-7xl mx-auto">
        <Eye className="h-4 w-4 shrink-0" />
        
        <div className="flex items-center gap-2">
          <OptimizedAvatar
            src={impersonatedUser.photoUrl}
            fallback={initials}
            size="sm"
            className="h-6 w-6 border border-status-amber"
          />
          <span className="text-sm font-medium">
            Visualizando como: <strong>{impersonatedUser.displayName}</strong>
          </span>
          {impersonatedUser.email && (
            <span className="text-sm opacity-75 hidden sm:inline">
              ({impersonatedUser.email})
            </span>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={stopImpersonation}
          className="ml-2 h-7 px-2 text-status-amber-foreground hover:bg-status-amber/80"
        >
          <X className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Encerrar simulação</span>
          <span className="sm:hidden">Sair</span>
        </Button>
      </div>
    </div>
  );
}
