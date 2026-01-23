/**
 * Settings Routes (BU-scoped)
 * 
 * Rotas de configurações da BU - requerem BU selecionada.
 * @see TCR v2.73.0 - Settings
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';

const HubLayout = lazy(() => import('@/components/layout/HubLayout').then(m => ({ default: m.HubLayout })));
const BuSettingsPage = lazy(() => import('@/pages/settings/BuSettingsPage'));
const BuPermissionsPage = lazy(() => import('@/modules/permissions/pages/BuPermissionsPage'));
const SettingsNotifications = lazy(() => import('@/pages/settings/SettingsNotifications'));
const AreasPage = lazy(() => import('@/modules/areas/pages/AreasPage'));
const PartnersPage = lazy(() => import('@/modules/partners/pages/PartnersPage'));
const PartnerFormPage = lazy(() => import('@/modules/partners/pages/PartnerFormPage'));
const PartnerDetailPage = lazy(() => import('@/modules/partners/pages/PartnerDetailPage'));

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
    
    {/* Partners (BU-scoped) */}
    <Route path="/settings/partners" element={<PartnersRoute><PartnersPage /></PartnersRoute>} />
    <Route path="/settings/partners/new" element={<PartnersRoute><PartnerFormPage /></PartnersRoute>} />
    <Route path="/settings/partners/:partnerId" element={<PartnersRoute><PartnerDetailPage /></PartnersRoute>} />
  </>
);
