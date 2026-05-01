/**
 * Teams Routes
 * 
 * Rotas do módulo Teams - requerem BU e módulo 'teams' ativo.
 * @see TCR v2.73.0 - Módulo Teams
 */

import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const TeamsPage = lazyWithRetry(() => import('@/modules/teams/pages/TeamsPage'));
const TeamDetailPage = lazyWithRetry(() => import('@/modules/teams/pages/TeamDetailPage'));
const SquadDetailPage = lazyWithRetry(() => import('@/modules/teams/pages/SquadDetailPage'));
const OrganogramPage = lazyWithRetry(() => import('@/modules/teams/pages/OrganogramPage'));

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
