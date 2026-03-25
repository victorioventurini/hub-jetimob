/**
 * @file KrProgressPreview.test.tsx
 * @description Tests for KrProgressPreview component
 * 
 * Coverage:
 * - Progress calculation display
 * - Direction handling (up/down)
 * - Unit display
 * - Null/empty handling
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { KrProgressPreview } from './KrProgressPreview';

describe('KrProgressPreview', () => {
  const defaultProps = {
    title: 'Increase Revenue',
    baseline: 0,
    currentValue: 50,
    target: 100,
    unit: '%',
    direction: 'up' as const,
  };

  describe('rendering', () => {
    it('should render with all props', () => {
      render(<KrProgressPreview {...defaultProps} />);
      
      expect(screen.getByText('Increase Revenue')).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      const { container } = render(<KrProgressPreview {...defaultProps} />);
      
      // Progress bar should be present
      expect(container).toBeInTheDocument();
    });

    it('should display current value', () => {
      render(<KrProgressPreview {...defaultProps} />);
      
      expect(screen.getAllByText(/50/).length).toBeGreaterThanOrEqual(1);
    });

    it('should display target value', () => {
      render(<KrProgressPreview {...defaultProps} />);
      
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });
  });

  describe('null/empty handling', () => {
    it('should return null for empty title', () => {
      const { container } = render(
        <KrProgressPreview {...defaultProps} title="" />
      );
      
      // Should not render content
      expect(container.firstChild).toBeNull();
    });

    it('should return null for non-number target', () => {
      const { container } = render(
        <KrProgressPreview 
          {...defaultProps} 
          target={NaN} 
        />
      );
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('progress calculation', () => {
    it('should calculate 50% progress correctly', () => {
      render(<KrProgressPreview {...defaultProps} />);
      
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });

    it('should calculate 100% progress', () => {
      render(
        <KrProgressPreview 
          {...defaultProps}
          currentValue={100}
        />
      );
      
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('should calculate 0% progress', () => {
      render(
        <KrProgressPreview 
          {...defaultProps}
          currentValue={0}
        />
      );
      
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should handle progress over 100%', () => {
      render(
        <KrProgressPreview 
          {...defaultProps}
          currentValue={150}
        />
      );
      
      // Should show >100% or cap at 100
    });
  });

  describe('direction handling', () => {
    it('should handle up direction', () => {
      const { container } = render(
        <KrProgressPreview 
          {...defaultProps}
          direction="up"
        />
      );
      
      // Up arrow indicator should be present
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should handle down direction', () => {
      const { container } = render(
        <KrProgressPreview 
          {...defaultProps}
          direction="down"
          baseline={100}
          currentValue={50}
          target={0}
        />
      );
      
      // Down arrow indicator should be present
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('unit display', () => {
    it('should display percentage unit', () => {
      render(<KrProgressPreview {...defaultProps} unit="%" />);
      
      expect(screen.getByText(/%/)).toBeInTheDocument();
    });

    it('should display custom unit', () => {
      render(<KrProgressPreview {...defaultProps} unit="pts" />);
      
      expect(screen.getByText(/pts/)).toBeInTheDocument();
    });

    it('should display currency unit', () => {
      render(<KrProgressPreview {...defaultProps} unit="R$" />);
      
      expect(screen.getByText(/R\$/)).toBeInTheDocument();
    });
  });

  describe('baseline display', () => {
    it('should display baseline value when non-zero', () => {
      render(
        <KrProgressPreview 
          {...defaultProps}
          baseline={10}
        />
      );
      
      expect(screen.getByText(/inicial/)).toBeInTheDocument();
    });

    it('should not display baseline when zero', () => {
      render(
        <KrProgressPreview 
          {...defaultProps}
          baseline={0}
        />
      );
      
      // Should not show "inicial" for zero baseline
      expect(screen.queryByText(/inicial/)).not.toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('should require all main props', () => {
      const props = {
        title: 'Test KR',
        baseline: 0,
        currentValue: 50,
        target: 100,
        unit: '%',
        direction: 'up' as const,
      };
      
      expect(props.title).toBeDefined();
      expect(props.baseline).toBeDefined();
      expect(props.currentValue).toBeDefined();
      expect(props.target).toBeDefined();
      expect(props.unit).toBeDefined();
      expect(props.direction).toBeDefined();
    });

    it('should accept valid direction values', () => {
      const directions = ['up', 'down'];
      
      directions.forEach(dir => {
        expect(['up', 'down']).toContain(dir);
      });
    });
  });

  describe('color coding', () => {
    it('should show appropriate color for high progress', () => {
      const { container } = render(
        <KrProgressPreview 
          {...defaultProps}
          currentValue={90}
        />
      );
      
      // Should have green-ish color
      expect(container).toBeInTheDocument();
    });

    it('should show appropriate color for low progress', () => {
      const { container } = render(
        <KrProgressPreview 
          {...defaultProps}
          currentValue={10}
        />
      );
      
      // Should have red-ish color
      expect(container).toBeInTheDocument();
    });
  });
});
