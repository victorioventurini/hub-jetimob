/**
 * Notifications Hooks - Barrel File
 * Consolidação TCR §10.4
 * 
 * IMPORTANTE: Todos os imports de hooks de notificações devem usar este barrel.
 * Proibido: import { X } from '@/hooks/notifications/useX'
 * Correto: import { X } from '@/hooks/notifications'
 */

// ========================================
// Types
// ========================================
export type {
  NotificationEvent,
  NotificationChannel,
  BuNotificationChannel,
  UserNotificationSetting,
  EmitNotificationParams,
  UpsertChannelParams,
  UpdatePreferenceParams,
  SendTestNotificationParams,
  TestNotificationResult,
} from './types';

// ========================================
// Core Queries (useNotificationQueries.ts)
// ========================================
export {
  useNotificationEvents,
  useNotificationChannels,
  useBuNotificationChannels,
  useUserNotificationSettings,
} from './useNotificationQueries';

// ========================================
// Core Mutations (useNotificationMutations.ts)
// ========================================
export {
  useBuNotificationChannelMutations,
  useUserNotificationPreferenceMutation,
  useEmitNotificationEvent,
  useSendTestNotification,
} from './useNotificationMutations';

// ========================================
// Admin Hooks (useNotificationAdmin.ts)
// ========================================
export {
  useBuEventSettings,
  useBuEventSettingMutation,
  useNotificationOutbox,
  useRetryOutboxItem,
  useInAppNotifications,
  useOutboxStats,
  useBuProfiles,
} from './useNotificationAdmin';

export type {
  OutboxItem,
  InAppNotification,
  BuEventSetting,
  OutboxFilters,
  InAppFilters,
} from './useNotificationAdmin';

// ========================================
// Templates Hooks (useNotificationTemplates.ts)
// ========================================
export {
  useNotificationTemplates,
  useNotificationTemplateVersions,
  useNotificationTemplateVariables,
  useNotificationTemplateAudit,
  useSaveTemplateVersion,
  useActivateTemplateVersion,
  useCreateBuTemplate,
  extractTemplateVariables,
  validateTemplateVariables,
} from './useNotificationTemplates';

export type {
  NotificationTemplate,
  TemplateVersion,
  TemplateVariable,
  TemplateAuditLog,
  TemplateFilters,
} from './useNotificationTemplates';

// ========================================
// Utils
// ========================================
export { groupSettingsByModule, moduleNames } from './utils';
