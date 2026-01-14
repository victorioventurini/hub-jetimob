import { lazy, Suspense, useEffect } from "react";
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
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ModuleRoute } from "@/components/auth/ModuleRoute";
import { BuRequiredRoute } from "@/components/auth/BuRequiredRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { BuAdminRoute } from "@/components/auth/BuAdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Páginas carregadas imediatamente (críticas para primeira renderização)
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const PublicAsset = lazy(() => import("./pages/PublicAsset"));
const PublicAssetRedirect = lazy(() => import("./pages/PublicAssetRedirect"));
const ResolveContextPage = lazy(() => import("./pages/ResolveContextPage"));

// Lazy loading para módulos (carregados sob demanda)
const Index = lazy(() => import("./pages/Index"));
const ExternalDashboardPage = lazy(() => import("./pages/ExternalDashboard"));
const Users = lazy(() => import("./pages/Users"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const Modules = lazy(() => import("./pages/Modules"));
const SelectBu = lazy(() => import("./pages/SelectBu"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const WizardsPage = lazy(() => import("./pages/Wizards"));
const VicTestPage = lazy(() => import("./pages/VicTestPage"));


// Módulo Teams
const TeamsPage = lazy(() => import("./modules/teams/pages/TeamsPage"));
const TeamDetailPage = lazy(() => import("./modules/teams/pages/TeamDetailPage"));
const SquadDetailPage = lazy(() => import("./modules/teams/pages/SquadDetailPage"));

// Módulo OKRs
const OkrsPage = lazy(() => import("./modules/okrs/pages/OkrsPage"));
const OkrDashboardPage = lazy(() => import("./modules/okrs/pages/OkrDashboardPage"));
const ExecutiveDashboardPage = lazy(() => import("./modules/okrs/pages/ExecutiveDashboardPage"));
const OrgViewListPage = lazy(() => import("./modules/okrs/pages/OrgViewListPage"));
const OrgObjectiveViewPage = lazy(() => import("./modules/okrs/pages/OrgObjectiveViewPage"));
const TeamContributionPage = lazy(() => import("./modules/okrs/pages/TeamContributionPage"));
const CycleCheckinsPage = lazy(() => import("./modules/okrs/pages/CycleCheckinsPage"));
const OkrsSettingsPage = lazy(() => import("./modules/okrs/pages/OkrsSettingsPage"));
const OkrCreationPage = lazy(() => import("./modules/okrs/pages/OkrCreationPage"));
const TeamKrCreationPage = lazy(() => import("./modules/okrs/pages/TeamKrCreationPage"));
const CollaboratorCheckinPage = lazy(() => import("./modules/okrs/pages/CollaboratorCheckinPage"));
const LeaderPrepPage = lazy(() => import("./modules/okrs/pages/LeaderPrepPage"));
const TeamCheckinPage = lazy(() => import("./modules/okrs/pages/TeamCheckinPage"));
const ManagersCheckinPage = lazy(() => import("./modules/okrs/pages/ManagersCheckinPage"));
const CLevelCheckinPage = lazy(() => import("./modules/okrs/pages/CLevelCheckinPage"));
const OkrQualityPage = lazyWithRetry(() => import("./modules/okrs/pages/OkrQualityPage"));
const OrgAnalysisPage = lazyWithRetry(() => import("./modules/okrs/pages/OrgAnalysisPage"));
const OkrHealthPage = lazyWithRetry(() => import("./modules/okrs/pages/OkrHealthPage"));

// Módulo KPIs
const KpiDashboardPage = lazy(() => import("./modules/kpis/pages/KpiDashboardPage"));

// Módulo Assets
const AssetsPage = lazy(() => import("./modules/assets/pages/AssetsPage"));
const InventoryPage = lazy(() => import("./modules/assets/pages/InventoryPage"));
const InventoryDetailPage = lazy(() => import("./modules/assets/pages/InventoryDetailPage"));
const KeysPage = lazy(() => import("./modules/assets/pages/KeysPage"));
const GiftsPage = lazy(() => import("./modules/assets/pages/GiftsPage"));
const AssetsReportsPage = lazy(() => import("./modules/assets/pages/AssetsReportsPage"));
const AssetsSettingsPage = lazy(() => import("./modules/assets/pages/AssetsSettingsPage"));

// Módulo BU
const BuManagementPage = lazy(() => import("./modules/bu/pages/BuManagementPage"));

// Módulo Integrações (Settings)
const GlobalIntegrationsPage = lazy(() => import("./modules/integrations/pages/GlobalIntegrationsPage"));
const GlobalIntegrationDetailPage = lazy(() => import("./modules/integrations/pages/GlobalIntegrationDetailPage"));
const CronJobConfigPage = lazy(() => import("./modules/integrations/pages/CronJobConfigPage"));
const AgentsListPage = lazy(() => import("./modules/integrations/pages/AgentsListPage"));
const AgentFormPage = lazy(() => import("./modules/integrations/pages/AgentFormPage"));
const AgentLogsPage = lazy(() => import("./modules/integrations/pages/AgentLogsPage"));

// Módulo Automações
const AutomationsPage = lazy(() => import("./modules/automations/pages/AutomationsPage"));

// Módulo Permissões (Global)
const GlobalPermissionsPage = lazy(() => import("./modules/permissions/pages/GlobalPermissionsPage"));
const GlobalUsersPage = lazy(() => import("./modules/users-global/pages/GlobalUsersPage"));
const BuPermissionsPage = lazy(() => import("./modules/permissions/pages/BuPermissionsPage"));

// Módulo Tickets
const TicketsPage = lazy(() => import("./modules/tickets/pages/TicketsPage"));
const TicketsListPage = lazy(() => import("./modules/tickets/pages/TicketsListPage"));
const CreateTicketPage = lazy(() => import("./modules/tickets/pages/CreateTicketPage"));
const TicketDetailPage = lazy(() => import("./modules/tickets/pages/TicketDetailPage"));
const TicketsSettingsPage = lazy(() => import("./modules/tickets/pages/TicketsSettingsPage"));
const PartnerContactProfilePage = lazy(() => import("./modules/tickets/pages/PartnerContactProfilePage"));

// Settings
const SettingsLayout = lazy(() => import("./components/settings/SettingsLayout").then(m => ({ default: m.SettingsLayout })));
const HubLayout = lazy(() => import("./components/layout/HubLayout").then(m => ({ default: m.HubLayout })));
const SettingsHome = lazy(() => import("./pages/settings/SettingsHome"));
const SettingsBusinessUnits = lazy(() => import("./pages/settings/SettingsBusinessUnits"));
const SettingsModules = lazy(() => import("./pages/settings/SettingsModules"));
const SettingsIntegrations = lazy(() => import("./pages/settings/SettingsIntegrations"));
const SettingsNotifications = lazy(() => import("./pages/settings/SettingsNotifications"));
const BuSettingsPage = lazy(() => import("./pages/settings/BuSettingsPage"));
const JobTitlesPage = lazy(() => import("./modules/settings/pages/JobTitlesPage"));
const SettingsUiCatalog = lazy(() => import("./pages/settings/SettingsUiCatalog"));

// Páginas de Notificações
const HubNotifications = lazy(() => import("./pages/hub/HubNotifications"));
const NotificationsPage = lazy(() => import("./pages/me/NotificationsPage"));

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

const App = () => {
  // Cleanup de pointer-events residual ao voltar para a aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Remove qualquer pointer-events residual que possa bloquear cliques
        document.body.style.pointerEvents = '';
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BuProvider>
            <ImpersonationProvider>
              <ModuleProvider>
                <VicProvider>
                  <VicSidepanel />
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                      {/* ===== ROTAS PÚBLICAS ===== */}
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/p/assets/:code" element={<PublicAsset />} />

                      {/* ===== ÁREA GLOBAL DO HUB (sem contexto de BU) ===== */}
                    
                    {/* Onboarding */}
                    <Route
                      path="/onboarding"
                      element={
                        <ProtectedRoute skipBuCheck skipOnboardingCheck>
                          <Onboarding />
                        </ProtectedRoute>
                      }
                    />

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
                    <Route
                      path="/users/:id"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <UserProfile />
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/contacts/:contactId"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="tickets">
                              <PartnerContactProfilePage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* ===== HUB (Admin Global) ===== */}
                    <Route
                      path="/hub"
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
                      path="/hub/business-units"
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
                      path="/hub/modules"
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
                      path="/hub/integrations"
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
                      path="/hub/integrations/cron-job"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <CronJobConfigPage />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/hub/integrations/:integrationKey"
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
                      path="/hub/integrations/:integrationKey/agents/new"
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
                      path="/hub/integrations/:integrationKey/agents/:agentId"
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
                      path="/hub/integrations/:integrationKey/agents"
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
                      path="/hub/integrations/:integrationKey/logs"
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
                    <Route
                      path="/hub/modules/okrs/settings"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <OkrsSettingsPage />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/hub/automations"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <AutomationsPage />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/hub/permissions"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <GlobalPermissionsPage />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/hub/job-titles"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <JobTitlesPage />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/hub/notifications"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <HubNotifications />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/hub/users"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <GlobalUsersPage />
                            </SettingsLayout>
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/hub/ui"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <AdminRoute>
                            <SettingsLayout>
                              <SettingsUiCatalog />
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

                    {/* Wizards - All OKR Wizards */}
                    <Route
                      path="/wizards"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <WizardsPage />
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* Vic Test Page - Isolated AI agent testing (DEV ONLY) */}
                    {import.meta.env.DEV && (
                      <Route
                        path="/vic-test"
                        element={
                          <ProtectedRoute>
                            <BuRequiredRoute>
                              <VicTestPage />
                            </BuRequiredRoute>
                          </ProtectedRoute>
                        }
                      />
                    )}
                    {/* ===== LEGACY REDIRECTS (backwards compatibility) ===== */}
                    {/* Context Resolver - resolves BU from resource and redirects */}
                    <Route
                      path="/go/:entity/:id"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <ResolveContextPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* ===== ÁREA OPERACIONAL (requer BU selecionada) ===== */}
                    {/* These routes use the user's currently selected BU */}

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

                    {/* External Dashboard - for partner contacts */}
                    <Route
                      path="/dashboard/external"
                      element={
                        <ProtectedRoute skipBuCheck>
                          <ExternalDashboardPage />
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
                    <Route
                      path="/squads/:id"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="teams">
                              <SquadDetailPage />
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
                      path="/okrs/executive"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <ExecutiveDashboardPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/create"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <OkrCreationPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/objectives/:objectiveId/krs/create"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <TeamKrCreationPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/collaborator-checkin"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <CollaboratorCheckinPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/leader-prep"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <LeaderPrepPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/quality"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <OkrQualityPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/analysis"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <BuAdminRoute>
                              <ModuleRoute moduleSlug="okrs">
                                <OrgAnalysisPage />
                              </ModuleRoute>
                            </BuAdminRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/health"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <BuAdminRoute>
                              <ModuleRoute moduleSlug="okrs">
                                <OkrHealthPage />
                              </ModuleRoute>
                            </BuAdminRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/team-checkin"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <TeamCheckinPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/managers-checkin"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <ManagersCheckinPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/clevel-checkin"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <CLevelCheckinPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/okrs/checkins"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="okrs">
                              <CycleCheckinsPage />
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

                    {/* Assets - Nested Routes */}
                    <Route
                      path="/assets"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="assets">
                              <AssetsPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    >
                      <Route path="inventory" element={<InventoryPage />} />
                      <Route path="keys" element={<KeysPage />} />
                      <Route path="gifts" element={<GiftsPage />} />
                      <Route path="reports" element={<AssetsReportsPage />} />
                      <Route path="settings" element={<AssetsSettingsPage />} />
                    </Route>

                    {/* Asset Inventory Detail - Outside nested route for full page layout */}
                    <Route
                      path="/assets/inventory/:id"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="assets">
                              <InventoryDetailPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />
                    {/* Asset by internal code - public redirect for QR codes */}
                    <Route
                      path="/assets/:code"
                      element={<PublicAssetRedirect />}
                    />

                    {/* Tickets - Nested Routes */}
                    <Route
                      path="/tickets"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="tickets">
                              <TicketsPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<TicketsListPage />} />
                      <Route path="new" element={<CreateTicketPage />} />
                      <Route path="settings" element={<TicketsSettingsPage />} />
                    </Route>

                    {/* Ticket Detail - Standalone page without tabs */}
                    <Route
                      path="/tickets/:id"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <ModuleRoute moduleSlug="tickets">
                              <TicketDetailPage />
                            </ModuleRoute>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* BU Settings Home - Admin da BU */}
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <BuSettingsPage />
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* BU Permissions - Admin da BU */}
                    <Route
                      path="/settings/permissions"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <BuPermissionsPage />
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* BU Notifications Settings - Admin da BU */}
                    <Route
                      path="/settings/notifications"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <HubLayout>
                              <SettingsNotifications />
                            </HubLayout>
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* User Notifications */}
                    <Route
                      path="/me/notifications"
                      element={
                        <ProtectedRoute>
                          <BuRequiredRoute>
                            <NotificationsPage />
                          </BuRequiredRoute>
                        </ProtectedRoute>
                      }
                    />

                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </VicProvider>
            </ModuleProvider>
          </ImpersonationProvider>
        </BuProvider>
      </AuthProvider>
    </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
