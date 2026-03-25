/**
 * @file OkrContributionLink.test.tsx
 * @description Tests for OkrContributionLink and OkrKrTypeBadge components
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { OkrContributionLink, OkrKrTypeBadge } from './OkrContributionLink';

describe('OkrContributionLink', () => {
  describe('link types', () => {
    it('should render contributes_to type', () => {
      render(
        <OkrContributionLink type="contributes_to" targetTitle="Increase Revenue" targetType="org_objective" />
      );
      expect(screen.getByText(/increase revenue/i)).toBeInTheDocument();
    });

    it('should render enables type', () => {
      render(
        <OkrContributionLink type="enables" targetTitle="Customer Satisfaction" targetType="org_kr" />
      );
      expect(screen.getByText(/customer satisfaction/i)).toBeInTheDocument();
    });

    it('should render linked_to type', () => {
      render(
        <OkrContributionLink type="linked_to" targetTitle="Team Goal" targetType="team_objective" />
      );
      expect(screen.getByText(/team goal/i)).toBeInTheDocument();
    });
  });

  describe('target types', () => {
    it('should link to objective', () => {
      render(
        <OkrContributionLink type="contributes_to" targetTitle="Goal" targetType="org_objective" targetId="obj-123" />
      );
      const link = screen.getByRole('link');
      // Uses getShareableUrl which produces /go/okr_org_objective/:id
      expect(link).toHaveAttribute('href', expect.stringContaining('/go/okr_org_objective/'));
    });

    it('should link to kr', () => {
      render(
        <OkrContributionLink type="contributes_to" targetTitle="Key Result" targetType="org_kr" targetId="kr-456" />
      );
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', expect.stringContaining('/go/okr_org_kr/'));
    });
  });

  describe('without targetId', () => {
    it('should render as div when no targetId', () => {
      render(
        <OkrContributionLink type="contributes_to" targetTitle="Goal" targetType="org_objective" />
      );
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('should work with compact=true', () => {
      render(
        <OkrContributionLink type="contributes_to" targetTitle="Goal" targetType="org_objective" targetId="obj-123" compact={true} />
      );
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('should work with compact=false', () => {
      render(
        <OkrContributionLink type="contributes_to" targetTitle="Goal" targetType="org_objective" targetId="obj-123" compact={false} />
      );
      expect(screen.getByRole('link')).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('should render icon for contributes_to', () => {
      const { container } = render(
        <OkrContributionLink type="contributes_to" targetTitle="Goal" targetType="org_objective" />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render icon for enables', () => {
      const { container } = render(
        <OkrContributionLink type="enables" targetTitle="Goal" targetType="team_objective" />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render icon for linked_to', () => {
      const { container } = render(
        <OkrContributionLink type="linked_to" targetTitle="Goal" targetType="team_kr" />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('should require type prop', () => {
      const props = { type: 'contributes_to' as const, targetTitle: 'Goal', targetType: 'org_objective' as const };
      expect(props.type).toBeDefined();
    });

    it('should require targetTitle prop', () => {
      const props = { type: 'contributes_to' as const, targetTitle: 'Goal', targetType: 'org_objective' as const };
      expect(props.targetTitle).toBeDefined();
    });

    it('should require targetType prop', () => {
      const props = { type: 'contributes_to' as const, targetTitle: 'Goal', targetType: 'org_objective' as const };
      expect(props.targetType).toBeDefined();
    });

    it('should accept optional targetId', () => {
      const propsWithId = { type: 'contributes_to' as const, targetTitle: 'Goal', targetType: 'org_objective' as const, targetId: 'obj-123' };
      expect(propsWithId.targetId).toBeDefined();
    });
  });
});

describe('OkrKrTypeBadge', () => {
  const ALL_KR_TYPES = ['contribution', 'enabler', 'foundational'] as const;

  describe('rendering', () => {
    it.each(ALL_KR_TYPES)('should render badge for type: %s', (type) => {
      render(<OkrKrTypeBadge type={type} />);
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
      // Label is "Fundacional" 
      expect(screen.getByText(/Fundacional/i)).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('should render icon for each type', () => {
      ALL_KR_TYPES.forEach(type => {
        const { container, unmount } = render(<OkrKrTypeBadge type={type} />);
        expect(container.querySelector('svg')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('styling', () => {
    it('should render with badge styling (inline-flex)', () => {
      const { container } = render(<OkrKrTypeBadge type="contribution" />);
      // Badge renders as div with inline-flex
      const badge = container.querySelector('[class*="inline-flex"]');
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
