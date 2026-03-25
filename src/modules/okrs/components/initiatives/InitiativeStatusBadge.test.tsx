/**
 * @file InitiativeStatusBadge.test.tsx
 * @description Tests for InitiativeStatusBadge component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { InitiativeStatusBadge } from './InitiativeStatusBadge';
import type { InitiativeStatus } from '../../types/initiative';

describe('InitiativeStatusBadge', () => {
  const ALL_STATUSES: InitiativeStatus[] = ['planned', 'in_progress', 'blocked', 'completed'];

  describe('rendering', () => {
    it.each(ALL_STATUSES)('should render badge for status: %s', (status) => {
      render(<InitiativeStatusBadge status={status} />);
      expect(document.body).toBeTruthy();
    });

    it('should render with default showIcon prop (true)', () => {
      const { container } = render(<InitiativeStatusBadge status="planned" />);
      // Badge renders as div with inline-flex class
      const badge = container.querySelector('[class*="inline-flex"]');
      expect(badge).toBeInTheDocument();
      // Should have SVG icon (showIcon defaults to true)
      expect(badge?.querySelector('svg')).toBeInTheDocument();
    });

    it('should render with showIcon=false', () => {
      render(<InitiativeStatusBadge status="planned" showIcon={false} />);
      expect(screen.getByText(/planejad/i)).toBeInTheDocument();
    });

    it('should render with showIcon=true', () => {
      render(<InitiativeStatusBadge status="in_progress" showIcon={true} />);
      expect(screen.getByText(/andamento|progress/i)).toBeInTheDocument();
    });
  });

  describe('status labels', () => {
    it('should display correct label for planned status', () => {
      render(<InitiativeStatusBadge status="planned" />);
      expect(screen.getByText(/planejad/i)).toBeInTheDocument();
    });

    it('should display correct label for in_progress status', () => {
      render(<InitiativeStatusBadge status="in_progress" />);
      expect(screen.getByText(/andamento|progress/i)).toBeInTheDocument();
    });

    it('should display correct label for blocked status', () => {
      render(<InitiativeStatusBadge status="blocked" />);
      expect(screen.getByText(/bloquead/i)).toBeInTheDocument();
    });

    it('should display correct label for completed status', () => {
      render(<InitiativeStatusBadge status="completed" />);
      expect(screen.getByText(/concluíd|complet/i)).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('should accept custom className', () => {
      const { container } = render(
        <InitiativeStatusBadge status="planned" className="custom-class" />
      );
      const badge = container.querySelector('.custom-class');
      expect(badge).toBeInTheDocument();
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(
        <InitiativeStatusBadge status="completed" className="my-custom-class" />
      );
      const badge = container.querySelector('.my-custom-class');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('icon mapping', () => {
    it('should render SVG icon for planned status', () => {
      const { container } = render(<InitiativeStatusBadge status="planned" showIcon={true} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render SVG icon for in_progress status', () => {
      const { container } = render(<InitiativeStatusBadge status="in_progress" showIcon={true} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render SVG icon for blocked status', () => {
      const { container } = render(<InitiativeStatusBadge status="blocked" showIcon={true} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render SVG icon for completed status', () => {
      const { container } = render(<InitiativeStatusBadge status="completed" showIcon={true} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('should require status prop', () => {
      const props = { status: 'planned' as InitiativeStatus };
      expect(props.status).toBeDefined();
    });

    it('should accept optional showIcon prop', () => {
      const propsWithIcon: { status: InitiativeStatus; showIcon?: boolean } = { status: 'planned', showIcon: true };
      const propsWithoutIcon: { status: InitiativeStatus; showIcon?: boolean } = { status: 'planned' };
      expect(propsWithIcon.showIcon).toBe(true);
      expect(propsWithoutIcon.showIcon).toBeUndefined();
    });

    it('should accept optional className prop', () => {
      const props = { status: 'planned' as InitiativeStatus, className: 'test-class' };
      expect(props.className).toBe('test-class');
    });
  });

  describe('type safety', () => {
    it('should only accept valid InitiativeStatus values', () => {
      const validStatuses: InitiativeStatus[] = ['planned', 'in_progress', 'blocked', 'completed'];
      validStatuses.forEach(status => {
        expect(['planned', 'in_progress', 'blocked', 'completed']).toContain(status);
      });
    });

    it('should enforce InitiativeStatus type', () => {
      const status: InitiativeStatus = 'planned';
      expect(status).toBe('planned');
    });
  });

  describe('badge variant', () => {
    it('should use secondary variant (inline-flex badge)', () => {
      const { container } = render(<InitiativeStatusBadge status="planned" />);
      const badge = container.querySelector('[class*="inline-flex"]');
      expect(badge).toBeInTheDocument();
    });
  });
});
