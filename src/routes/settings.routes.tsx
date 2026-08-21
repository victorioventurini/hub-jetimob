/**
 * Settings Routes (BU-scoped)
 * 
 * Rotas de configurações da BU - requerem BU selecionada.
 * @see TCR v2.73.0 - Settings
 */

import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';
import { BuAdminRoute } from '@/components/auth/BuAdminRoute';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const HubLayout = lazyWithRetry(() => import('@/components/layout/HubLayout').then(m => ({ default: m.HubLayout })));
const BuSettingsPage = lazyWithRetry(() => import('@/pages/settings/BuSettingsPage'));
const BuPermissionsPage = lazyWithRetry(() => import('@/modules/permissions/pages/BuPermissionsPage'));
const SettingsNotifications = lazyWithRetry(() => import('@/pages/settings/SettingsNotifications'));
const AreasPage = lazyWithRetry(() => import('@/modules/areas/pages/AreasPage'));
const PartnersPage = lazyWithRetry(() => import('@/modules/partners/pages/PartnersPage'));
const PartnerFormPage = lazyWithRetry(() => import('@/modules/partners/pages/PartnerFormPage'));
const PartnerDetailPage = lazyWithRetry(() => import('@/modules/partners/pages/PartnerDetailPage'));
const RitualCalendarPage = lazyWithRetry(() => import('@/modules/okrs/pages/RitualCalendarPage'));
const BuApiKeysPage = lazyWithRetry(() => import('@/modules/settings/api-keys/pages/BuApiKeysPage'));

/**
 * Helper para wrapping consistente de rotas Settings
 */
function SettingsRoute({ children, layout = false }: { children: React.ReactNode; layout?: boolean }) {
  const inner = layout ? <HubLayout>{children}</HubLayout> : children;
  
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        {inner}
      </BuRequiredRoute>
    </ProtectedRoute>
  );
}

function PartnersRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        <ModuleRoute moduleSlug="partners">
          {children}
        </ModuleRoute>
      </BuRequiredRoute>
    </ProtectedRoute>
  );
}

export const settingsRoutes = (
  <>
    {/* BU Settings Home */}
    <Route path="/settings" element={<SettingsRoute><BuSettingsPage /></SettingsRoute>} />
    
    {/* BU Permissions */}
    <Route path="/settings/permissions" element={<SettingsRoute><BuPermissionsPage /></SettingsRoute>} />
    
    {/* BU Notifications */}
    <Route path="/settings/notifications" element={<SettingsRoute layout><SettingsNotifications /></SettingsRoute>} />
    
    {/* BU Areas */}
    <Route path="/settings/areas" element={<SettingsRoute layout><AreasPage /></SettingsRoute>} />
    
    {/* Ritual Calendar (BU Admin only) */}
    <Route path="/settings/rituals" element={
      <ProtectedRoute>
        <BuRequiredRoute>
          <BuAdminRoute>
            <HubLayout><RitualCalendarPage /></HubLayout>
          </BuAdminRoute>
        </BuRequiredRoute>
      </ProtectedRoute>
    } />

    {/* BU API Keys (BU Admin only) */}
    <Route path="/settings/api-keys" element={
      <ProtectedRoute>
        <BuRequiredRoute>
          <BuAdminRoute>
            <HubLayout><BuApiKeysPage /></HubLayout>
          </BuAdminRoute>
        </BuRequiredRoute>
      </ProtectedRoute>
    } />
    
    
    {/* Partners (BU-scoped) */}
    <Route path="/settings/partners" element={<PartnersRoute><PartnersPage /></PartnersRoute>} />
    <Route path="/settings/partners/new" element={<PartnersRoute><PartnerFormPage /></PartnersRoute>} />
    <Route path="/settings/partners/:partnerId" element={<PartnersRoute><PartnerDetailPage /></PartnersRoute>} />
  </>
);
