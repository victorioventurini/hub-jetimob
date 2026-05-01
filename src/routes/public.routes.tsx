/**
 * Public Routes
 * 
 * Rotas públicas que NÃO requerem autenticação nem BuProvider.
 * @see TCR v2.73.0 - Seção A.1 PRE-BU vs POST-BU
 */

import { Route } from 'react-router-dom';
import Auth from '@/pages/Auth';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const AuthCallback = lazyWithRetry(() => import('@/pages/AuthCallback'));
const AuthConfirm = lazyWithRetry(() => import('@/pages/AuthConfirm'));
const PublicAsset = lazyWithRetry(() => import('@/pages/PublicAsset'));
const EventsCapturePage = lazyWithRetry(() => import('@/modules/events/pages/EventsCapturePage'));

export const publicRoutes = (
  <>
    <Route path="/auth" element={<Auth />} />
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/auth/confirm" element={<AuthConfirm />} />
    <Route path="/p/assets/:code" element={<PublicAsset />} />
    <Route path="/p/events/capture/:eventCode" element={<EventsCapturePage />} />
  </>
);

export const PUBLIC_PATHS = ['/auth', '/auth/callback', '/auth/confirm', '/p/assets', '/p/events'] as const;
