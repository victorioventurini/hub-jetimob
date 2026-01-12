/**
 * Query Cache Configuration by Domain
 * 
 * Centralized staleTime and gcTime configuration per domain.
 * Use these constants when defining queries to ensure consistency.
 * 
 * @see docs/engineering/HYGIENE_AND_OPTIMIZATION_PLAN_2026-01.md - Wave 4
 */

/**
 * Time constants (in milliseconds)
 */
const SECOND = 1000;
const MINUTE = 60 * SECOND;

/**
 * Domain-specific cache configurations
 * 
 * Categories:
 * - REALTIME: Data that should always be fresh (notifications, alerts)
 * - DYNAMIC: Data that changes frequently (tickets, OKR check-ins)
 * - MODERATE: Data that changes occasionally (dashboards, reports)
 * - STABLE: Data that rarely changes (profiles, teams, permissions)
 * - STATIC: Data that almost never changes (catalogs, configs)
 */
export const queryCacheConfig = {
  // ========== REALTIME (0-10s) ==========
  realtime: {
    notifications: {
      staleTime: 0,
      gcTime: 5 * MINUTE,
      description: 'Notificações devem ser sempre frescas',
    },
    healthAlerts: {
      staleTime: 10 * SECOND,
      gcTime: 5 * MINUTE,
      description: 'Alertas de saúde precisam de atualização frequente',
    },
  },

  // ========== DYNAMIC (30s-1min) ==========
  dynamic: {
    tickets: {
      staleTime: 30 * SECOND,
      gcTime: 5 * MINUTE,
      description: 'Tickets mudam frequentemente com interações',
    },
    okrDashboard: {
      staleTime: 30 * SECOND,
      gcTime: 5 * MINUTE,
      description: 'Dashboard OKR pode ter dados ligeiramente antigos',
    },
    checkins: {
      staleTime: 1 * MINUTE,
      gcTime: 10 * MINUTE,
      description: 'Check-ins podem ter cache curto',
    },
  },

  // ========== MODERATE (2-5min) ==========
  moderate: {
    homeDashboard: {
      staleTime: 2 * MINUTE,
      gcTime: 10 * MINUTE,
      description: 'Dashboard home com dados agregados',
    },
    okrInsights: {
      staleTime: 2 * MINUTE,
      gcTime: 10 * MINUTE,
      description: 'Insights OKR calculados periodicamente',
    },
    directory: {
      staleTime: 2 * MINUTE,
      gcTime: 10 * MINUTE,
      description: 'Diretório de usuários com cache moderado',
    },
    assets: {
      staleTime: 2 * MINUTE,
      gcTime: 10 * MINUTE,
      description: 'Inventário de ativos com cache moderado',
    },
  },

  // ========== STABLE (5-10min) ==========
  stable: {
    profiles: {
      staleTime: 5 * MINUTE,
      gcTime: 30 * MINUTE,
      description: 'Perfis raramente mudam durante sessão',
    },
    teams: {
      staleTime: 5 * MINUTE,
      gcTime: 30 * MINUTE,
      description: 'Estrutura de times é estável',
    },
    permissions: {
      staleTime: 5 * MINUTE,
      gcTime: 30 * MINUTE,
      description: 'Permissões mudam apenas por admin',
    },
    modules: {
      staleTime: 5 * MINUTE,
      gcTime: 30 * MINUTE,
      description: 'Módulos habilitados são estáveis',
    },
    buUnits: {
      staleTime: 10 * MINUTE,
      gcTime: 60 * MINUTE,
      description: 'Unidades de negócio raramente mudam',
    },
    identity: {
      staleTime: 10 * MINUTE,
      gcTime: 60 * MINUTE,
      description: 'Identidade do usuário é muito estável',
    },
  },

  // ========== STATIC (10min+) ==========
  static: {
    permissionCatalog: {
      staleTime: 10 * MINUTE,
      gcTime: 60 * MINUTE,
      description: 'Catálogo de permissões muda apenas em deploy',
    },
    notificationEvents: {
      staleTime: 10 * MINUTE,
      gcTime: 60 * MINUTE,
      description: 'Eventos de notificação são configuração',
    },
    cycles: {
      staleTime: 10 * MINUTE,
      gcTime: 60 * MINUTE,
      description: 'Ciclos OKR são configuração estável',
    },
    locations: {
      staleTime: 10 * MINUTE,
      gcTime: 60 * MINUTE,
      description: 'Localizações mudam raramente',
    },
  },
} as const;

/**
 * Helper to get config for a domain
 */
export function getQueryCacheConfig(
  category: keyof typeof queryCacheConfig,
  domain: string
): { staleTime: number; gcTime: number } {
  const categoryConfig = queryCacheConfig[category];
  const domainConfig = (categoryConfig as Record<string, { staleTime: number; gcTime: number }>)[domain];
  
  if (!domainConfig) {
    // Fallback to moderate defaults
    return {
      staleTime: 2 * MINUTE,
      gcTime: 10 * MINUTE,
    };
  }
  
  return {
    staleTime: domainConfig.staleTime,
    gcTime: domainConfig.gcTime,
  };
}

/**
 * Quick access constants for common patterns
 */
export const CACHE_TIMES = {
  REALTIME: 0,
  DYNAMIC_SHORT: 30 * SECOND,
  DYNAMIC: 1 * MINUTE,
  MODERATE: 2 * MINUTE,
  STABLE: 5 * MINUTE,
  STATIC: 10 * MINUTE,
} as const;
