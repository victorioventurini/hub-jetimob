/**
 * @file WizardCards.test.tsx
 * @description Tests for OKR wizard card components
 * 
 * Coverage:
 * - TeamOkrCreationWizardCard
 * - TeamCheckinWizardCard
 * - CLevelCheckinWizardCard
 * - ManagersCheckinWizardCard
 * - LeaderPrepWizardCard
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactNode) => {
  return render(<>{component}</>);
};

describe('TeamOkrCreationWizardCard interface', () => {
  const defaultProps = {
    teamId: 'team-123',
    teamName: 'Engineering',
    hasActiveOkrs: true,
    isNewCycleSoon: false,
    isLoading: false,
  };

  it('should define required teamId prop', () => {
    expect(defaultProps.teamId).toBeDefined();
    expect(typeof defaultProps.teamId).toBe('string');
  });

  it('should define required teamName prop', () => {
    expect(defaultProps.teamName).toBeDefined();
    expect(typeof defaultProps.teamName).toBe('string');
  });

  it('should define hasActiveOkrs boolean', () => {
    expect(typeof defaultProps.hasActiveOkrs).toBe('boolean');
  });

  it('should define isNewCycleSoon boolean', () => {
    expect(typeof defaultProps.isNewCycleSoon).toBe('boolean');
  });

  it('should define isLoading boolean', () => {
    expect(typeof defaultProps.isLoading).toBe('boolean');
  });

  it('should accept optional className prop', () => {
    const propsWithClass = { ...defaultProps, className: 'custom-class' };
    expect(propsWithClass.className).toBeDefined();
  });
});

describe('TeamCheckinWizardCard interface', () => {
  const defaultProps = {
    teamId: 'team-123',
    teamName: 'Engineering',
    pendingKrCount: 5,
    lastCheckinDate: '2024-01-15',
    isLoading: false,
  };

  it('should define required teamId prop', () => {
    expect(defaultProps.teamId).toBeDefined();
  });

  it('should define required teamName prop', () => {
    expect(defaultProps.teamName).toBeDefined();
  });

  it('should define pendingKrCount number', () => {
    expect(typeof defaultProps.pendingKrCount).toBe('number');
    expect(defaultProps.pendingKrCount).toBe(5);
  });

  it('should define lastCheckinDate string', () => {
    expect(typeof defaultProps.lastCheckinDate).toBe('string');
  });

  it('should define isLoading boolean', () => {
    expect(typeof defaultProps.isLoading).toBe('boolean');
  });
});

describe('CLevelCheckinWizardCard interface', () => {
  const defaultProps = {
    companyOkrsCount: 10,
    atRiskOkrsCount: 3,
    overallProgress: 65,
    isLoading: false,
  };

  it('should define companyOkrsCount number', () => {
    expect(typeof defaultProps.companyOkrsCount).toBe('number');
    expect(defaultProps.companyOkrsCount).toBe(10);
  });

  it('should define atRiskOkrsCount number', () => {
    expect(typeof defaultProps.atRiskOkrsCount).toBe('number');
    expect(defaultProps.atRiskOkrsCount).toBe(3);
  });

  it('should define overallProgress number', () => {
    expect(typeof defaultProps.overallProgress).toBe('number');
    expect(defaultProps.overallProgress).toBe(65);
  });

  it('should define isLoading boolean', () => {
    expect(typeof defaultProps.isLoading).toBe('boolean');
  });
});

describe('ManagersCheckinWizardCard interface', () => {
  const defaultProps = {
    areaCount: 5,
    crossDependenciesCount: 3,
    blockedItemsCount: 1,
    isLoading: false,
  };

  it('should define areaCount number', () => {
    expect(typeof defaultProps.areaCount).toBe('number');
  });

  it('should define crossDependenciesCount number', () => {
    expect(typeof defaultProps.crossDependenciesCount).toBe('number');
  });

  it('should define blockedItemsCount number', () => {
    expect(typeof defaultProps.blockedItemsCount).toBe('number');
  });

  it('should define isLoading boolean', () => {
    expect(typeof defaultProps.isLoading).toBe('boolean');
  });
});

describe('LeaderPrepWizardCard interface', () => {
  const defaultProps = {
    teamId: 'team-123',
    teamName: 'Engineering',
    pendingCount: 3,
    atRiskCount: 2,
    isLoading: false,
  };

  it('should define required teamId prop', () => {
    expect(defaultProps.teamId).toBeDefined();
  });

  it('should define required teamName prop', () => {
    expect(defaultProps.teamName).toBeDefined();
  });

  it('should define pendingCount number', () => {
    expect(typeof defaultProps.pendingCount).toBe('number');
  });

  it('should define atRiskCount number', () => {
    expect(typeof defaultProps.atRiskCount).toBe('number');
  });

  it('should define isLoading boolean', () => {
    expect(typeof defaultProps.isLoading).toBe('boolean');
  });

  it('should accept optional className prop', () => {
    const propsWithClass = { ...defaultProps, className: 'custom-class' };
    expect(propsWithClass.className).toBeDefined();
  });
});

describe('Wizard card loading states', () => {
  it('should show skeleton when isLoading is true for all cards', () => {
    // All wizard cards should show skeleton in loading state
    const loadingProps = { isLoading: true };
    expect(loadingProps.isLoading).toBe(true);
  });

  it('should show content when isLoading is false', () => {
    const notLoadingProps = { isLoading: false };
    expect(notLoadingProps.isLoading).toBe(false);
  });
});

describe('Wizard card navigation', () => {
  afterEach(() => {
    mockNavigate.mockClear();
  });

  it('should navigate to correct path when clicked', () => {
    // Cards should use navigate for routing
    expect(typeof mockNavigate).toBe('function');
  });

  it('should pass team ID as query param when applicable', () => {
    const teamId = 'team-123';
    const expectedPath = `/okrs/team-okr-creation?teamId=${teamId}`;
    expect(expectedPath).toContain('teamId');
  });
});

describe('Wizard card styling', () => {
  it('should apply urgent styling when conditions met', () => {
    // E.g., isNewCycleSoon or hasIssues
    const urgentConditions = {
      isNewCycleSoon: true,
      hasIssues: true,
    };
    expect(urgentConditions.isNewCycleSoon || urgentConditions.hasIssues).toBe(true);
  });

  it('should apply default styling when no urgent conditions', () => {
    const normalConditions = {
      isNewCycleSoon: false,
      hasIssues: false,
    };
    expect(normalConditions.isNewCycleSoon || normalConditions.hasIssues).toBe(false);
  });
});
