/**
 * Core Routes
 * 
 * Rotas core do sistema: Home, Profile, Users, Modules, etc.
 * @see TCR v2.73.0
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';

const Index = lazy(() => import('@/pages/Index'));
const ExternalDashboardPage = lazy(() => import('@/pages/ExternalDashboard'));
const Users = lazy(() => import('@/pages/Users'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));
const Profile = lazy(() => import('@/pages/Profile'));
const Modules = lazy(() => import('@/pages/Modules'));
const SelectBu = lazy(() => import('@/pages/SelectBu'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const WizardsPage = lazy(() => import('@/pages/Wizards'));
const VicTestPage = lazy(() => import('@/pages/VicTestPage'));
const DevDocsPage = lazy(() => import('@/pages/DevDocsPage'));
const NotificationsPage = lazy(() => import('@/pages/me/NotificationsPage'));
const ResolveContextPage = lazy(() => import('@/pages/ResolveContextPage'));
const BuManagementPage = lazy(() => import('@/modules/bu/pages/BuManagementPage'));
const KpiDashboardPage = lazy(() => import('@/modules/kpis/pages/KpiDashboardPage'));
const KpiEvolutionPage = lazy(() => import('@/modules/kpis/pages/KpiEvolutionPage'));
const PartnerContactProfilePage = lazy(() => import('@/modules/tickets/pages/PartnerContactProfilePage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export const coreRoutes = (
  <>
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
        <ProtectedRoute skipBuCheck skipOnboardingCheck>
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

    {/* Context Resolver - resolves BU from resource and redirects */}
    <Route
      path="/go/:entity/:id"
      element={
        <ProtectedRoute skipBuCheck>
          <ResolveContextPage />
        </ProtectedRoute>
      }
    />

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
    <Route
      path="/kpis/evolution"
      element={
        <ProtectedRoute>
          <BuRequiredRoute>
            <ModuleRoute moduleSlug="kpis">
              <KpiEvolutionPage />
            </ModuleRoute>
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

    {/* DEV ONLY Routes */}
    {import.meta.env.DEV && (
      <>
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
        <Route
          path="/dev/docs"
          element={
            <ProtectedRoute>
              <BuRequiredRoute>
                <DevDocsPage />
              </BuRequiredRoute>
            </ProtectedRoute>
          }
        />
      </>
    )}

    {/* Catch-all 404 */}
    <Route path="*" element={<NotFound />} />
  </>
);
