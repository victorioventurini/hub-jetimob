import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BuProvider } from "@/contexts/BuContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute>
                  <TeamsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams/:id"
              element={
                <ProtectedRoute>
                  <TeamDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modules"
              element={
                <ProtectedRoute>
                  <Modules />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute>
                  <Integrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations/:id"
              element={
                <ProtectedRoute>
                  <IntegrationDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/okrs"
              element={
                <ProtectedRoute>
                  <OkrDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/okrs/manage"
              element={
                <ProtectedRoute>
                  <OkrsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/okrs/ceo"
              element={
                <ProtectedRoute>
                  <CeoDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/metrics"
              element={
                <ProtectedRoute>
                  <KpiDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business-units"
              element={
                <ProtectedRoute>
                  <BuManagementPage />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BuProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
