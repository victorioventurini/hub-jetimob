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
                {/* Auth - sem proteção */}
                <Route path="/auth" element={<Auth />} />

                {/* Home - sempre acessível (após login) */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />

                {/* ===== MÓDULOS GLOBAIS ===== */}
                {/* Usuários */}
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute>
                      <ModuleRoute moduleSlug="users" requiresBu={false}>
                        <Users />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />

                {/* Perfil */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ModuleRoute moduleSlug="profile" requiresBu={false}>
                        <Profile />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />

                {/* Integrações */}
                <Route
                  path="/integrations"
                  element={
                    <ProtectedRoute>
                      <ModuleRoute moduleSlug="integrations" requiresBu={false}>
                        <Integrations />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integrations/:id"
                  element={
                    <ProtectedRoute>
                      <ModuleRoute moduleSlug="integrations" requiresBu={false}>
                        <IntegrationDetails />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />

                {/* Business Units (Admin Global) */}
                <Route
                  path="/business-units"
                  element={
                    <ProtectedRoute>
                      <ModuleRoute moduleSlug="business-units" requiresBu={false}>
                        <BuManagementPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />

                {/* Módulos (catálogo) */}
                <Route
                  path="/modules"
                  element={
                    <ProtectedRoute>
                      <Modules />
                    </ProtectedRoute>
                  }
                />

                {/* ===== MÓDULOS OPERACIONAIS (requerem BU) ===== */}
                {/* Times */}
                <Route
                  path="/teams"
                  element={
                    <ProtectedRoute>
                      <ModuleRoute moduleSlug="teams">
                        <TeamsPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teams/:id"
                  element={
                    <ProtectedRoute>
                      <ModuleRoute moduleSlug="teams">
                        <TeamDetailPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />

                {/* OKRs */}
                <Route
                  path="/okrs"
                  element={
                    <ProtectedRoute>
                      <ModuleRoute moduleSlug="okrs">
                        <OkrDashboardPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/okrs/manage"
                  element={
                    <ProtectedRoute>
                      <ModuleRoute moduleSlug="okrs">
                        <OkrsPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/okrs/ceo"
                  element={
                    <ProtectedRoute>
                      <ModuleRoute moduleSlug="okrs">
                        <CeoDashboardPage />
                      </ModuleRoute>
                    </ProtectedRoute>
                  }
                />

                {/* Métricas/KPIs */}
                <Route
                  path="/metrics"
                  element={
                    <ProtectedRoute>
                      <ModuleRoute moduleSlug="metrics">
                        <KpiDashboardPage />
                      </ModuleRoute>
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
