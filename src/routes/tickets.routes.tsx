/**
 * Tickets Routes
 * 
 * Rotas do módulo Tickets - requerem BU e módulo 'tickets' ativo.
 * @see TCR v2.73.0 - Módulo Tickets
 */

import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const TicketsPage = lazyWithRetry(() => import('@/modules/tickets/pages/TicketsPage'));
const TicketsListPage = lazyWithRetry(() => import('@/modules/tickets/pages/TicketsListPage'));
const CreateTicketPage = lazyWithRetry(() => import('@/modules/tickets/pages/CreateTicketPage'));
const TicketDetailPage = lazyWithRetry(() => import('@/modules/tickets/pages/TicketDetailPage'));
const TicketsSettingsPage = lazyWithRetry(() => import('@/modules/tickets/pages/TicketsSettingsPage'));

/**
 * Helper para wrapping consistente de rotas Tickets
 */
function TicketRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        <ModuleRoute moduleSlug="tickets">
          {children}
        </ModuleRoute>
      </BuRequiredRoute>
    </ProtectedRoute>
  );
}

export const ticketRoutes = (
  <>
    {/* Tickets Layout com nested routes */}
    <Route
      path="/tickets"
      element={<TicketRoute><TicketsPage /></TicketRoute>}
    >
      <Route index element={<TicketsListPage />} />
      <Route path="new" element={<CreateTicketPage />} />
    </Route>

    {/* Tickets Settings - Standalone (possui PageHeader próprio) */}
    <Route path="/tickets/settings" element={<TicketRoute><TicketsSettingsPage /></TicketRoute>} />

    {/* Ticket Detail - Standalone page without tabs */}
    <Route path="/tickets/:id" element={<TicketRoute><TicketDetailPage /></TicketRoute>} />
  </>
);
