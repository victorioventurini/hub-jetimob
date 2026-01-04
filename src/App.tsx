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
import Index from "./pages/Index";
import Users from "./pages/Users";
import TeamsPage from "./modules/teams/pages/TeamsPage";
import TeamDetailPage from "./modules/teams/pages/TeamDetailPage";
import Modules from "./pages/Modules";
import Profile from "./pages/Profile";
import { 
  GlobalIntegrationsPage, 
  GlobalIntegrationDetailPage,
  BuIntegrationsPage,
  BuIntegrationDetailPage,
  AgentsListPage,
  AgentFormPage,
  AgentLogsPage,
} from "./modules/integrations";
import OkrsPage from "./modules/okrs/pages/OkrsPage";
import OkrDashboardPage from "./modules/okrs/pages/OkrDashboardPage";
import CeoDashboardPage from "./modules/okrs/pages/CeoDashboardPage";
import KpiDashboardPage from "./modules/kpis/pages/KpiDashboardPage";
import BuManagementPage from "./modules/bu/pages/BuManagementPage";
import SelectBu from "./pages/SelectBu";
import Auth from "./pages/Auth";
import SettingsHome from "./pages/settings/SettingsHome";
import { SettingsLayout } from "./components/settings/SettingsLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

                {/* Integrações Globais (Admin Global) */}
                <Route
                  path="/integrations"
                  element={
                    <ProtectedRoute skipBuCheck>
                      <ModuleRoute moduleSlug="integrations" requiresBu={false}>
                        <GlobalIntegrationsPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integrations/:integrationKey"
                  element={
                    <ProtectedRoute skipBuCheck>
                      <ModuleRoute moduleSlug="integrations" requiresBu={false}>
                        <GlobalIntegrationDetailPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
                {/* IMPORTANTE: /agents/new DEVE vir ANTES de /agents/:agentId */}
                <Route
                  path="/integrations/:integrationKey/agents/new"
                  element={
                    <ProtectedRoute skipBuCheck>
                      <ModuleRoute moduleSlug="integrations" requiresBu={false}>
                        <AgentFormPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integrations/:integrationKey/agents/:agentId"
                  element={
                    <ProtectedRoute skipBuCheck>
                      <ModuleRoute moduleSlug="integrations" requiresBu={false}>
                        <AgentFormPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integrations/:integrationKey/agents"
                  element={
                    <ProtectedRoute skipBuCheck>
                      <ModuleRoute moduleSlug="integrations" requiresBu={false}>
                        <AgentsListPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integrations/:integrationKey/logs"
                  element={
                    <ProtectedRoute skipBuCheck>
                      <ModuleRoute moduleSlug="integrations" requiresBu={false}>
                        <AgentLogsPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />

                {/* Integrações da BU (Settings) */}
                <Route
                  path="/settings/integrations"
                  element={
                    <ProtectedRoute>
                      <BuRequiredRoute>
                        <BuIntegrationsPage />
                      </BuRequiredRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/integrations/:integrationKey"
                  element={
                    <ProtectedRoute>
                      <BuRequiredRoute>
                        <BuIntegrationDetailPage />
                      </BuRequiredRoute>
                    </ProtectedRoute>
                  }
                />

                {/* Configurações do Hub (Admin Global) */}
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

                {/* KPIs */}
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
              </VicProvider>
            </ModuleProvider>
          </BuProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
