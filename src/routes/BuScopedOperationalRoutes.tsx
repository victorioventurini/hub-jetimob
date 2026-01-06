/**
 * BuScopedOperationalRoutes
 * 
 * Defines all operational routes that require BU context.
 * These routes are rendered inside /bu/:buId/* path.
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';

// Lazy loaded components
const Index = lazy(() => import('@/pages/Index'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));

// Teams
const TeamsPage = lazy(() => import('@/modules/teams/pages/TeamsPage'));
const TeamDetailPage = lazy(() => import('@/modules/teams/pages/TeamDetailPage'));

// OKRs
const OkrsPage = lazy(() => import('@/modules/okrs/pages/OkrsPage'));
const OkrDashboardPage = lazy(() => import('@/modules/okrs/pages/OkrDashboardPage'));
const CeoDashboardPage = lazy(() => import('@/modules/okrs/pages/CeoDashboardPage'));
const OrgViewListPage = lazy(() => import('@/modules/okrs/pages/OrgViewListPage'));
const OrgObjectiveViewPage = lazy(() => import('@/modules/okrs/pages/OrgObjectiveViewPage'));
const TeamContributionPage = lazy(() => import('@/modules/okrs/pages/TeamContributionPage'));

// KPIs
const KpiDashboardPage = lazy(() => import('@/modules/kpis/pages/KpiDashboardPage'));

// Assets
const AssetsPage = lazy(() => import('@/modules/assets/pages/AssetsPage'));
const InventoryPage = lazy(() => import('@/modules/assets/pages/InventoryPage'));
const InventoryDetailPage = lazy(() => import('@/modules/assets/pages/InventoryDetailPage'));
const KeysPage = lazy(() => import('@/modules/assets/pages/KeysPage'));
const GiftsPage = lazy(() => import('@/modules/assets/pages/GiftsPage'));
const AssetsReportsPage = lazy(() => import('@/modules/assets/pages/AssetsReportsPage'));
const AssetsSettingsPage = lazy(() => import('@/modules/assets/pages/AssetsSettingsPage'));

// Tickets
const TicketsPage = lazy(() => import('@/modules/tickets/pages/TicketsPage'));
const TicketsListPage = lazy(() => import('@/modules/tickets/pages/TicketsListPage'));
const CreateTicketPage = lazy(() => import('@/modules/tickets/pages/CreateTicketPage'));
const TicketDetailPage = lazy(() => import('@/modules/tickets/pages/TicketDetailPage'));
const TicketsSettingsPage = lazy(() => import('@/modules/tickets/pages/TicketsSettingsPage'));

/**
 * Returns the JSX for BU-scoped operational routes.
 * These should be rendered inside a BuScopedRoute wrapper.
 */
export function getBuScopedRoutes() {
  return (
    <>
      {/* Home/Dashboard */}
      <Route index element={<Index />} />
      
      {/* Search */}
      <Route path="search" element={<SearchPage />} />
      
      {/* Users (within BU context) */}
      <Route 
        path="users/:id" 
        element={
          <ModuleRoute moduleSlug="users" requiresBu={false}>
            <UserProfile />
          </ModuleRoute>
        } 
      />
      
      {/* Teams */}
      <Route 
        path="teams" 
        element={
          <ModuleRoute moduleSlug="teams">
            <TeamsPage />
          </ModuleRoute>
        } 
      />
      <Route 
        path="teams/:id" 
        element={
          <ModuleRoute moduleSlug="teams">
            <TeamDetailPage />
          </ModuleRoute>
        } 
      />
      
      {/* OKRs */}
      <Route 
        path="okrs" 
        element={
          <ModuleRoute moduleSlug="okrs">
            <OkrDashboardPage />
          </ModuleRoute>
        } 
      />
      <Route 
        path="okrs/manage" 
        element={
          <ModuleRoute moduleSlug="okrs">
            <OkrsPage />
          </ModuleRoute>
        } 
      />
      <Route 
        path="okrs/ceo" 
        element={
          <ModuleRoute moduleSlug="okrs">
            <CeoDashboardPage />
          </ModuleRoute>
        } 
      />
      <Route 
        path="okrs/org-view" 
        element={
          <ModuleRoute moduleSlug="okrs">
            <OrgViewListPage />
          </ModuleRoute>
        } 
      />
      <Route 
        path="okrs/org-view/:objectiveId" 
        element={
          <ModuleRoute moduleSlug="okrs">
            <OrgObjectiveViewPage />
          </ModuleRoute>
        } 
      />
      <Route 
        path="okrs/team-contribution/:teamId" 
        element={
          <ModuleRoute moduleSlug="okrs">
            <TeamContributionPage />
          </ModuleRoute>
        } 
      />
      
      {/* KPIs */}
      <Route 
        path="kpis" 
        element={
          <ModuleRoute moduleSlug="kpis">
            <KpiDashboardPage />
          </ModuleRoute>
        } 
      />
      
      {/* Assets - Nested Routes */}
      <Route 
        path="assets" 
        element={
          <ModuleRoute moduleSlug="assets">
            <AssetsPage />
          </ModuleRoute>
        }
      >
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="keys" element={<KeysPage />} />
        <Route path="gifts" element={<GiftsPage />} />
        <Route path="reports" element={<AssetsReportsPage />} />
        <Route path="settings" element={<AssetsSettingsPage />} />
      </Route>
      
      {/* Asset Inventory Detail */}
      <Route 
        path="assets/inventory/:id" 
        element={
          <ModuleRoute moduleSlug="assets">
            <InventoryDetailPage />
          </ModuleRoute>
        } 
      />
      
      {/* Tickets - Nested Routes */}
      <Route 
        path="tickets" 
        element={
          <ModuleRoute moduleSlug="tickets">
            <TicketsPage />
          </ModuleRoute>
        }
      >
        <Route index element={<TicketsListPage />} />
        <Route path="new" element={<CreateTicketPage />} />
        <Route path="settings" element={<TicketsSettingsPage />} />
        <Route path=":id" element={<TicketDetailPage />} />
      </Route>
    </>
  );
}
