/**
 * Route Configuration Types
 * 
 * Define tipos para configuração declarativa de rotas.
 */

import { ReactNode, LazyExoticComponent, ComponentType } from 'react';

export interface RouteConfig {
  path: string;
  element: LazyExoticComponent<ComponentType<unknown>> | ComponentType<unknown>;
  /** Se true, usa ProtectedRoute */
  protected?: boolean;
  /** Se true, usa BuRequiredRoute */
  requiresBu?: boolean;
  /** Se true, usa AdminRoute */
  requiresAdmin?: boolean;
  /** Se true, usa BuAdminRoute */
  requiresBuAdmin?: boolean;
  /** Slug do módulo para ModuleRoute */
  moduleSlug?: string;
  /** Se true, pula verificação de BU no ProtectedRoute */
  skipBuCheck?: boolean;
  /** Se true, pula verificação de onboarding */
  skipOnboardingCheck?: boolean;
  /** Rotas filhas (nested routes) */
  children?: RouteConfig[];
  /** Layout wrapper */
  layout?: ComponentType<{ children: ReactNode }>;
  /** Se true, renderiza apenas em DEV */
  devOnly?: boolean;
}

export type RouteConfigArray = RouteConfig[];
