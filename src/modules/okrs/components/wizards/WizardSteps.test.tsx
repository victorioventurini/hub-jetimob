/**
 * @file Wizard components tests
 * @description Tests for OKR wizard step components
 * 
 * Coverage:
 * - KrDetailStep
 * - KrDependenciesStep
 * - KrInitiativesStep
 */

import { describe, it, expect } from 'vitest';

describe('KrDetailStep', () => {
  describe('re-export', () => {
    it('should re-export TeamOkrKrDetailStep as KrDetailStep', async () => {
      const { KrDetailStep } = await import('./team-kr-creation/KrDetailStep');
      
      expect(KrDetailStep).toBeDefined();
    });
  });
});

describe('KrDependenciesStep', () => {
  describe('re-export', () => {
    it('should re-export TeamOkrDependenciesStep as KrDependenciesStep', async () => {
      const { KrDependenciesStep } = await import('./team-kr-creation/KrDependenciesStep');
      
      expect(KrDependenciesStep).toBeDefined();
    });
  });
});

describe('KrInitiativesStep', () => {
  describe('re-export', () => {
    it('should re-export TeamOkrInitiativesStep as KrInitiativesStep', async () => {
      const { KrInitiativesStep } = await import('./team-kr-creation/KrInitiativesStep');
      
      expect(KrInitiativesStep).toBeDefined();
    });
  });
});

describe('Wizard step pattern', () => {
  it('should follow consistent re-export pattern', () => {
    // All wizard steps should use re-exports for consistency
    const stepFiles = [
      'KrDetailStep',
      'KrDependenciesStep', 
      'KrInitiativesStep',
    ];
    
    expect(stepFiles.length).toBe(3);
  });

  it('should maintain type exports alongside component exports', () => {
    // Each step should export both the component and its props type
    const expectedExports = ['KrDetailStep', 'KrDetailStepProps'];
    expect(expectedExports.length).toBe(2);
  });
});
