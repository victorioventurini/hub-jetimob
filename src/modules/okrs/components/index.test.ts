/**
 * @file index.test.ts
 * @description Tests for OKR components barrel exports
 * 
 * Verifies all components are properly exported from the module
 */

import { describe, it, expect } from 'vitest';

describe('OKR Components exports', () => {
  describe('Core components', () => {
    it('should export OkrStatusBadge', async () => {
      const { OkrStatusBadge } = await import('./OkrStatusBadge');
      expect(OkrStatusBadge).toBeDefined();
    });

    it('should export OkrProgressBar', async () => {
      const { OkrProgressBar } = await import('./OkrProgressBar');
      expect(OkrProgressBar).toBeDefined();
    });

    it('should export OkrEmptyState', async () => {
      const { OkrEmptyState } = await import('./OkrEmptyState');
      expect(OkrEmptyState).toBeDefined();
    });

    it('should export KrProgressPreview', async () => {
      const { KrProgressPreview } = await import('./KrProgressPreview');
      expect(KrProgressPreview).toBeDefined();
    });

    it('should export KrUnitSelect', async () => {
      const { KrUnitSelect } = await import('./KrUnitSelect');
      expect(KrUnitSelect).toBeDefined();
    });
  });

  describe('UI components', () => {
    it('should export OkrScopeBadge', async () => {
      const { OkrScopeBadge } = await import('./ui/OkrScopeBadge');
      expect(OkrScopeBadge).toBeDefined();
    });

    it('should export OkrTeamHierarchy', async () => {
      const { OkrTeamHierarchy } = await import('./ui/OkrScopeBadge');
      expect(OkrTeamHierarchy).toBeDefined();
    });

    it('should export OkrOwnerInfo', async () => {
      const { OkrOwnerInfo } = await import('./ui/OkrOwnerInfo');
      expect(OkrOwnerInfo).toBeDefined();
    });

    it('should export OkrOwnersRow', async () => {
      const { OkrOwnersRow } = await import('./ui/OkrOwnerInfo');
      expect(OkrOwnersRow).toBeDefined();
    });

    it('should export OkrContributionLink', async () => {
      const { OkrContributionLink } = await import('./ui/OkrContributionLink');
      expect(OkrContributionLink).toBeDefined();
    });

    it('should export OkrKrTypeBadge', async () => {
      const { OkrKrTypeBadge } = await import('./ui/OkrContributionLink');
      expect(OkrKrTypeBadge).toBeDefined();
    });

    // NOTE: OkrBreadcrumb was removed in favor of PageHeader.breadcrumbs (canonical standard)
  });

  describe('Initiative components', () => {
    it('should export InitiativeStatusBadge', async () => {
      const { InitiativeStatusBadge } = await import('./initiatives/InitiativeStatusBadge');
      expect(InitiativeStatusBadge).toBeDefined();
    });

    it('should export InitiativeCulturalMessage', async () => {
      const { InitiativeCulturalMessage } = await import('./initiatives/InitiativeCulturalMessage');
      expect(InitiativeCulturalMessage).toBeDefined();
    });

    it('should export InitiativeNameFeedback', async () => {
      const { InitiativeNameFeedback } = await import('./initiatives/InitiativeNameFeedback');
      expect(InitiativeNameFeedback).toBeDefined();
    });
  });

  describe('Filter components', () => {
    it('should export OrgViewFilters', async () => {
      const { OrgViewFilters } = await import('./org-view/OrgViewFilters');
      expect(OrgViewFilters).toBeDefined();
    });

    it('should export TeamContributionFilters', async () => {
      const { TeamContributionFilters } = await import('./team-contribution/TeamContributionFilters');
      expect(TeamContributionFilters).toBeDefined();
    });

    it('should export CycleCheckinsFilters', async () => {
      const { CycleCheckinsFilters } = await import('./cycle-checkins/CycleCheckinsFilters');
      expect(CycleCheckinsFilters).toBeDefined();
    });
  });

  describe('Dashboard components', () => {
    it('should export StatusDistributionBar', async () => {
      const { StatusDistributionBar } = await import('./dashboard/StatusDistributionBar');
      expect(StatusDistributionBar).toBeDefined();
    });
  });

  describe('Analysis components', () => {
    it('should export AnalysisScoreCard', async () => {
      const { AnalysisScoreCard } = await import('./analysis/AnalysisScoreCard');
      expect(AnalysisScoreCard).toBeDefined();
    });
  });

  describe('Quality components', () => {
    it('should export QualityMetricsGrid', async () => {
      const { QualityMetricsGrid } = await import('./quality/QualityMetricsGrid');
      expect(QualityMetricsGrid).toBeDefined();
    });
  });
});

describe('Component naming conventions', () => {
  it('should follow Okr prefix for OKR-specific components', () => {
    const okrComponents = [
      'OkrStatusBadge',
      'OkrProgressBar',
      'OkrEmptyState',
      'OkrScopeBadge',
      'OkrOwnerInfo',
      'OkrContributionLink',
      // OkrBreadcrumb removed - now using PageHeader.breadcrumbs
    ];
    
    okrComponents.forEach(name => {
      expect(name.startsWith('Okr')).toBe(true);
    });
  });

  it('should follow Kr prefix for Key Result components', () => {
    const krComponents = ['KrProgressPreview', 'KrUnitSelect'];
    
    krComponents.forEach(name => {
      expect(name.startsWith('Kr')).toBe(true);
    });
  });

  it('should follow Initiative prefix for initiative components', () => {
    const initiativeComponents = [
      'InitiativeStatusBadge',
      'InitiativeCulturalMessage',
      'InitiativeNameFeedback',
    ];
    
    initiativeComponents.forEach(name => {
      expect(name.startsWith('Initiative')).toBe(true);
    });
  });
});
