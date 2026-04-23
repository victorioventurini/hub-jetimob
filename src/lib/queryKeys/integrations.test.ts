/**
 * Wave 2 — Tests for integrations/automations/cron/perfMetrics/vic query keys.
 */
import { describe, it, expect } from 'vitest';
import {
  integrationsKeys,
  automationsKeys,
  cronJobKeys,
  perfMetricsKeys,
  vicKeys,
} from './integrations';

describe('integrationsKeys', () => {
  it('catalog/global/bu', () => {
    expect(integrationsKeys.all()).toEqual(['integrations']);
    expect(integrationsKeys.catalog()).toEqual(['integrations', 'catalog']);
    expect(integrationsKeys.catalogByKey('slack')).toEqual(['integrations', 'catalog', 'slack']);
    expect(integrationsKeys.global()).toEqual(['integrations', 'global']);
    expect(integrationsKeys.globalByKey('slack')).toEqual(['integrations', 'global', 'slack']);
    expect(integrationsKeys.bu('bu1')).toEqual(['integrations', 'bu', 'bu1']);
    expect(integrationsKeys.buByKey('bu1', 'slack')).toEqual([
      'integrations', 'bu', 'bu1', 'slack',
    ]);
  });

  it('agents', () => {
    expect(integrationsKeys.agents('bu1')).toEqual(['integrations', 'agents', 'bu1']);
    expect(integrationsKeys.globalAgents('vic')).toEqual([
      'integrations', 'global-agents', 'vic',
    ]);
    expect(integrationsKeys.buAgents('bu1')).toEqual([
      'integrations', 'bu-agents', 'bu1', undefined,
    ]);
    expect(integrationsKeys.agentDetail('a1')).toEqual(['integrations', 'agent', 'a1']);
    expect(integrationsKeys.agentLogs('a1')).toEqual(['integrations', 'agent-logs', 'a1']);
    expect(integrationsKeys.agentLogsFiltered({ bu_id: 'bu1', limit: 10 })).toEqual([
      'integrations', 'agent-logs', { bu_id: 'bu1', limit: 10 },
    ]);
  });

  it('documents e instruction sources', () => {
    expect(integrationsKeys.agentDocuments('a1')).toEqual([
      'integrations', 'agent-documents', 'a1',
    ]);
    expect(integrationsKeys.instructionSources('a1')).toEqual([
      'integrations', 'instruction-sources', 'a1',
    ]);
    expect(integrationsKeys.instructionSourceDetail('s1')).toEqual([
      'integrations', 'instruction-sources', 'detail', 's1',
    ]);
  });
});

describe('automationsKeys', () => {
  it('todos', () => {
    expect(automationsKeys.connections('bu1')).toEqual(['automations', 'connections', 'bu1']);
    expect(automationsKeys.logs('bu1')).toEqual(['automations', 'logs', 'bu1']);
    expect(automationsKeys.tokens('bu1')).toEqual(['automation-tokens', 'bu1']);
    expect(automationsKeys.events()).toEqual(['automations', 'events']);
    expect(automationsKeys.actions()).toEqual(['automations', 'actions']);
  });
});

describe('cronJobKeys', () => {
  it('config e logs', () => {
    expect(cronJobKeys.globalConfig()).toEqual([
      'integrations', 'global-config', 'cron-job',
    ]);
    expect(cronJobKeys.executionLogs()).toEqual(['cron-execution-logs']);
  });
});

describe('perfMetricsKeys', () => {
  it('latest/history/snapshots', () => {
    expect(perfMetricsKeys.latest()).toEqual(['perf-metrics', 'latest']);
    expect(perfMetricsKeys.history(7)).toEqual(['perf-metrics', 'history', 7]);
    expect(perfMetricsKeys.snapshots(50)).toEqual(['perf-metrics', 'snapshots', 50]);
  });
});

describe('vicKeys', () => {
  it('configs e logs', () => {
    expect(vicKeys.buConfig('bu1')).toEqual(['vic', 'bu-config', 'bu1']);
    expect(vicKeys.agentActivations('bu1')).toEqual(['vic', 'agent-activations', 'bu1']);
    expect(vicKeys.globalAgents()).toEqual(['vic', 'global-agents']);
    expect(vicKeys.buUnitsForAudit()).toEqual(['vic', 'bu-units-audit']);
    expect(vicKeys.logs('7d', 'bu1')).toEqual(['vic', 'logs', '7d', 'bu1']);
    expect(vicKeys.responseHistory('ctx-1')).toEqual([
      'vic', 'response-history', 'ctx-1',
    ]);
  });
});
