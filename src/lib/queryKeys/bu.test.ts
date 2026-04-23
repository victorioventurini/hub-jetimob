/**
 * Wave 2 — Tests for BU/settings/modules query keys.
 */
import { describe, it, expect } from 'vitest';
import { buKeys, settingsKeys, modulesPageKeys } from './bu';

describe('buKeys', () => {
  it('helpers básicos', () => {
    expect(buKeys.all()).toEqual(['bu']);
    expect(buKeys.allBus()).toEqual(['all-bus']);
    expect(buKeys.userBus('u1')).toEqual(['user-bus', 'u1']);
    expect(buKeys.userBus(null)).toEqual(['user-bus', null]);
    expect(buKeys.unit('bu1')).toEqual(['bu-unit', 'bu1']);
    expect(buKeys.detail('bu1')).toEqual(['bu', 'detail', 'bu1']);
    expect(buKeys.locations('bu1')).toEqual(['bu', 'locations', 'bu1']);
    expect(buKeys.location('l1')).toEqual(['bu', 'location', 'l1']);
    expect(buKeys.memberships('u1')).toEqual(['bu', 'memberships', 'u1']);
    expect(buKeys.modules('bu1')).toEqual(['bu', 'modules', 'bu1']);
    expect(buKeys.allModules('bu1')).toEqual(['bu', 'all-modules', 'bu1']);
    expect(buKeys.allList()).toEqual(['bu', 'all-list']);
  });
});

describe('settingsKeys', () => {
  it('listas e contagens', () => {
    expect(settingsKeys.modulesList()).toEqual(['settings-modules-list']);
    expect(settingsKeys.busList()).toEqual(['settings-bus-list']);
    expect(settingsKeys.moduleConfigs()).toEqual(['settings-module-configs']);
    expect(settingsKeys.profilesCount('bu1')).toEqual(['settings', 'profiles-count', 'bu1']);
    expect(settingsKeys.teamsCount('bu1')).toEqual(['settings-teams-count', 'bu1']);
    expect(settingsKeys.busCount()).toEqual(['settings-bus-count']);
    expect(settingsKeys.modulesCount()).toEqual(['settings-modules-count']);
    expect(settingsKeys.integrationsCount()).toEqual(['settings-integrations-count']);
    expect(settingsKeys.integrationsCatalog()).toEqual(['settings', 'integrations-catalog']);
  });

  it('jobTitles e variantes', () => {
    expect(settingsKeys.jobTitles('bu1')).toEqual(['job-titles', 'bu1']);
    expect(settingsKeys.jobTitlesActive('bu1')).toEqual(['job-titles', 'bu1', 'active']);
    expect(settingsKeys.jobTitlesPrefix()).toEqual(['job-titles']);
  });

  it('teams/profiles list e batch de KPI', () => {
    expect(settingsKeys.teamsList('bu1')).toEqual(['teams-list', 'bu1']);
    expect(settingsKeys.profilesList('bu1')).toEqual(['profiles-list', 'bu1']);
    expect(settingsKeys.kpiValuesBatch(['k1', 'k2'])).toEqual(['kpi-values-batch', ['k1', 'k2']]);
    expect(settingsKeys.kpiValuesBatchPrefix()).toEqual(['kpi-values-batch']);
  });
});

describe('modulesPageKeys', () => {
  it('all + prefixos', () => {
    expect(modulesPageKeys.all('bu1')).toEqual(['all-modules', 'bu1']);
    expect(modulesPageKeys.allPrefix()).toEqual(['all-modules']);
    expect(modulesPageKeys.buModulesPrefix()).toEqual(['bu-modules']);
  });
});
