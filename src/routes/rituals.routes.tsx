/**
 * Ritual Routes
 * 
 * Rotas dos rituais de gestão — requerem BU e módulo 'okrs' ativo.
 * Migrado de /okrs/* para /rituals/* namespace.
 * @see TCR v3.22.0
 */

import { Route, Navigate, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { BuAdminRoute } from '@/components/auth/BuAdminRoute';
import { CLevelRitualRoute } from '@/components/auth/CLevelRitualRoute';
import { WeeklyRitualRoute } from '@/components/auth/WeeklyRitualRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

// Ritual pages
const WizardsPage = lazyWithRetry(() => import('@/pages/Wizards'));
const CollaboratorCheckinPage = lazyWithRetry(() => import('@/modules/okrs/pages/CollaboratorCheckinPage'));
const LeaderPrepPage = lazyWithRetry(() => import('@/modules/okrs/pages/LeaderPrepPage'));
const TeamCheckinPage = lazyWithRetry(() => import('@/modules/okrs/pages/TeamCheckinPage'));
// CLevelCheckinPage removido do roteamento — rito 'clevel-checkin' descontinuado.
const MbrPage = lazyWithRetry(() => import('@/modules/okrs/pages/MbrPage'));
const AllHandsPage = lazyWithRetry(() => import('@/modules/okrs/pages/AllHandsPage'));
const MbrPrePage = lazyWithRetry(() => import('@/modules/okrs/pages/MbrPrePage'));
const QbrPrePage = lazyWithRetry(() => import('@/modules/okrs/pages/QbrPrePage'));
const QbrPreCLevelPage = lazyWithRetry(() => import('@/modules/okrs/pages/QbrPreCLevelPage'));
const QbrMeetingPage = lazyWithRetry(() => import('@/modules/okrs/pages/QbrMeetingPage'));
const QbrPostPage = lazyWithRetry(() => import('@/modules/okrs/pages/QbrPostPage'));
const RitualHistoryPage = lazyWithRetry(() => import('@/modules/okrs/pages/RitualHistoryPage'));
const PreWeeklyPage = lazyWithRetry(() => import('@/modules/okrs/pages/PreWeeklyPage'));
const WeeklyPage = lazyWithRetry(() => import('@/modules/okrs/pages/WeeklyPage'));
const DecisionsPage = lazyWithRetry(() => import('@/modules/okrs/pages/DecisionsPage'));

/**
 * Wrapper padrão para rotas de rituais
 */
function RitualRoute({ children, requiresBuAdmin = false, requiresCLevel = false, requiresAreaLeader = false, skipModule = false }: { children: React.ReactNode; requiresBuAdmin?: boolean; requiresCLevel?: boolean; requiresAreaLeader?: boolean; skipModule?: boolean }) {
  const inner = skipModule ? (
    <>{children}</>
  ) : (
    <ModuleRoute moduleSlug="okrs">
      {children}
    </ModuleRoute>
  );

  let guarded = inner;
  if (requiresCLevel) {
    guarded = <CLevelRitualRoute>{inner}</CLevelRitualRoute>;
  } else if (requiresAreaLeader) {
    guarded = <WeeklyRitualRoute>{inner}</WeeklyRitualRoute>;
  } else if (requiresBuAdmin) {
    guarded = <BuAdminRoute>{inner}</BuAdminRoute>;
  }
  
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        {guarded}
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
    
    {/* Central de Rituais */}
    <Route path="/rituals" element={<RitualRoute><WizardsPage /></RitualRoute>} />
    
    {/* Check-ins */}
    <Route path="/rituals/collaborator-checkin" element={<RitualRoute><CollaboratorCheckinPage /></RitualRoute>} />
    <Route path="/rituals/team-checkin-pre" element={<RitualRoute><LeaderPrepPage /></RitualRoute>} />
    <Route path="/rituals/team-checkin" element={<RitualRoute><TeamCheckinPage /></RitualRoute>} />
    {/* managers-checkin: rito descontinuado — substituído pelo MBR. Redireciona para /rituals. */}
    <Route path="/rituals/managers-checkin" element={<Navigate to="/rituals" replace />} />
    {/* clevel-checkin: rito descontinuado. Redireciona para /rituals. */}
    <Route path="/rituals/clevel-checkin" element={<Navigate to="/rituals" replace />} />
    
    {/* Semanais — Onda 4 */}
    <Route path="/rituals/pre-weekly" element={<RitualRoute><PreWeeklyPage /></RitualRoute>} />
    <Route path="/rituals/weekly" element={<RitualRoute requiresAreaLeader><WeeklyPage /></RitualRoute>} />

    {/* MBR */}
    <Route path="/rituals/mbr-pre" element={<RitualRoute><MbrPrePage /></RitualRoute>} />
    <Route path="/rituals/mbr" element={<RitualRoute requiresBuAdmin><MbrPage /></RitualRoute>} />
    <Route path="/rituals/mbr-v2" element={<Navigate to="/rituals/mbr" replace />} />
    <Route path="/rituals/all-hands" element={<RitualRoute requiresBuAdmin><AllHandsPage /></RitualRoute>} />
    
    {/* QBR */}
    <Route path="/rituals/qbr-pre" element={<RitualRoute><QbrPrePage /></RitualRoute>} />
    <Route path="/rituals/qbr-clevel" element={<RitualRoute requiresCLevel><QbrPreCLevelPage /></RitualRoute>} />
    <Route path="/rituals/qbr" element={<RitualRoute requiresCLevel><QbrMeetingPage /></RitualRoute>} />
    <Route path="/rituals/qbr-post" element={<RitualRoute requiresCLevel><QbrPostPage /></RitualRoute>} />
    
    {/* Histórico */}
    <Route path="/rituals/history" element={<RitualRoute><RitualHistoryPage /></RitualRoute>} />

    {/* Decisões — inbox unificado (acessível sem módulo okrs) */}
    <Route path="/decisions" element={<RitualRoute skipModule><DecisionsPage /></RitualRoute>} />
    <Route path="/rituals/decisions" element={<RedirectWithParams to="/decisions" />} />

    {/* ============================================================ */}
    {/* LEGACY REDIRECTS — preserva links existentes                 */}
    {/* ============================================================ */}
    <Route path="/wizards" element={<RedirectWithParams to="/rituals" />} />
    <Route path="/okrs/collaborator-checkin" element={<RedirectWithParams to="/rituals/collaborator-checkin" />} />
    <Route path="/okrs/leader-prep" element={<RedirectWithParams to="/rituals/team-checkin-pre" />} />
    <Route path="/okrs/team-checkin" element={<RedirectWithParams to="/rituals/team-checkin" />} />
    {/* managers-checkin: rito descontinuado — redireciona para hub de rituais. */}
    <Route path="/okrs/managers-checkin" element={<Navigate to="/rituals" replace />} />
    {/* clevel-checkin: rito descontinuado — redireciona para hub de rituais. */}
    <Route path="/okrs/clevel-checkin" element={<Navigate to="/rituals" replace />} />
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
