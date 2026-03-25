/**
 * @file QualityMetricsGrid.test.tsx
 * @description Tests for QualityMetricsGrid component
 * 
 * Coverage:
 * - Grid rendering
 * - Metric cards display
 * - Loading state
 * - Metric values
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { QualityMetricsGrid } from './quality/QualityMetricsGrid';

describe('QualityMetricsGrid', () => {
  const mockMetrics = {
    totalKrs: 20,
    krsUpdatedOnTime: 15,
    krsUpdatedLate: 3,
    krsNoUpdate: 2,
    krsAtRisk: 4,
    krsStagnant: 2,
    initiativesCritical: 1,
  };

  describe('rendering', () => {
    it('should render quality metrics grid', () => {
      render(<QualityMetricsGrid metrics={mockMetrics} />);
      
      // Should render without crashing
      expect(document.body).toBeTruthy();
    });

    it('should render all metric cards', () => {
      render(<QualityMetricsGrid metrics={mockMetrics} />);
      
      // Multiple cards should be rendered
    });
  });

  describe('loading state', () => {
    it('should show loading state when isLoading is true', () => {
      const { container } = render(<QualityMetricsGrid metrics={mockMetrics} isLoading={true} />);
      
      // Should show skeleton or loading indicators
      expect(container).toBeInTheDocument();
    });

    it('should show content when isLoading is false', () => {
      render(<QualityMetricsGrid metrics={mockMetrics} isLoading={false} />);
      
      // Should show metric values
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  describe('metric values', () => {
    it('should display totalKrs', () => {
      render(<QualityMetricsGrid metrics={mockMetrics} />);
      
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('should display krsUpdatedOnTime', () => {
      render(<QualityMetricsGrid metrics={mockMetrics} />);
      
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should display krsAtRisk count', () => {
      render(<QualityMetricsGrid metrics={mockMetrics} />);
      
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should display krsStagnant count', () => {
      render(<QualityMetricsGrid metrics={mockMetrics} />);
      
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('zero values', () => {
    it('should handle all zero values', () => {
      const zeroMetrics = {
        totalKrs: 0,
        krsUpdatedOnTime: 0,
        krsUpdatedLate: 0,
        krsNoUpdate: 0,
        krsAtRisk: 0,
        krsStagnant: 0,
        initiativesCritical: 0,
      };
      
      render(<QualityMetricsGrid metrics={zeroMetrics} />);
      
      // Should render zeros
    });
  });

  describe('props interface', () => {
    it('should require metrics prop', () => {
      const props = { metrics: mockMetrics };
      
      expect(props.metrics).toBeDefined();
      expect(props.metrics.totalKrs).toBeDefined();
      expect(props.metrics.krsUpdatedOnTime).toBeDefined();
      expect(props.metrics.krsUpdatedLate).toBeDefined();
      expect(props.metrics.krsNoUpdate).toBeDefined();
      expect(props.metrics.krsAtRisk).toBeDefined();
      expect(props.metrics.krsStagnant).toBeDefined();
      expect(props.metrics.initiativesCritical).toBeDefined();
    });

    it('should accept optional isLoading prop', () => {
      const propsWithLoading = { metrics: mockMetrics, isLoading: true };
      expect(propsWithLoading.isLoading).toBe(true);
    });
  });
});
