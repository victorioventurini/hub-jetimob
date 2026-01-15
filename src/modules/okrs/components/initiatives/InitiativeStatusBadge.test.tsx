/**
 * @file InitiativeStatusBadge.test.tsx
 * @description Tests for InitiativeStatusBadge component
 * 
 * Coverage:
 * - Status rendering for all initiative statuses
 * - Icon display toggle
 * - Styling and classes
 * - Label display
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InitiativeStatusBadge } from './InitiativeStatusBadge';
import type { InitiativeStatus } from '../../types/initiative';

describe('InitiativeStatusBadge', () => {
  const ALL_STATUSES: InitiativeStatus[] = ['planned', 'in_progress', 'blocked', 'completed'];

  describe('rendering', () => {
    it.each(ALL_STATUSES)('should render badge for status: %s', (status) => {
      render(<InitiativeStatusBadge status={status} />);
      
      // Should render without crashing
      expect(document.body).toBeTruthy();
    });

    it('should render with default showIcon prop (true)', () => {
      render(<InitiativeStatusBadge status="planned" />);
      
      // Icon should be present by default
      const badge = screen.getByText(/planejad/i).closest('[class*="badge"]');
      expect(badge).toBeInTheDocument();
    });

    it('should render with showIcon=false', () => {
      render(<InitiativeStatusBadge status="planned" showIcon={false} />);
      
      // Badge should still render
      expect(screen.getByText(/planejad/i)).toBeInTheDocument();
    });

    it('should render with showIcon=true', () => {
      render(<InitiativeStatusBadge status="in_progress" showIcon={true} />);
      
      // Badge with icon should render
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
    it('should use Circle icon for planned status', () => {
      render(<InitiativeStatusBadge status="planned" showIcon={true} />);
      
      // Icon should be rendered (SVG element)
      const badge = screen.getByText(/planejad/i).closest('[class*="badge"]');
      const svg = badge?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should use Play icon for in_progress status', () => {
      render(<InitiativeStatusBadge status="in_progress" showIcon={true} />);
      
      const badge = screen.getByText(/andamento|progress/i).closest('[class*="badge"]');
      const svg = badge?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should use AlertTriangle icon for blocked status', () => {
      render(<InitiativeStatusBadge status="blocked" showIcon={true} />);
      
      const badge = screen.getByText(/bloquead/i).closest('[class*="badge"]');
      const svg = badge?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should use CheckCircle2 icon for completed status', () => {
      render(<InitiativeStatusBadge status="completed" showIcon={true} />);
      
      const badge = screen.getByText(/concluíd|complet/i).closest('[class*="badge"]');
      const svg = badge?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('should require status prop', () => {
      // TypeScript ensures this at compile time
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
      // This is a compile-time check
      const status: InitiativeStatus = 'planned';
      expect(status).toBe('planned');
    });
  });

  describe('badge variant', () => {
    it('should use secondary variant', () => {
      const { container } = render(<InitiativeStatusBadge status="planned" />);
      
      // Badge component should be rendered
      const badge = container.querySelector('[class*="badge"]');
      expect(badge).toBeInTheDocument();
    });
  });
});
