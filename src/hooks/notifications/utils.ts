import type { UserNotificationSetting } from './types';

/**
 * Groups notification settings by module for display in UI
 */
export function groupSettingsByModule(settings: UserNotificationSetting[]) {
  const grouped: Record<string, {
    events: Record<string, {
      name: string;
      description: string | null;
      severity: string;
      is_mandatory: boolean;
      channels: Record<string, boolean>;
    }>;
  }> = {};
  
  for (const setting of settings) {
    if (!grouped[setting.event_module]) {
      grouped[setting.event_module] = { events: {} };
    }
    
    if (!grouped[setting.event_module].events[setting.event_slug]) {
      grouped[setting.event_module].events[setting.event_slug] = {
        name: setting.event_name,
        description: setting.event_description,
        severity: setting.event_severity as string,
        is_mandatory: setting.is_mandatory,
        channels: {},
      };
    }
    
    grouped[setting.event_module].events[setting.event_slug].channels[setting.channel_slug] = setting.enabled;
  }
  
  return grouped;
}

/**
 * Module name mapping for display
 */
export const moduleNames: Record<string, string> = {
  core: 'Geral',
  okrs: 'OKRs',
  tickets: 'Tickets',
  assets: 'Ativos',
  teams: 'Times',
  kpis: 'KPIs',
};
