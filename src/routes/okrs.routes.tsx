/**
 * OKR Routes
 * 
 * Rotas do módulo OKRs - requerem BU e módulo 'okrs' ativo.
 * @see TCR v2.73.0 - Módulo OKRs
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { BuAdminRoute } from '@/components/auth/BuAdminRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const OkrsPage = lazy(() => import('@/modules/okrs/pages/OkrsPage'));
const OkrDashboardPage = lazy(() => import('@/modules/okrs/pages/OkrDashboardPage'));
const ExecutiveDashboardPage = lazy(() => import('@/modules/okrs/pages/ExecutiveDashboardPage'));
const OrgViewListPage = lazy(() => import('@/modules/okrs/pages/OrgViewListPage'));
const OrgObjectiveViewPage = lazy(() => import('@/modules/okrs/pages/OrgObjectiveViewPage'));
const TeamContributionPage = lazy(() => import('@/modules/okrs/pages/TeamContributionPage'));
const CycleCheckinsPage = lazy(() => import('@/modules/okrs/pages/CycleCheckinsPage'));
const OkrCreationPage = lazy(() => import('@/modules/okrs/pages/OkrCreationPage'));
const TeamKrCreationPage = lazy(() => import('@/modules/okrs/pages/TeamKrCreationPage'));
const CollaboratorCheckinPage = lazy(() => import('@/modules/okrs/pages/CollaboratorCheckinPage'));
const LeaderPrepPage = lazy(() => import('@/modules/okrs/pages/LeaderPrepPage'));
const TeamCheckinPage = lazy(() => import('@/modules/okrs/pages/TeamCheckinPage'));
const ManagersCheckinPage = lazy(() => import('@/modules/okrs/pages/ManagersCheckinPage'));
const CLevelCheckinPage = lazy(() => import('@/modules/okrs/pages/CLevelCheckinPage'));
const OkrQualityPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrQualityPage'));
const OkrConstructionReviewPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrConstructionReviewPage'));
const OrgConstructionReviewPage = lazyWithRetry(() => import('@/modules/okrs/pages/OrgConstructionReviewPage'));
const OrgAnalysisPage = lazyWithRetry(() => import('@/modules/okrs/pages/OrgAnalysisPage'));
const OkrHealthPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrHealthPage'));
const MbrPage = lazy(() => import('@/modules/okrs/pages/MbrPage'));
const RitualHistoryPage = lazy(() => import('@/modules/okrs/pages/RitualHistoryPage'));
const QbrPrePage = lazy(() => import('@/modules/okrs/pages/QbrPrePage'));
const QbrPreCLevelPage = lazy(() => import('@/modules/okrs/pages/QbrPreCLevelPage'));
const QbrMeetingPage = lazy(() => import('@/modules/okrs/pages/QbrMeetingPage'));
const QbrPostPage = lazy(() => import('@/modules/okrs/pages/QbrPostPage'));

/**
 * Helper para wrapping consistente de rotas OKR
 */
function OkrRoute({ children, requiresBuAdmin = false }: { children: React.ReactNode; requiresBuAdmin?: boolean }) {
  const inner = (
    <ModuleRoute moduleSlug="okrs">
      {children}
    </ModuleRoute>
  );
  
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        {requiresBuAdmin ? <BuAdminRoute>{inner}</BuAdminRoute> : inner}
      </BuRequiredRoute>
    </ProtectedRoute>
  );
}

export const okrRoutes = (
  <>
    {/* Dashboard */}
    <Route path="/okrs" element={<OkrRoute><OkrDashboardPage /></OkrRoute>} />
    <Route path="/okrs/manage" element={<OkrRoute><OkrsPage /></OkrRoute>} />
    <Route path="/okrs/executive" element={<OkrRoute><ExecutiveDashboardPage /></OkrRoute>} />
    
    {/* Creation */}
    <Route path="/okrs/create" element={<OkrRoute><OkrCreationPage /></OkrRoute>} />
    <Route path="/okrs/objectives/:objectiveId/krs/create" element={<OkrRoute><TeamKrCreationPage /></OkrRoute>} />
    
    {/* MBR */}
    <Route path="/okrs/mbr" element={<OkrRoute requiresBuAdmin><MbrPage /></OkrRoute>} />
    
    {/* Check-ins */}
    <Route path="/okrs/collaborator-checkin" element={<OkrRoute><CollaboratorCheckinPage /></OkrRoute>} />
    <Route path="/okrs/leader-prep" element={<OkrRoute><LeaderPrepPage /></OkrRoute>} />
    <Route path="/okrs/team-checkin" element={<OkrRoute><TeamCheckinPage /></OkrRoute>} />
    <Route path="/okrs/managers-checkin" element={<OkrRoute><ManagersCheckinPage /></OkrRoute>} />
    <Route path="/okrs/clevel-checkin" element={<OkrRoute><CLevelCheckinPage /></OkrRoute>} />
    <Route path="/okrs/checkins" element={<OkrRoute><CycleCheckinsPage /></OkrRoute>} />
    <Route path="/okrs/ritual-history" element={<OkrRoute><RitualHistoryPage /></OkrRoute>} />
    
    {/* Quality & Analysis */}
    <Route path="/okrs/quality" element={<OkrRoute><OkrQualityPage /></OkrRoute>} />
    <Route path="/okrs/construction-review" element={<OkrRoute><OkrConstructionReviewPage /></OkrRoute>} />
    <Route path="/okrs/org-construction-review" element={<OkrRoute requiresBuAdmin><OrgConstructionReviewPage /></OkrRoute>} />
    <Route path="/okrs/analysis" element={<OkrRoute requiresBuAdmin><OrgAnalysisPage /></OkrRoute>} />
    <Route path="/okrs/health" element={<OkrRoute requiresBuAdmin><OkrHealthPage /></OkrRoute>} />
    
    {/* Org View */}
    <Route path="/okrs/org-view" element={<OkrRoute><OrgViewListPage /></OkrRoute>} />
    <Route path="/okrs/org-view/:objectiveId" element={<OkrRoute><OrgObjectiveViewPage /></OkrRoute>} />
    
    {/* Team Contribution */}
    <Route path="/okrs/team-contribution/:teamId" element={<OkrRoute><TeamContributionPage /></OkrRoute>} />
  </>
);
