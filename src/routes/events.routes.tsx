/**
 * Events Routes
 * 
 * Rotas do módulo Events (Jet Experience) — requerem BU e módulo 'events' ativo.
 * Módulo 100% mockado, sem dependência de banco.
 */

import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';
import { EventsProvider } from '@/modules/events/context/EventsContext';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const EventsDashboardPage = lazyWithRetry(() => import('@/modules/events/pages/EventsDashboardPage'));
// EventsParticipantsPage replaced by EventsParticipantsFullPage
const EventsParticipantDetailPage = lazyWithRetry(() => import('@/modules/events/pages/EventsParticipantDetailPage'));
const EventsOpportunitiesPage = lazyWithRetry(() => import('@/modules/events/pages/EventsOpportunitiesPage'));
const EventsWebhookPage = lazyWithRetry(() => import('@/modules/events/pages/EventsWebhookPage'));
const EventsParticipantsFullPage = lazyWithRetry(() => import('@/modules/events/pages/EventsParticipantsFullPage'));
const EventsSettingsPage = lazyWithRetry(() => import('@/modules/events/pages/EventsSettingsPage'));
const EventSettingDetailPage = lazyWithRetry(() => import('@/modules/events/pages/EventSettingDetailPage'));

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
    <Route path="/events/participants" element={<EventRoute><EventsParticipantsFullPage /></EventRoute>} />
    <Route path="/events/participants/:id" element={<EventRoute><EventsParticipantDetailPage /></EventRoute>} />
    <Route path="/events/opportunities" element={<EventRoute><EventsOpportunitiesPage /></EventRoute>} />
    <Route path="/events/webhook" element={<EventRoute><EventsWebhookPage /></EventRoute>} />
    <Route path="/events/settings" element={<EventRoute><EventsSettingsPage /></EventRoute>} />
    <Route path="/events/settings/:eventId" element={<EventRoute><EventSettingDetailPage /></EventRoute>} />
  </>
);
