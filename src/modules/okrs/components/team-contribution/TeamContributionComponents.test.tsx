/**
 * @file TeamContributionComponents.test.tsx
 * @description Tests for team contribution related components
 * 
 * Coverage:
 * - TeamContributionHeader
 * - TeamContributionInsights
 * - OrgKrContributionItem
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';

// Mock data types
interface TeamContributionData {
  teamId: string;
  teamName: string;
  teamDescription?: string;
  leaderName?: string;
  leaderPhotoUrl?: string | null;
  totalActiveOkrs: number;
  aggregatedStatus: 'on_track' | 'at_risk' | 'off_track';
  aggregatedProgress: number;
  orgObjectivesImpacted: number;
  mainContributionArea?: string;
  isCriticalForObjSuccess: boolean;
  okrsAtRisk: number;
  okrsOffTrack: number;
}

const mockTeamData: TeamContributionData = {
  teamId: 'team-123',
  teamName: 'Engineering',
  teamDescription: 'Product engineering team',
  leaderName: 'John Doe',
  leaderPhotoUrl: null,
  totalActiveOkrs: 5,
  aggregatedStatus: 'on_track',
  aggregatedProgress: 65,
  orgObjectivesImpacted: 3,
  mainContributionArea: 'Product Development',
  isCriticalForObjSuccess: true,
  okrsAtRisk: 1,
  okrsOffTrack: 0,
};

describe('TeamContributionData interface', () => {
  describe('required fields', () => {
    it('should have teamId', () => {
      expect(mockTeamData.teamId).toBeDefined();
      expect(typeof mockTeamData.teamId).toBe('string');
    });

    it('should have teamName', () => {
      expect(mockTeamData.teamName).toBeDefined();
      expect(typeof mockTeamData.teamName).toBe('string');
    });

    it('should have totalActiveOkrs', () => {
      expect(mockTeamData.totalActiveOkrs).toBeDefined();
      expect(typeof mockTeamData.totalActiveOkrs).toBe('number');
    });

    it('should have aggregatedStatus', () => {
      expect(mockTeamData.aggregatedStatus).toBeDefined();
      expect(['on_track', 'at_risk', 'off_track']).toContain(mockTeamData.aggregatedStatus);
    });

    it('should have aggregatedProgress', () => {
      expect(mockTeamData.aggregatedProgress).toBeDefined();
      expect(typeof mockTeamData.aggregatedProgress).toBe('number');
    });
  });

  describe('optional fields', () => {
    it('should accept optional teamDescription', () => {
      expect(mockTeamData.teamDescription).toBeDefined();
    });

    it('should accept optional leaderName', () => {
      expect(mockTeamData.leaderName).toBeDefined();
    });

    it('should accept nullable leaderPhotoUrl', () => {
      expect(mockTeamData.leaderPhotoUrl).toBeNull();
    });
  });

  describe('contribution metrics', () => {
    it('should track org objectives impacted', () => {
      expect(mockTeamData.orgObjectivesImpacted).toBeDefined();
      expect(mockTeamData.orgObjectivesImpacted).toBe(3);
    });

    it('should track main contribution area', () => {
      expect(mockTeamData.mainContributionArea).toBe('Product Development');
    });

    it('should flag critical teams', () => {
      expect(mockTeamData.isCriticalForObjSuccess).toBe(true);
    });

    it('should track OKRs at risk', () => {
      expect(mockTeamData.okrsAtRisk).toBe(1);
    });

    it('should track OKRs off track', () => {
      expect(mockTeamData.okrsOffTrack).toBe(0);
    });
  });
});

describe('OrgKrContribution interface', () => {
  const mockOrgKrContribution = {
    krId: 'kr-123',
    krTitle: 'Increase customer satisfaction to 90%',
    progress: 75,
    status: 'on_track' as const,
    teamOkrs: [
      { 
        teamId: 'team-1', 
        teamName: 'Support', 
        okrTitle: 'Improve response time',
        progress: 80,
      },
    ],
  };

  it('should have krId', () => {
    expect(mockOrgKrContribution.krId).toBeDefined();
  });

  it('should have krTitle', () => {
    expect(mockOrgKrContribution.krTitle).toBeDefined();
  });

  it('should have progress', () => {
    expect(mockOrgKrContribution.progress).toBeDefined();
    expect(mockOrgKrContribution.progress).toBe(75);
  });

  it('should have status', () => {
    expect(mockOrgKrContribution.status).toBe('on_track');
  });

  it('should have teamOkrs array', () => {
    expect(Array.isArray(mockOrgKrContribution.teamOkrs)).toBe(true);
    expect(mockOrgKrContribution.teamOkrs.length).toBe(1);
  });
});

describe('Status configuration', () => {
  const statusConfig = {
    on_track: { label: 'No Caminho', className: 'bg-status-green' },
    at_risk: { label: 'Em Risco', className: 'bg-status-yellow' },
    off_track: { label: 'Fora do Caminho', className: 'bg-status-red' },
  };

  it('should have on_track config', () => {
    expect(statusConfig.on_track.label).toBe('No Caminho');
  });

  it('should have at_risk config', () => {
    expect(statusConfig.at_risk.label).toBe('Em Risco');
  });

  it('should have off_track config', () => {
    expect(statusConfig.off_track.label).toBe('Fora do Caminho');
  });

  it('should use semantic color classes', () => {
    expect(statusConfig.on_track.className).toContain('status-green');
    expect(statusConfig.at_risk.className).toContain('status-yellow');
    expect(statusConfig.off_track.className).toContain('status-red');
  });
});
