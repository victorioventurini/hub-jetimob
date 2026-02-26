/**
 * Events Routes
 * 
 * Rotas do módulo Events (Jet Experience) — requerem BU e módulo 'events' ativo.
 * Módulo 100% mockado, sem dependência de banco.
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';
import { EventsProvider } from '@/modules/events/context/EventsContext';

const EventsDashboardPage = lazy(() => import('@/modules/events/pages/EventsDashboardPage'));
const EventsParticipantsPage = lazy(() => import('@/modules/events/pages/EventsParticipantsPage'));
const EventsParticipantDetailPage = lazy(() => import('@/modules/events/pages/EventsParticipantDetailPage'));
const EventsOpportunitiesPage = lazy(() => import('@/modules/events/pages/EventsOpportunitiesPage'));
const EventsWebhookPage = lazy(() => import('@/modules/events/pages/EventsWebhookPage'));
const EventsParticipantsFullPage = lazy(() => import('@/modules/events/pages/EventsParticipantsFullPage'));

function EventRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        <ModuleRoute moduleSlug="events">
          <EventsProvider>
            {children}
          </EventsProvider>
        </ModuleRoute>
      </BuRequiredRoute>
    </ProtectedRoute>
  );
}

export const eventsRoutes = (
  <>
    <Route path="/events" element={<EventRoute><EventsDashboardPage /></EventRoute>} />
    <Route path="/events/participants" element={<EventRoute><EventsParticipantsPage /></EventRoute>} />
    <Route path="/events/participants/:id" element={<EventRoute><EventsParticipantDetailPage /></EventRoute>} />
    <Route path="/events/opportunities" element={<EventRoute><EventsOpportunitiesPage /></EventRoute>} />
    <Route path="/events/webhook" element={<EventRoute><EventsWebhookPage /></EventRoute>} />
    <Route path="/events/participants-list" element={<EventRoute><EventsParticipantsFullPage /></EventRoute>} />
  </>
);
