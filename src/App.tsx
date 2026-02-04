/**
 * App.tsx — Hub da Jet
 * 
 * Ponto de entrada da aplicação React.
 * Rotas foram modularizadas em src/routes/ para manter este arquivo enxuto.
 * 
 * @see TCR v2.73.0
 * @see docs/canonical/DEVELOPMENT_STANDARDS.md
 */

import { Suspense, lazy, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BuProvider } from "@/contexts/BuContext";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { VicProvider, VicSidepanel } from "@/modules/vic";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useRadixFocusRecovery } from "@/hooks/useRadixFocusRecovery";
import { useRouteTracking } from "@/hooks/useRouteTracking";
import { useGtmConfig, initGTM } from "@/lib/analytics";

// Rotas públicas (sem providers de autenticação)
import Auth from "./pages/Auth";
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const PublicAsset = lazy(() => import("./pages/PublicAsset"));

// Rotas modularizadas
import { hubRoutes } from "./routes/hub.routes";
import { okrRoutes } from "./routes/okrs.routes";
import { ticketRoutes } from "./routes/tickets.routes";
import { assetRoutes } from "./routes/assets.routes";
import { teamRoutes } from "./routes/teams.routes";
import { settingsRoutes } from "./routes/settings.routes";
import { coreRoutes } from "./routes/core.routes";

/**
 * Fallback de loading otimizado
 */
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md px-4">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * QueryClient com cache otimizado
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados ficam "frescos" por 5 minutos
      staleTime: 5 * 60 * 1000,
      // Garbage collection após 30 minutos
      gcTime: 30 * 60 * 1000,
      // Não refetch automático ao focar janela (dados admin mudam pouco)
      refetchOnWindowFocus: false,
      // Retry apenas 1 vez em caso de erro
      retry: 1,
    },
  },
});

/**
 * Componente raiz da aplicação.
 * Hook useRadixFocusRecovery é chamado aqui uma única vez para
 * recuperar pointer-events após troca de aba do navegador.
 */
const App = () => {
  // Recuperação centralizada de pointer-events (Radix UI)
  useRadixFocusRecovery();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider disableHoverableContent skipDelayDuration={0} delayDuration={300}>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

/**
 * Componente de roteamento que decide se deve renderizar rotas públicas
 * ou as rotas autenticadas com BuProvider.
 * 
 * Conforme TCR v2.73.0: BuProvider depende de AuthProvider estar inicializado,
 * e rotas públicas (/auth, /auth/callback, /p/assets/*) não devem carregar BuProvider.
 */
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ===== ROTAS PÚBLICAS (sem BuProvider) ===== */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/p/assets/:code" element={<PublicAsset />} />
        
        {/* ===== ROTAS AUTENTICADAS (com BuProvider) ===== */}
        <Route path="*" element={<AuthenticatedRoutesWrapper />} />
      </Routes>
    </Suspense>
  );
}

/**
 * Componente que inicializa o GTM dinamicamente após buscar Container ID.
 * Renderiza null, apenas executa side effect de inicialização.
 */
function GtmInitializer() {
  const { containerId } = useGtmConfig();
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (containerId && !initializedRef.current) {
      initGTM(containerId);
      initializedRef.current = true;
    }
  }, [containerId]);
  
  return null;
}

/**
 * Wrapper que envolve todas as rotas autenticadas com os providers necessários.
 */
function AuthenticatedRoutesWrapper() {
  // GTM route tracking - dispara page_view em cada navegação
  useRouteTracking();
  
  return (
    <BuProvider>
      {/* GTM inicializado dinamicamente após buscar config */}
      <GtmInitializer />
      <ImpersonationProvider>
        <ModuleProvider>
          <VicProvider>
            <VicSidepanel />
            <ErrorBoundary>
              <AuthenticatedRoutes />
            </ErrorBoundary>
          </VicProvider>
        </ModuleProvider>
      </ImpersonationProvider>
    </BuProvider>
  );
}

/**
 * Componente com todas as rotas autenticadas.
 * Rotas organizadas por módulo para melhor manutenibilidade.
 * 
 * @see src/routes/ para definições detalhadas
 */
function AuthenticatedRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Hub (Platform Admin) */}
        {hubRoutes}
        
        {/* OKRs */}
        {okrRoutes}
        
        {/* Tickets */}
        {ticketRoutes}
        
        {/* Assets */}
        {assetRoutes}
        
        {/* Teams */}
        {teamRoutes}
        
        {/* Settings (BU-scoped) */}
        {settingsRoutes}
        
        {/* Core (Home, Profile, Users, etc.) */}
        {coreRoutes}
      </Routes>
    </Suspense>
  );
}

export default App;
