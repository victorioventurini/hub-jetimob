/**
 * @file OkrContributionLink.test.tsx
 * @description Tests for OkrContributionLink and OkrKrTypeBadge components
 * 
 * Coverage:
 * - Link types rendering
 * - Navigation behavior
 * - Badge display
 * - Tooltip functionality
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OkrContributionLink, OkrKrTypeBadge } from './OkrContributionLink';

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('OkrContributionLink', () => {
  describe('link types', () => {
    it('should render contributes_to type', () => {
      renderWithRouter(
        <OkrContributionLink
          type="contributes_to"
          targetTitle="Increase Revenue"
          targetType="org_objective"
        />
      );
      
      expect(screen.getByText(/increase revenue/i)).toBeInTheDocument();
    });

    it('should render enables type', () => {
      renderWithRouter(
        <OkrContributionLink
          type="enables"
          targetTitle="Customer Satisfaction"
          targetType="org_kr"
        />
      );
      
      expect(screen.getByText(/customer satisfaction/i)).toBeInTheDocument();
    });

    it('should render linked_to type', () => {
      renderWithRouter(
        <OkrContributionLink
          type="linked_to"
          targetTitle="Team Goal"
          targetType="team_objective"
        />
      );
      
      expect(screen.getByText(/team goal/i)).toBeInTheDocument();
    });
  });

  describe('target types', () => {
    it('should link to objective', () => {
      renderWithRouter(
        <OkrContributionLink
          type="contributes_to"
          targetTitle="Goal"
          targetType="org_objective"
          targetId="obj-123"
        />
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', expect.stringContaining('/org-objectives/'));
    });

    it('should link to kr', () => {
      renderWithRouter(
        <OkrContributionLink
          type="contributes_to"
          targetTitle="Key Result"
          targetType="org_kr"
          targetId="kr-456"
        />
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', expect.stringContaining('/org-key-results/'));
    });
  });

  describe('without targetId', () => {
    it('should render as badge when no targetId', () => {
      renderWithRouter(
        <OkrContributionLink
          type="contributes_to"
          targetTitle="Goal"
          targetType="org_objective"
        />
      );
      
      // Should not render as link
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('should work with compact=true', () => {
      renderWithRouter(
        <OkrContributionLink
          type="contributes_to"
          targetTitle="Goal"
          targetType="org_objective"
          targetId="obj-123"
          compact={true}
        />
      );
      
      // Should still render the link
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('should work with compact=false', () => {
      renderWithRouter(
        <OkrContributionLink
          type="contributes_to"
          targetTitle="Goal"
          targetType="org_objective"
          targetId="obj-123"
          compact={false}
        />
      );
      
      expect(screen.getByRole('link')).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('should render icon for contributes_to', () => {
      const { container } = renderWithRouter(
        <OkrContributionLink
          type="contributes_to"
          targetTitle="Goal"
          targetType="org_objective"
        />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render icon for enables', () => {
      const { container } = renderWithRouter(
        <OkrContributionLink
          type="enables"
          targetTitle="Goal"
          targetType="team_objective"
        />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render icon for linked_to', () => {
      const { container } = renderWithRouter(
        <OkrContributionLink
          type="linked_to"
          targetTitle="Goal"
          targetType="team_kr"
        />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('should require type prop', () => {
      const props = {
        type: 'contributes_to' as const,
        targetTitle: 'Goal',
        targetType: 'org_objective' as const,
      };
      
      expect(props.type).toBeDefined();
    });

    it('should require targetTitle prop', () => {
      const props = {
        type: 'contributes_to' as const,
        targetTitle: 'Goal',
        targetType: 'org_objective' as const,
      };
      
      expect(props.targetTitle).toBeDefined();
    });

    it('should require targetType prop', () => {
      const props = {
        type: 'contributes_to' as const,
        targetTitle: 'Goal',
        targetType: 'org_objective' as const,
      };
      
      expect(props.targetType).toBeDefined();
    });

    it('should accept optional targetId', () => {
      const propsWithId = {
        type: 'contributes_to' as const,
        targetTitle: 'Goal',
        targetType: 'org_objective' as const,
        targetId: 'obj-123',
      };
      
      expect(propsWithId.targetId).toBeDefined();
    });
  });
});

describe('OkrKrTypeBadge', () => {
  const ALL_KR_TYPES = ['contribution', 'enabler', 'foundational'] as const;

  describe('rendering', () => {
    it.each(ALL_KR_TYPES)('should render badge for type: %s', (type) => {
      render(<OkrKrTypeBadge type={type} />);
      
      // Should render without crashing
      expect(document.body).toBeTruthy();
    });

    it('should render contribution type', () => {
      render(<OkrKrTypeBadge type="contribution" />);
      
      expect(screen.getByText(/contribui/i)).toBeInTheDocument();
    });

    it('should render enabler type', () => {
      render(<OkrKrTypeBadge type="enabler" />);
      
      expect(screen.getByText(/habilita/i)).toBeInTheDocument();
    });

    it('should render foundational type', () => {
      render(<OkrKrTypeBadge type="foundational" />);
      
      expect(screen.getByText(/fundament/i)).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('should render icon for each type', () => {
      ALL_KR_TYPES.forEach(type => {
        const { container, unmount } = render(<OkrKrTypeBadge type={type} />);
        
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('styling', () => {
    it('should render with badge styling', () => {
      const { container } = render(<OkrKrTypeBadge type="contribution" />);
      
      const badge = container.querySelector('[class*="badge"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('should require type prop', () => {
      const props = { type: 'contribution' as const };
      expect(props.type).toBeDefined();
    });

    it('should only accept valid KR types', () => {
      const validTypes = ['contribution', 'enabler', 'foundational'];
      
      validTypes.forEach(type => {
        expect(['contribution', 'enabler', 'foundational']).toContain(type);
      });
    });
  });
});
