/**
 * Teams Routes
 * 
 * Rotas do módulo Teams - requerem BU e módulo 'teams' ativo.
 * @see TCR v2.73.0 - Módulo Teams
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';

const TeamsPage = lazy(() => import('@/modules/teams/pages/TeamsPage'));
const TeamDetailPage = lazy(() => import('@/modules/teams/pages/TeamDetailPage'));
const SquadDetailPage = lazy(() => import('@/modules/teams/pages/SquadDetailPage'));
const OrganogramPage = lazy(() => import('@/modules/teams/pages/OrganogramPage'));

/**
 * Helper para wrapping consistente de rotas Teams
 */
function TeamRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        <ModuleRoute moduleSlug="teams">
          {children}
        </ModuleRoute>
      </BuRequiredRoute>
    </ProtectedRoute>
  );
}

export const teamRoutes = (
  <>
    <Route path="/teams" element={<TeamRoute><TeamsPage /></TeamRoute>} />
    <Route path="/teams/:id" element={<TeamRoute><TeamDetailPage /></TeamRoute>} />
    <Route path="/teams/org-chart" element={<TeamRoute><OrganogramPage /></TeamRoute>} />
    <Route path="/squads/:id" element={<TeamRoute><SquadDetailPage /></TeamRoute>} />
  </>
);
