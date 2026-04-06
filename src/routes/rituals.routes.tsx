/**
 * Ritual Routes
 * 
 * Rotas dos rituais de gestão — requerem BU e módulo 'okrs' ativo.
 * Migrado de /okrs/* para /rituals/* namespace.
 * @see TCR v3.22.0
 */

import { lazy } from 'react';
import { Route, Navigate, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { BuAdminRoute } from '@/components/auth/BuAdminRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';

// Ritual pages
const WizardsPage = lazy(() => import('@/pages/Wizards'));
const CollaboratorCheckinPage = lazy(() => import('@/modules/okrs/pages/CollaboratorCheckinPage'));
const LeaderPrepPage = lazy(() => import('@/modules/okrs/pages/LeaderPrepPage'));
const TeamCheckinPage = lazy(() => import('@/modules/okrs/pages/TeamCheckinPage'));
const ManagersCheckinPage = lazy(() => import('@/modules/okrs/pages/ManagersCheckinPage'));
const CLevelCheckinPage = lazy(() => import('@/modules/okrs/pages/CLevelCheckinPage'));
const MbrPage = lazy(() => import('@/modules/okrs/pages/MbrPage'));
const MbrPrePage = lazy(() => import('@/modules/okrs/pages/MbrPrePage'));
const QbrPrePage = lazy(() => import('@/modules/okrs/pages/QbrPrePage'));
const QbrPreCLevelPage = lazy(() => import('@/modules/okrs/pages/QbrPreCLevelPage'));
const QbrMeetingPage = lazy(() => import('@/modules/okrs/pages/QbrMeetingPage'));
const QbrPostPage = lazy(() => import('@/modules/okrs/pages/QbrPostPage'));
const RitualHistoryPage = lazy(() => import('@/modules/okrs/pages/RitualHistoryPage'));

/**
 * Wrapper padrão para rotas de rituais
 */
function RitualRoute({ children, requiresBuAdmin = false }: { children: React.ReactNode; requiresBuAdmin?: boolean }) {
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
 * Preserves query params and hash during redirects
 */
function RedirectWithParams({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}${location.hash}`} replace />;
}

export const ritualRoutes = (
  <>
    {/* ============================================================ */}
    {/* ACTIVE ROUTES — /rituals/* namespace                         */}
    {/* ============================================================ */}
    
    {/* Hub de Rituais */}
    <Route path="/rituals" element={<RitualRoute><WizardsPage /></RitualRoute>} />
    
    {/* Check-ins */}
    <Route path="/rituals/collaborator-checkin" element={<RitualRoute><CollaboratorCheckinPage /></RitualRoute>} />
    <Route path="/rituals/team-checkin-pre" element={<RitualRoute><LeaderPrepPage /></RitualRoute>} />
    <Route path="/rituals/team-checkin" element={<RitualRoute><TeamCheckinPage /></RitualRoute>} />
    <Route path="/rituals/managers-checkin" element={<RitualRoute><ManagersCheckinPage /></RitualRoute>} />
    <Route path="/rituals/clevel-checkin" element={<RitualRoute><CLevelCheckinPage /></RitualRoute>} />
    
    {/* MBR */}
    <Route path="/rituals/mbr-pre" element={<RitualRoute><MbrPrePage /></RitualRoute>} />
    <Route path="/rituals/mbr" element={<RitualRoute requiresBuAdmin><MbrPage /></RitualRoute>} />
    
    {/* QBR */}
    <Route path="/rituals/qbr-pre" element={<RitualRoute><QbrPrePage /></RitualRoute>} />
    <Route path="/rituals/qbr-clevel" element={<RitualRoute requiresBuAdmin><QbrPreCLevelPage /></RitualRoute>} />
    <Route path="/rituals/qbr" element={<RitualRoute requiresBuAdmin><QbrMeetingPage /></RitualRoute>} />
    <Route path="/rituals/qbr-post" element={<RitualRoute requiresBuAdmin><QbrPostPage /></RitualRoute>} />
    
    {/* Histórico */}
    <Route path="/rituals/history" element={<RitualRoute><RitualHistoryPage /></RitualRoute>} />

    {/* ============================================================ */}
    {/* LEGACY REDIRECTS — preserva links existentes                 */}
    {/* ============================================================ */}
    <Route path="/wizards" element={<RedirectWithParams to="/rituals" />} />
    <Route path="/okrs/collaborator-checkin" element={<RedirectWithParams to="/rituals/collaborator-checkin" />} />
    <Route path="/okrs/leader-prep" element={<RedirectWithParams to="/rituals/team-checkin-pre" />} />
    <Route path="/okrs/team-checkin" element={<RedirectWithParams to="/rituals/team-checkin" />} />
    <Route path="/okrs/managers-checkin" element={<RedirectWithParams to="/rituals/managers-checkin" />} />
    <Route path="/okrs/clevel-checkin" element={<RedirectWithParams to="/rituals/clevel-checkin" />} />
    <Route path="/okrs/mbr" element={<RedirectWithParams to="/rituals/mbr" />} />
    <Route path="/okrs/mbr-pre" element={<RedirectWithParams to="/rituals/mbr-pre" />} />
    <Route path="/okrs/qbr-pre" element={<RedirectWithParams to="/rituals/qbr-pre" />} />
    <Route path="/okrs/qbr-pre-clevel" element={<RedirectWithParams to="/rituals/qbr-clevel" />} />
    <Route path="/rituals/qbr-pre-clevel" element={<RedirectWithParams to="/rituals/qbr-clevel" />} />
    <Route path="/okrs/qbr" element={<RedirectWithParams to="/rituals/qbr" />} />
    <Route path="/okrs/qbr-post" element={<RedirectWithParams to="/rituals/qbr-post" />} />
    <Route path="/okrs/ritual-history" element={<RedirectWithParams to="/rituals/history" />} />
  </>
);
