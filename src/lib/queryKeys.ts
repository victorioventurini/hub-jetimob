/**
 * Query Keys - Re-export file
 * 
 * ============================================================
 * MODULARIZED QUERY KEYS
 * ============================================================
 * 
 * As chaves foram organizadas em arquivos separados por domínio:
 * - auth.ts: Auth, Profiles, Identity, Onboarding
 * - okrs.ts: OKRs, KPIs
 * - assets.ts: Assets (Inventory, Keys, Gifts)
 * - tickets.ts: Tickets
 * - notifications.ts: Notifications
 * - teams.ts: Teams, Squads
 * - bu.ts: BU, Settings
 * - integrations.ts: Integrations, Automations, Vic
 * - permissions.ts: Permissions
 * - misc.ts: Home, Search, External, Users, Mentions
 * 
 * Para uso direto de um módulo específico:
 * import { okrsKeys } from '@/lib/queryKeys/okrs';
 * 
 * Para uso do objeto unificado (retrocompatível):
 * import { queryKeys } from '@/lib/queryKeys';
 */

// Re-export individual modules for direct usage
export * from './queryKeys/auth';
export * from './queryKeys/okrs';
export * from './queryKeys/assets';
export * from './queryKeys/tickets';
export * from './queryKeys/notifications';
export * from './queryKeys/teams';
export * from './queryKeys/areas';
export * from './queryKeys/bu';
export * from './queryKeys/integrations';
export * from './queryKeys/permissions';
export * from './queryKeys/misc';
export * from './queryKeys/savedLinks';
export * from './queryKeys/organogram';

// Import all modules for unified object
import { 
  authKeys, 
  profilesKeys, 
  identityKeys, 
  onboardingKeys, 
  myProfileKeys, 
  publicProfileKeys 
} from './queryKeys/auth';
import { okrsKeys, kpisKeys } from './queryKeys/okrs';
import { assetsKeys } from './queryKeys/assets';
import { ticketsKeys } from './queryKeys/tickets';
import { 
  notificationsKeys, 
  hubNotificationsKeys, 
  notificationAdminKeys 
} from './queryKeys/notifications';
import { 
  teamsKeys, 
  squadsKeys, 
  managersKeys, 
  teamManagementKeys 
} from './queryKeys/teams';
import { areasKeys } from './queryKeys/areas';
import { buKeys, settingsKeys, modulesPageKeys } from './queryKeys/bu';
import { 
  integrationsKeys, 
  automationsKeys, 
  cronJobKeys, 
  vicKeys 
} from './queryKeys/integrations';
import { permissionsKeys } from './queryKeys/permissions';
import { 
  homeKeys, 
  searchKeys, 
  externalKeys, 
  usersKeys, 
  mentionsKeys, 
  cyclesKeys 
} from './queryKeys/misc';
import { savedLinksKeys } from './queryKeys/savedLinks';

/**
 * Centralized TanStack Query Keys
 * 
 * Pattern: ['module', 'entity', buId, ...filters]
 * Always include buId when the data is scoped by BU
 * 
 * @deprecated Para novos usos, importe diretamente os módulos específicos.
 * Exemplo: import { okrsKeys } from '@/lib/queryKeys/okrs';
 */
export const queryKeys = {
  // Auth & Profiles
  auth: authKeys,
  profiles: profilesKeys,
  identity: identityKeys,
  onboarding: onboardingKeys,
  myProfile: myProfileKeys,
  publicProfile: publicProfileKeys,
  
  // Core Modules
  okrs: okrsKeys,
  kpis: kpisKeys,
  assets: assetsKeys,
  tickets: ticketsKeys,
  
  // Notifications
  notifications: notificationsKeys,
  hubNotifications: hubNotificationsKeys,
  notificationAdmin: notificationAdminKeys,
  
  // Teams & Organization
  teams: teamsKeys,
  squads: squadsKeys,
  managers: managersKeys,
  teamManagement: teamManagementKeys,
  areas: areasKeys,
  
  // BU & Settings
  bu: buKeys,
  settings: settingsKeys,
  modulesPage: modulesPageKeys,
  
  // Integrations
  integrations: integrationsKeys,
  automations: automationsKeys,
  cronJob: cronJobKeys,
  vic: vicKeys,
  
  // Permissions
  permissions: permissionsKeys,
  
  // Miscellaneous
  home: homeKeys,
  search: searchKeys,
  external: externalKeys,
  users: usersKeys,
  mentions: mentionsKeys,
  cycles: cyclesKeys,
  
  // Saved Links
  savedLinks: savedLinksKeys,
} as const;

// Helper type for extracting query key types
export type QueryKeys = typeof queryKeys;
