import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BuProvider } from "@/contexts/BuContext";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ModuleRoute } from "@/components/auth/ModuleRoute";
import { BuRequiredRoute } from "@/components/auth/BuRequiredRoute";
import Index from "./pages/Index";
import Users from "./pages/Users";
import TeamsPage from "./modules/teams/pages/TeamsPage";
import TeamDetailPage from "./modules/teams/pages/TeamDetailPage";
import Modules from "./pages/Modules";
import Profile from "./pages/Profile";
import Integrations from "./pages/Integrations";
import IntegrationDetails from "./pages/IntegrationDetails";
import OkrsPage from "./modules/okrs/pages/OkrsPage";
import OkrDashboardPage from "./modules/okrs/pages/OkrDashboardPage";
import CeoDashboardPage from "./modules/okrs/pages/CeoDashboardPage";
import KpiDashboardPage from "./modules/kpis/pages/KpiDashboardPage";
import BuManagementPage from "./modules/bu/pages/BuManagementPage";
import SelectBu from "./pages/SelectBu";
import Auth from "./pages/Auth";
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

                {/* Integrações (Admin Global) */}
                <Route
                  path="/integrations"
                  element={
                    <ProtectedRoute skipBuCheck>
                      <ModuleRoute moduleSlug="integrations" requiresBu={false}>
                        <Integrations />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integrations/:id"
                  element={
                    <ProtectedRoute skipBuCheck>
                      <ModuleRoute moduleSlug="integrations" requiresBu={false}>
                        <IntegrationDetails />
                      </ModuleRoute>
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

                {/* Métricas/KPIs */}
                <Route
                  path="/metrics"
                  element={
                    <ProtectedRoute>
                      <BuRequiredRoute>
                        <ModuleRoute moduleSlug="metrics">
                          <KpiDashboardPage />
                        </ModuleRoute>
                      </BuRequiredRoute>
                    </ProtectedRoute>
                  }
                />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ModuleProvider>
          </BuProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
