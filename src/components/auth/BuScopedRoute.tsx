import { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { LoadingState } from '@/components/ui/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Building2 } from 'lucide-react';

/**
 * BuScopedRoute - Route guard for /bu/:buId/* routes
 * 
 * Responsibilities:
 * 1. Extract buId from URL params
 * 2. Validate user has access to the BU
 * 3. Sync BU context with URL (switch BU if different)
 * 4. Invalidate relevant queries when BU changes
 * 5. Show access denied if user doesn't have access
 */
export function BuScopedRoute() {
  const { buId } = useParams<{ buId: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { 
    currentBuId, 
    userBus, 
    isLoading, 
    selectBu,
    buSelected 
  } = useBu();
  
  const [isSwitching, setIsSwitching] = useState(false);

  // Check if user has access to the requested BU
  const hasAccess = userBus.some(m => m.bu_id === buId);
  const buMembership = userBus.find(m => m.bu_id === buId);

  // Sync BU context with URL
  useEffect(() => {
    if (!buId || isLoading || !hasAccess) return;
    
    // If the URL BU is different from current context, switch to it
    if (buId !== currentBuId) {
      console.log('[BuScopedRoute] Switching BU from', currentBuId, 'to', buId);
      setIsSwitching(true);
      
      // Invalidate all BU-scoped queries before switching
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          // Invalidate queries that have BU ID in their key
          return Array.isArray(key) && key.includes(currentBuId);
        }
      });
      
      // Select the new BU
      selectBu(buId);
      
      // Small delay to allow context to update
      setTimeout(() => setIsSwitching(false), 100);
    }
  }, [buId, currentBuId, hasAccess, isLoading, selectBu, queryClient]);

  // Loading state
  if (isLoading || isSwitching) {
    return <LoadingState fullPage text="Carregando..." />;
  }

  // No BU ID in URL - this shouldn't happen, redirect to select-bu
  if (!buId) {
    return <Navigate to="/select-bu" replace />;
  }

  // User doesn't have access to this BU
  if (!hasAccess) {
    return <BuAccessDenied />;
  }

  // BU context is synced - render children
  return <Outlet />;
}

/**
 * Access denied component when user tries to access a BU they don't have access to
 */
function BuAccessDenied() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Acesso não autorizado</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Você não tem acesso a esta unidade de negócio. 
            Por favor, selecione outra unidade ou entre em contato com o administrador.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <a href="/select-bu">
                <Building2 className="h-4 w-4 mr-2" />
                Selecionar outra unidade
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/">Ir para a Home</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
