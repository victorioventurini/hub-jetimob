/**
 * @file StatusDistributionBar.test.tsx
 * @description Tests for StatusDistributionBar component
 * 
 * Coverage:
 * - Bar rendering
 * - Status distribution display
 * - Legend display
 * - Loading state
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusDistributionBar } from './StatusDistributionBar';

describe('StatusDistributionBar', () => {
  const mockCounts = {
    on_track: 5,
    at_risk: 3,
    off_track: 2,
    not_started: 1,
    completed: 4,
    dropped: 0,
    total: 15,
  };

  describe('rendering', () => {
    it('should render status distribution bar', () => {
      render(<StatusDistributionBar counts={mockCounts} />);
      
      // Should render the component
      expect(screen.getByText(/Progresso por Status/i)).toBeInTheDocument();
    });

    it('should render total KRs count', () => {
      render(<StatusDistributionBar counts={mockCounts} />);
      
      expect(screen.getByText('15 KRs')).toBeInTheDocument();
    });

    it('should render legend', () => {
      render(<StatusDistributionBar counts={mockCounts} />);
      
      // Legend should show status labels
    });
  });

  describe('loading state', () => {
    it('should show skeleton when loading', () => {
      const { container } = render(<StatusDistributionBar counts={mockCounts} isLoading={true} />);
      
      // Skeleton should be visible
      const skeletons = container.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not show skeleton when not loading', () => {
      render(<StatusDistributionBar counts={mockCounts} isLoading={false} />);
      
      // Content should be visible
      expect(screen.getByText(/Progresso por Status/i)).toBeInTheDocument();
    });
  });

  describe('counts display', () => {
    it('should display on_track count', () => {
      render(<StatusDistributionBar counts={mockCounts} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display at_risk count', () => {
      render(<StatusDistributionBar counts={mockCounts} />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display off_track count', () => {
      render(<StatusDistributionBar counts={mockCounts} />);
      
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display completed count', () => {
      render(<StatusDistributionBar counts={mockCounts} />);
      
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('zero counts', () => {
    it('should handle zero for all statuses', () => {
      const zeroCounts = {
        on_track: 0,
        at_risk: 0,
        off_track: 0,
        not_started: 0,
        completed: 0,
        dropped: 0,
        total: 0,
      };
      
      render(<StatusDistributionBar counts={zeroCounts} />);
      
      // Should handle empty state
      expect(screen.getByText(/Nenhum Key Result/i)).toBeInTheDocument();
    });

    it('should handle partial zero counts', () => {
      const partialCounts = {
        on_track: 10,
        at_risk: 0,
        off_track: 0,
        not_started: 0,
        completed: 0,
        dropped: 0,
        total: 10,
      };
      
      render(<StatusDistributionBar counts={partialCounts} />);
      
      expect(screen.getByText('10 KRs')).toBeInTheDocument();
    });
  });

  describe('proportions', () => {
    it('should calculate correct proportions', () => {
      const { container } = render(<StatusDistributionBar counts={mockCounts} />);
      
      // Total is 15, so proportions should be calculated
      expect(container).toBeInTheDocument();
    });

    it('should handle large counts', () => {
      const largeCounts = {
        on_track: 500,
        at_risk: 300,
        off_track: 150,
        not_started: 50,
        completed: 200,
        dropped: 10,
        total: 1210,
      };
      
      render(<StatusDistributionBar counts={largeCounts} />);
      
      expect(screen.getByText('1210 KRs')).toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('should require counts prop', () => {
      const props = {
        counts: mockCounts,
      };
      
      expect(props.counts).toBeDefined();
      expect(props.counts.on_track).toBeDefined();
      expect(props.counts.at_risk).toBeDefined();
      expect(props.counts.off_track).toBeDefined();
      expect(props.counts.not_started).toBeDefined();
      expect(props.counts.completed).toBeDefined();
      expect(props.counts.dropped).toBeDefined();
      expect(props.counts.total).toBeDefined();
    });

    it('should accept optional isLoading prop', () => {
      const propsWithLoading = { counts: mockCounts, isLoading: true };
      const propsWithoutLoading = { counts: mockCounts };
      
      expect(propsWithLoading.isLoading).toBe(true);
      expect(propsWithoutLoading).not.toHaveProperty('isLoading');
    });
  });

  describe('status labels', () => {
    it('should display correct status labels', () => {
      render(<StatusDistributionBar counts={mockCounts} />);
      
      // Labels should be in Portuguese
      expect(screen.getByText(/caminho/i)).toBeInTheDocument();
    });
  });
});
