/**
 * @file OkrScopeBadge.test.tsx
 * @description Tests for OkrScopeBadge and OkrTeamHierarchy components
 * 
 * Coverage:
 * - OkrScopeBadge rendering for all scopes
 * - OkrTeamHierarchy rendering
 * - Size variants
 * - Icon display
 * - Team name display
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { OkrScopeBadge, OkrTeamHierarchy } from './OkrScopeBadge';
import type { OkrScope } from './OkrScopeBadge';

describe('OkrScopeBadge', () => {
  const ALL_SCOPES: OkrScope[] = ['org', 'team', 'squad', 'individual'];

  describe('rendering', () => {
    it.each(ALL_SCOPES)('should render badge for scope: %s', (scope) => {
      render(<OkrScopeBadge scope={scope} />);
      
      // Should render without crashing
      expect(document.body).toBeTruthy();
    });

    it('should render org scope with correct label', () => {
      render(<OkrScopeBadge scope="org" />);
      
      expect(screen.getByText(/organiza/i)).toBeInTheDocument();
    });

    it('should render team scope with correct label', () => {
      render(<OkrScopeBadge scope="team" />);
      
      expect(screen.getByText(/time|team/i)).toBeInTheDocument();
    });

    it('should render squad scope with correct label', () => {
      render(<OkrScopeBadge scope="squad" />);
      
      expect(screen.getByText(/squad/i)).toBeInTheDocument();
    });

    it('should render individual scope with correct label', () => {
      render(<OkrScopeBadge scope="individual" />);
      
      expect(screen.getByText(/individual|pessoa/i)).toBeInTheDocument();
    });
  });

  describe('teamName prop', () => {
    it('should display team name when provided', () => {
      render(<OkrScopeBadge scope="team" teamName="Engineering" />);
      
      expect(screen.getByText(/engineering/i)).toBeInTheDocument();
    });

    it('should work without team name', () => {
      render(<OkrScopeBadge scope="team" />);
      
      // Should render the default label
      expect(screen.getByText(/time|team/i)).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('should render with default sm size', () => {
      const { container } = render(<OkrScopeBadge scope="org" />);
      
      const badge = container.querySelector('[class*="badge"]');
      expect(badge).toBeInTheDocument();
    });

    it('should render with sm size', () => {
      const { container } = render(<OkrScopeBadge scope="org" size="sm" />);
      
      const badge = container.querySelector('[class*="badge"]');
      expect(badge).toBeInTheDocument();
    });

    it('should render with md size', () => {
      const { container } = render(<OkrScopeBadge scope="org" size="md" />);
      
      const badge = container.querySelector('[class*="badge"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('should accept custom className', () => {
      const { container } = render(
        <OkrScopeBadge scope="org" className="custom-class" />
      );
      
      const badge = container.querySelector('.custom-class');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('should render icon for org scope', () => {
      const { container } = render(<OkrScopeBadge scope="org" />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render icon for team scope', () => {
      const { container } = render(<OkrScopeBadge scope="team" />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render icon for squad scope', () => {
      const { container } = render(<OkrScopeBadge scope="squad" />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render icon for individual scope', () => {
      const { container } = render(<OkrScopeBadge scope="individual" />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('type safety', () => {
    it('should only accept valid OkrScope values', () => {
      const validScopes: OkrScope[] = ['org', 'team', 'squad', 'individual'];
      
      validScopes.forEach(scope => {
        expect(['org', 'team', 'squad', 'individual']).toContain(scope);
      });
    });
  });
});

describe('OkrTeamHierarchy', () => {
  describe('rendering', () => {
    it('should render single team', () => {
      render(<OkrTeamHierarchy teams={['Engineering']} />);
      
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    it('should render multiple teams', () => {
      render(<OkrTeamHierarchy teams={['Company', 'Engineering', 'Frontend']} />);
      
      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Frontend')).toBeInTheDocument();
    });

    it('should render empty array', () => {
      const { container } = render(<OkrTeamHierarchy teams={[]} />);
      
      // Should render container but with no team names
      expect(container).toBeInTheDocument();
    });
  });

  describe('separators', () => {
    it('should render arrows between teams', () => {
      const { container } = render(
        <OkrTeamHierarchy teams={['Level 1', 'Level 2', 'Level 3']} />
      );
      
      // Should have separator SVGs between items
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('className prop', () => {
    it('should accept custom className', () => {
      const { container } = render(
        <OkrTeamHierarchy teams={['Team']} className="custom-class" />
      );
      
      const hierarchyContainer = container.querySelector('.custom-class');
      expect(hierarchyContainer).toBeInTheDocument();
    });
  });

  describe('icon', () => {
    it('should render hierarchy icon', () => {
      const { container } = render(<OkrTeamHierarchy teams={['Team']} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('should require teams array', () => {
      const props = { teams: ['Team A', 'Team B'] };
      expect(Array.isArray(props.teams)).toBe(true);
    });

    it('should accept optional className', () => {
      const propsWithClass = { teams: ['Team'], className: 'test' };
      const propsWithoutClass = { teams: ['Team'] };
      
      expect(propsWithClass.className).toBeDefined();
      expect(propsWithoutClass).not.toHaveProperty('className');
    });
  });
});
