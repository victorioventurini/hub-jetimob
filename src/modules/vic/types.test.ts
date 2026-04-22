/**
 * Vic AI module — agent slug & action context tests (W5 mínimo)
 */
import { describe, it, expect } from 'vitest';
import { VIC_AGENTS, type VicAgentSlug, type VicActionContext } from './types';

describe('Vic · agent registry', () => {
  it('VIC_AGENTS expõe metadados de todos os agentes declarados', () => {
    const slugs = Object.keys(VIC_AGENTS) as VicAgentSlug[];
    expect(slugs.length).toBeGreaterThanOrEqual(9);
    slugs.forEach(s => {
      expect(VIC_AGENTS[s].name).toBeTruthy();
      expect(VIC_AGENTS[s].description).toBeTruthy();
      expect(VIC_AGENTS[s].icon).toBeTruthy();
    });
  });

  it('cada agente tem name e description não vazios (UX requirement)', () => {
    Object.entries(VIC_AGENTS).forEach(([slug, meta]) => {
      expect(meta.name.trim()).not.toBe('');
      expect(meta.description.trim()).not.toBe('');
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    });
  });
});

describe('Vic · ActionContext', () => {
  it('contextos OKR são prefixados (okr-*)', () => {
    const okrContexts: VicActionContext[] = [
      'okr-create-objective', 'okr-edit-objective', 'okr-create-kr', 'okr-edit-kr',
    ];
    okrContexts.forEach(c => expect(c.startsWith('okr-')).toBe(true));
  });

  it('contextos de dashboard são prefixados (dashboard-*)', () => {
    const dashContexts: VicActionContext[] = [
      'dashboard-culture', 'dashboard-okrs', 'dashboard-kpis',
    ];
    dashContexts.forEach(c => expect(c.startsWith('dashboard-')).toBe(true));
  });

  it('vic-test-page existe como contexto sandbox', () => {
    const sandbox: VicActionContext = 'vic-test-page';
    expect(sandbox).toBe('vic-test-page');
  });
});
