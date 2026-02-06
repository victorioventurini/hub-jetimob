/**
 * Assets Routes
 * 
 * Rotas do módulo Assets - requerem BU e módulo 'assets' ativo.
 * @see TCR v2.73.0 - Módulo Assets
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BuRequiredRoute } from '@/components/auth/BuRequiredRoute';
import { ModuleRoute } from '@/components/auth/ModuleRoute';

const AssetsPage = lazy(() => import('@/modules/assets/pages/AssetsPage'));
const InventoryPage = lazy(() => import('@/modules/assets/pages/InventoryPage'));
const InventoryDetailPage = lazy(() => import('@/modules/assets/pages/InventoryDetailPage'));
const KeysPage = lazy(() => import('@/modules/assets/pages/KeysPage'));
const GiftsPage = lazy(() => import('@/modules/assets/pages/GiftsPage'));
const AssetsReportsPage = lazy(() => import('@/modules/assets/pages/AssetsReportsPage'));
const AssetsSettingsPage = lazy(() => import('@/modules/assets/pages/AssetsSettingsPage'));
const RecommendationsPage = lazy(() => import('@/modules/assets/pages/RecommendationsPage'));
const PublicAssetRedirect = lazy(() => import('@/pages/PublicAssetRedirect'));

/**
 * Helper para wrapping consistente de rotas Assets
 */
function AssetRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        <ModuleRoute moduleSlug="assets">
          {children}
        </ModuleRoute>
      </BuRequiredRoute>
    </ProtectedRoute>
  );
}

export const assetRoutes = (
  <>
    {/* Assets Layout com nested routes */}
    <Route
      path="/assets"
      element={<AssetRoute><AssetsPage /></AssetRoute>}
    >
      <Route path="inventory" element={<InventoryPage />} />
      <Route path="keys" element={<KeysPage />} />
      <Route path="gifts" element={<GiftsPage />} />
      <Route path="reports" element={<AssetsReportsPage />} />
      <Route path="settings" element={<AssetsSettingsPage />} />
    </Route>
    
    {/* Recommendations - Standalone page with own HubLayout */}
    <Route path="/assets/inventory/recommendations" element={<AssetRoute><RecommendationsPage /></AssetRoute>} />
    
    {/* Asset Inventory Detail - Full page layout */}
    <Route path="/assets/inventory/:id" element={<AssetRoute><InventoryDetailPage /></AssetRoute>} />
    
    {/* Asset by internal code - public redirect for QR codes */}
    <Route path="/assets/:code" element={<PublicAssetRedirect />} />
  </>
);
