/**
 * OKR Routes
 * 
 * Rotas do módulo OKRs - requerem BU e módulo 'okrs' ativo.
 * @see TCR v2.73.0 - Módulo OKRs
 */

import { Route, Navigate, useParams } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { BuAdminRoute } from '@/components/auth/BuAdminRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';
import { TeamOkrCreationRoute } from '@/components/auth/TeamOkrCreationRoute';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const OkrsPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrsPage'));
const OkrDashboardPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrDashboardPage'));
const ExecutiveDashboardPage = lazyWithRetry(() => import('@/modules/okrs/pages/ExecutiveDashboardPage'));
const ExecutiveQuarterReviewPage = lazyWithRetry(() => import('@/modules/okrs/pages/ExecutiveQuarterReviewPage'));
const OrgViewListPage = lazyWithRetry(() => import('@/modules/okrs/pages/OrgViewListPage'));
const OrgObjectiveViewPage = lazyWithRetry(() => import('@/modules/okrs/pages/OrgObjectiveViewPage'));
const TeamContributionPage = lazyWithRetry(() => import('@/modules/okrs/pages/TeamContributionPage'));
const CycleCheckinsPage = lazyWithRetry(() => import('@/modules/okrs/pages/CycleCheckinsPage'));
const OkrCreationPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrCreationPage'));
const TeamKrCreationPage = lazyWithRetry(() => import('@/modules/okrs/pages/TeamKrCreationPage'));
const OkrQualityPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrQualityPage'));
const OkrConstructionReviewPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrConstructionReviewPage'));
const OrgConstructionReviewPage = lazyWithRetry(() => import('@/modules/okrs/pages/OrgConstructionReviewPage'));
const OkrFullConstructionReviewPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrFullConstructionReviewPage'));
const OrgAnalysisPage = lazyWithRetry(() => import('@/modules/okrs/pages/OrgAnalysisPage'));
const OkrHealthPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrHealthPage'));
const QbrExecutiveReportPage = lazyWithRetry(() => import('@/modules/okrs/pages/QbrExecutiveReportPage'));
const MbrExecutiveReportPage = lazyWithRetry(() => import('@/modules/okrs/pages/MbrExecutiveReportPage'));
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

/**
 * Redirect legacy `/okrs/team-objective/:id` → `/go/okr_team_objective/:id`.
 * URLs antigas espalhadas em emails, bookmarks e mensagens continuam funcionando.
 * Ver mem://standards/links/internal-okr-navigation.
 */
function LegacyTeamObjectiveRedirect() {
  const { objectiveId } = useParams<{ objectiveId: string }>();
  return <Navigate to={`/go/okr_team_objective/${objectiveId}`} replace />;
}

/**
 * Redirect legacy `/okrs/team/:id` (vindo de versões antigas do ResolveContextPage).
 */
function LegacyOkrsTeamRedirect() {
  const { objectiveId } = useParams<{ objectiveId: string }>();
  return <Navigate to={`/go/okr_team_objective/${objectiveId}`} replace />;
}

/**
 * Redirect legacy `/okrs/org/:id` (vindo de versões antigas do ResolveContextPage).
 */
function LegacyOkrsOrgRedirect() {
  const { objectiveId } = useParams<{ objectiveId: string }>();
  return <Navigate to={`/okrs/org-view/${objectiveId}`} replace />;
}
export const okrRoutes = (
  <>
    {/* Dashboard */}
    <Route path="/okrs" element={<OkrRoute><OkrDashboardPage /></OkrRoute>} />
    <Route path="/okrs/manage" element={<OkrRoute><OkrsPage /></OkrRoute>} />
    <Route path="/okrs/executive" element={<OkrRoute><ExecutiveDashboardPage /></OkrRoute>} />
    <Route path="/okrs/executive/quarter-review" element={<OkrRoute requiresBuAdmin><ExecutiveQuarterReviewPage /></OkrRoute>} />
    <Route path="/okrs/executive/qbr-report" element={<OkrRoute><QbrExecutiveReportPage /></OkrRoute>} />
    <Route path="/okrs/executive/mbr-report" element={<OkrRoute><MbrExecutiveReportPage /></OkrRoute>} />
    
    {/* Creation */}
    <Route path="/okrs/create" element={<OkrRoute><TeamOkrCreationRoute><OkrCreationPage /></TeamOkrCreationRoute></OkrRoute>} />
    <Route path="/okrs/objectives/:objectiveId/krs/create" element={<OkrRoute><TeamKrCreationPage /></OkrRoute>} />
    
    {/* Check-ins (non-ritual) */}
    <Route path="/okrs/checkins" element={<OkrRoute><CycleCheckinsPage /></OkrRoute>} />
    
    {/* Quality & Analysis */}
    <Route path="/okrs/quality" element={<OkrRoute><OkrQualityPage /></OkrRoute>} />
    <Route path="/okrs/construction-review" element={<OkrRoute><OkrConstructionReviewPage /></OkrRoute>} />
    <Route path="/okrs/org-construction-review" element={<OkrRoute requiresBuAdmin><OrgConstructionReviewPage /></OkrRoute>} />
    <Route path="/okrs/construction-review-cross" element={<OkrRoute requiresBuAdmin><OkrFullConstructionReviewPage /></OkrRoute>} />
    <Route path="/okrs/analysis" element={<OkrRoute requiresBuAdmin><OrgAnalysisPage /></OkrRoute>} />
    <Route path="/okrs/health" element={<OkrRoute requiresBuAdmin><OkrHealthPage /></OkrRoute>} />
    
    {/* Org View */}
    <Route path="/okrs/org-view" element={<OkrRoute><OrgViewListPage /></OkrRoute>} />
    <Route path="/okrs/org-view/:objectiveId" element={<OkrRoute><OrgObjectiveViewPage /></OkrRoute>} />
    
    {/* Team Contribution */}
    <Route path="/okrs/team-contribution/:teamId" element={<OkrRoute><TeamContributionPage /></OkrRoute>} />

    {/* Legacy redirects (URLs antigas em emails/bookmarks) */}
    <Route path="/okrs/team-objective/:objectiveId" element={<LegacyTeamObjectiveRedirect />} />
    <Route path="/okrs/team/:objectiveId" element={<LegacyOkrsTeamRedirect />} />
    <Route path="/okrs/org/:objectiveId" element={<LegacyOkrsOrgRedirect />} />
  </>
);
