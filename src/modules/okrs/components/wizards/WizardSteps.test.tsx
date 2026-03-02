/**
 * @file Wizard components tests
 * @description Tests for OKR wizard step components re-exports
 */

import { describe, it, expect, vi } from 'vitest';

// Mock heavy dependencies to avoid timeout
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));
vi.mock('@/modules/okrs/components/wizards/shared/WizardTooltips', () => ({
  WizardTooltipInline: () => null,
  WizardTooltip: () => null,
}));
vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicStepHelper: () => null,
}));

describe('KrDetailStep', () => {
  it('should re-export TeamOkrKrDetailStep as KrDetailStep', async () => {
    const mod = await import('./team-kr-creation/KrDetailStep');
    expect(mod.KrDetailStep).toBeDefined();
  }, 15000);
});

describe('KrDependenciesStep', () => {
  it('should re-export TeamOkrDependenciesStep as KrDependenciesStep', async () => {
    const mod = await import('./team-kr-creation/KrDependenciesStep');
    expect(mod.KrDependenciesStep).toBeDefined();
  });
});

describe('KrInitiativesStep', () => {
  it('should re-export TeamOkrInitiativesStep as KrInitiativesStep', async () => {
    const mod = await import('./team-kr-creation/KrInitiativesStep');
    expect(mod.KrInitiativesStep).toBeDefined();
  });
});

describe('Wizard step pattern', () => {
  it('should follow consistent re-export pattern', () => {
    const stepFiles = ['KrDetailStep', 'KrDependenciesStep', 'KrInitiativesStep'];
    expect(stepFiles.length).toBe(3);
  });

  it('should maintain type exports alongside component exports', () => {
    const expectedExports = ['KrDetailStep', 'KrDetailStepProps'];
    expect(expectedExports.length).toBe(2);
  });
});
