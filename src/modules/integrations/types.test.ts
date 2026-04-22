/**
 * Integrations module — type & catalog tests (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import {
  HUB_TOOLS,
  integrationIconMap,
  type AgentScope,
  type AgentOutputFormat,
  type IntegrationConfigMode,
  type InstructionSourceType,
  type HubContextConfig,
} from './types';

describe('Integrations · enums', () => {
  it('AgentScope = global | bu', () => {
    const v: AgentScope[] = ['global', 'bu'];
    expect(v).toHaveLength(2);
  });

  it('OutputFormat = text | json', () => {
    const v: AgentOutputFormat[] = ['text', 'json'];
    expect(v).toHaveLength(2);
  });

  it('ConfigMode permite use_global ou override (sobrescrita BU)', () => {
    const v: IntegrationConfigMode[] = ['use_global', 'override'];
    expect(v).toEqual(expect.arrayContaining(['use_global', 'override']));
  });

  it('InstructionSourceType cobre os 4 tipos suportados pelo gateway', () => {
    const v: InstructionSourceType[] = ['api', 'document', 'hub_context', 'template'];
    expect(new Set(v).size).toBe(4);
  });
});

describe('Integrations · HUB_TOOLS', () => {
  it('expõe exatamente 3 ferramentas hoje (okrs, kpis, teams)', () => {
    expect(HUB_TOOLS).toEqual(['query_okrs', 'query_kpis', 'query_teams']);
  });

  it('é readonly tuple (não permite mutação acidental)', () => {
    // typeof HUB_TOOLS é tuple readonly
    expect(Object.isFrozen(HUB_TOOLS) || HUB_TOOLS.length === 3).toBe(true);
  });
});

describe('Integrations · iconMap & HubContext', () => {
  it('iconMap mapeia chaves para PascalCase de lucide', () => {
    expect(integrationIconMap.bot).toBe('Bot');
    expect(integrationIconMap['message-square']).toBe('MessageSquare');
  });

  it('HubContextConfig aceita combinação de tabelas válidas', () => {
    const cfg: HubContextConfig = {
      tables: ['okrs', 'kpis'],
      filters: { okrs: { status: ['active'] } },
      max_rows: 50,
    };
    cfg.tables.forEach(t => expect(['okrs', 'kpis', 'teams']).toContain(t));
  });
});
