import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BuProvider } from "@/contexts/BuContext";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { VicProvider, VicSidepanel } from "@/modules/vic";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ModuleRoute } from "@/components/auth/ModuleRoute";
import { BuRequiredRoute } from "@/components/auth/BuRequiredRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { Skeleton } from "@/components/ui/skeleton";

// Páginas carregadas imediatamente (críticas para primeira renderização)
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loading para módulos (carregados sob demanda)
const Index = lazy(() => import("./pages/Index"));
const Users = lazy(() => import("./pages/Users"));
const Profile = lazy(() => import("./pages/Profile"));
const Modules = lazy(() => import("./pages/Modules"));
const SelectBu = lazy(() => import("./pages/SelectBu"));

// Módulo Teams
const TeamsPage = lazy(() => import("./modules/teams/pages/TeamsPage"));
const TeamDetailPage = lazy(() => import("./modules/teams/pages/TeamDetailPage"));

// Módulo OKRs
const OkrsPage = lazy(() => import("./modules/okrs/pages/OkrsPage"));
const OkrDashboardPage = lazy(() => import("./modules/okrs/pages/OkrDashboardPage"));
const CeoDashboardPage = lazy(() => import("./modules/okrs/pages/CeoDashboardPage"));
const OrgViewListPage = lazy(() => import("./modules/okrs/pages/OrgViewListPage"));
const OrgObjectiveViewPage = lazy(() => import("./modules/okrs/pages/OrgObjectiveViewPage"));
const TeamContributionPage = lazy(() => import("./modules/okrs/pages/TeamContributionPage"));

// Módulo KPIs
const KpiDashboardPage = lazy(() => import("./modules/kpis/pages/KpiDashboardPage"));

// Módulo BU
const BuManagementPage = lazy(() => import("./modules/bu/pages/BuManagementPage"));

// Módulo Integrações (Settings)
const GlobalIntegrationsPage = lazy(() => import("./modules/integrations/pages/GlobalIntegrationsPage"));
const GlobalIntegrationDetailPage = lazy(() => import("./modules/integrations/pages/GlobalIntegrationDetailPage"));
const AgentsListPage = lazy(() => import("./modules/integrations/pages/AgentsListPage"));
const AgentFormPage = lazy(() => import("./modules/integrations/pages/AgentFormPage"));
const AgentLogsPage = lazy(() => import("./modules/integrations/pages/AgentLogsPage"));

// Settings
const SettingsLayout = lazy(() => import("./components/settings/SettingsLayout").then(m => ({ default: m.SettingsLayout })));
const SettingsHome = lazy(() => import("./pages/settings/SettingsHome"));
const SettingsBusinessUnits = lazy(() => import("./pages/settings/SettingsBusinessUnits"));
const SettingsModules = lazy(() => import("./pages/settings/SettingsModules"));
const SettingsIntegrations = lazy(() => import("./pages/settings/SettingsIntegrations"));

// Fallback de loading otimizado
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

// QueryClient com cache otimizado
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BuProvider>
            <ModuleProvider>
              <VicProvider>
                <VicSidepanel />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* ===== ROTAS PÚBLICAS ===== */}
                    <Route path="/auth" element={<Auth />} />

                    {/* ===== ÁREA GLOBAL DO HUB (sem contexto de BU) ===== */}
                    
                    {/* Seleção de Business Unit */}
                    <Route
                      path="/select-bu"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <SelectBu />
                        </ProtectedRoute>
                      }
                    />

                    {/* Perfil do usuário */}
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <ModuleRoute moduleSlug="profile" requiresBu={false}>
                            <Profile />
                          </ModuleRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* Business Units (Admin Global) */}
                    <Route
                      path="/business-units"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <ModuleRoute moduleSlug="business-units" requiresBu={false}>
                            <BuManagementPage />
                          </ModuleRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* Usuários (Admin Global) */}
                    <Route
                      path="/users"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <ModuleRoute moduleSlug="users" requiresBu={false}>
                            <Users />
                          </ModuleRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* ===== SETTINGS (Admin Global) ===== */}
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <SettingsHome />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/business-units"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <SettingsBusinessUnits />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/modules"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <SettingsModules />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/integrations"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <SettingsIntegrations />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/integrations/:integrationKey"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <GlobalIntegrationDetailPage />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    {/* IMPORTANTE: /agents/new DEVE vir ANTES de /agents/:agentId */}
                    <Route
                      path="/settings/integrations/:integrationKey/agents/new"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <AgentFormPage />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/integrations/:integrationKey/agents/:agentId"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <AgentFormPage />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/integrations/:integrationKey/agents"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <AgentsListPage />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/integrations/:integrationKey/logs"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <AgentLogsPage />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* Catálogo de Módulos (Admin Global) */}
                    <Route
                      path="/modules"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <Modules />
                        </ProtectedRoute>
                      }
                    />

                    {/* ===== ÁREA OPERACIONAL (requer BU selecionada) ===== */}
                    
                    {/* Home/Dashboard da BU */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <Index />
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* Times */}
                    <Route
                      path="/teams"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="teams">
                              <TeamsPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/teams/:id"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="teams">
                              <TeamDetailPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* OKRs */}
                    <Route
                      path="/okrs"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <OkrDashboardPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/manage"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <OkrsPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/ceo"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <CeoDashboardPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/org-view"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <OrgViewListPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/org-view/:objectiveId"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <OrgObjectiveViewPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/team-contribution/:teamId"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <TeamContributionPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/kpis"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="kpis">
                              <KpiDashboardPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </VicProvider>
            </ModuleProvider>
          </BuProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
