/**
 * Hub Routes (Platform Admin)
 * 
 * Rotas do Hub Global - requerem AdminRoute.
 * Acessíveis apenas por super_admin e admin.
 * @see TCR v2.73.0 - Controle de Permissões
 */

import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const SettingsLayout = lazyWithRetry(() => import('@/components/settings/SettingsLayout').then(m => ({ default: m.SettingsLayout })));
const SettingsHome = lazyWithRetry(() => import('@/pages/settings/SettingsHome'));
const SettingsBusinessUnits = lazyWithRetry(() => import('@/pages/settings/SettingsBusinessUnits'));
const SettingsModules = lazyWithRetry(() => import('@/pages/settings/SettingsModules'));
const SettingsIntegrations = lazyWithRetry(() => import('@/pages/settings/SettingsIntegrations'));
const SettingsUiCatalog = lazyWithRetry(() => import('@/pages/settings/SettingsUiCatalog'));
const HubNotifications = lazyWithRetry(() => import('@/pages/hub/HubNotifications'));
const JobTitlesPage = lazyWithRetry(() => import('@/modules/settings/pages/JobTitlesPage'));
const OkrsSettingsPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrsSettingsPage'));
const AutomationsPage = lazyWithRetry(() => import('@/modules/automations/pages/AutomationsPage'));
const GlobalPermissionsPage = lazyWithRetry(() => import('@/modules/permissions/pages/GlobalPermissionsPage'));
const GlobalUsersPage = lazyWithRetry(() => import('@/modules/users-global/pages/GlobalUsersPage'));
const HubPartnersPage = lazyWithRetry(() => import('@/pages/settings/HubPartnersPage'));
const HubPartnerDetailPage = lazyWithRetry(() => import('@/pages/settings/HubPartnerDetailPage'));
const CronJobConfigPage = lazyWithRetry(() => import('@/modules/integrations/pages/CronJobConfigPage'));
const GlobalIntegrationDetailPage = lazyWithRetry(() => import('@/modules/integrations/pages/GlobalIntegrationDetailPage'));
const AgentsListPage = lazyWithRetry(() => import('@/modules/integrations/pages/AgentsListPage'));
const AgentFormPage = lazyWithRetry(() => import('@/modules/integrations/pages/AgentFormPage'));
const AgentLogsPage = lazyWithRetry(() => import('@/modules/integrations/pages/AgentLogsPage'));
const PerfDashboardPage = lazyWithRetry(() => import('@/modules/integrations/pages/PerfDashboardPage'));

/**
 * Helper para wrapping consistente de rotas Hub
 */
function HubRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute skipBuCheck>
      <AdminRoute>
        <SettingsLayout>
          {children}
        </SettingsLayout>
      </AdminRoute>
    </ProtectedRoute>
  );
}

export const hubRoutes = (
  <>
    {/* Hub Home */}
    <Route path="/hub" element={<HubRoute><SettingsHome /></HubRoute>} />
    
    {/* Business Units */}
    <Route path="/hub/business-units" element={<HubRoute><SettingsBusinessUnits /></HubRoute>} />
    
    {/* Modules */}
    <Route path="/hub/modules" element={<HubRoute><SettingsModules /></HubRoute>} />
    <Route path="/hub/modules/okrs/settings" element={<HubRoute><OkrsSettingsPage /></HubRoute>} />
    
    {/* Integrations */}
    <Route path="/hub/integrations" element={<HubRoute><SettingsIntegrations /></HubRoute>} />
    <Route path="/hub/integrations/cron-job" element={<HubRoute><CronJobConfigPage /></HubRoute>} />
    <Route path="/hub/integrations/:integrationKey" element={<HubRoute><GlobalIntegrationDetailPage /></HubRoute>} />
    {/* IMPORTANTE: /agents/new DEVE vir ANTES de /agents/:agentId */}
    <Route path="/hub/integrations/:integrationKey/agents/new" element={<HubRoute><AgentFormPage /></HubRoute>} />
    <Route path="/hub/integrations/:integrationKey/agents/:agentId" element={<HubRoute><AgentFormPage /></HubRoute>} />
    <Route path="/hub/integrations/:integrationKey/agents" element={<HubRoute><AgentsListPage /></HubRoute>} />
    <Route path="/hub/integrations/:integrationKey/logs" element={<HubRoute><AgentLogsPage /></HubRoute>} />
    
    {/* Performance */}
    <Route path="/hub/performance" element={<HubRoute><PerfDashboardPage /></HubRoute>} />
    
    {/* Automations */}
    <Route path="/hub/automations" element={<HubRoute><AutomationsPage /></HubRoute>} />
    
    {/* Permissions */}
    <Route path="/hub/permissions" element={<HubRoute><GlobalPermissionsPage /></HubRoute>} />
    
    {/* Job Titles */}
    <Route path="/hub/job-titles" element={<HubRoute><JobTitlesPage /></HubRoute>} />
    
    {/* Notifications */}
    <Route path="/hub/notifications" element={<HubRoute><HubNotifications /></HubRoute>} />
    
    {/* Users */}
    <Route path="/hub/users" element={<HubRoute><GlobalUsersPage /></HubRoute>} />
    
    {/* UI Catalog */}
    <Route path="/hub/ui" element={<HubRoute><SettingsUiCatalog /></HubRoute>} />
    
    {/* Partners */}
    <Route path="/hub/partners" element={<HubRoute><HubPartnersPage /></HubRoute>} />
    <Route path="/hub/partners/:partnerId" element={<HubRoute><HubPartnerDetailPage /></HubRoute>} />
  </>
);
