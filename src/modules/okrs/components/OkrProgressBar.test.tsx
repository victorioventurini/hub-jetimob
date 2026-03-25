/**
 * OkrProgressBar Component Tests
 * 
 * Tests for the progress bar component used in KR cards.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { OkrProgressBar } from './OkrProgressBar';
import type { OkrRagStatus, OkrDirection } from '../types';

// ============================================================
// Basic Rendering Tests
// ============================================================

describe('OkrProgressBar - Basic Rendering', () => {
  const defaultProps = {
    baseline: 0,
    current: 50,
    target: 100,
    direction: 'up' as OkrDirection,
    status: 'green' as OkrRagStatus,
  };

  it('should render without crashing', () => {
    const { container } = render(<OkrProgressBar {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should display current value', () => {
    render(<OkrProgressBar {...defaultProps} />);
    expect(screen.getAllByText(/50/).length).toBeGreaterThanOrEqual(1);
  });

  it('should display progress percentage', () => {
    render(<OkrProgressBar {...defaultProps} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should display baseline value', () => {
    render(<OkrProgressBar {...defaultProps} />);
    expect(screen.getByText(/Base: 0/)).toBeInTheDocument();
  });

  it('should display target value', () => {
    render(<OkrProgressBar {...defaultProps} />);
    expect(screen.getByText(/Meta: 100/)).toBeInTheDocument();
  });
});

// ============================================================
// Progress Calculation Tests
// ============================================================

describe('OkrProgressBar - Progress Display', () => {
  it('should show 0% for no progress', () => {
    render(
      <OkrProgressBar
        baseline={0}
        current={0}
        target={100}
        direction="up"
        status="not_started"
      />
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should show 100% for completed', () => {
    render(
      <OkrProgressBar
        baseline={0}
        current={100}
        target={100}
        direction="up"
        status="green"
      />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should handle custom baseline', () => {
    render(
      <OkrProgressBar
        baseline={50}
        current={75}
        target={100}
        direction="up"
        status="yellow"
      />
    );
    // 75 out of 50-100 range = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should handle down direction', () => {
    render(
      <OkrProgressBar
        baseline={100}
        current={50}
        target={0}
        direction="down"
        status="green"
      />
    );
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});

// ============================================================
// Size Variants Tests
// ============================================================

describe('OkrProgressBar - Size Variants', () => {
  const defaultProps = {
    baseline: 0,
    current: 50,
    target: 100,
    direction: 'up' as OkrDirection,
    status: 'green' as OkrRagStatus,
  };

  it('should render small size', () => {
    const { container } = render(<OkrProgressBar {...defaultProps} size="sm" />);
    expect(container.querySelector('[class*="h-1"]')).toBeTruthy();
  });

  it('should render medium size (default)', () => {
    const { container } = render(<OkrProgressBar {...defaultProps} size="md" />);
    expect(container.querySelector('[class*="h-2"]')).toBeTruthy();
  });

  it('should render large size', () => {
    const { container } = render(<OkrProgressBar {...defaultProps} size="lg" />);
    expect(container.querySelector('[class*="h-4"]')).toBeTruthy();
  });
});

// ============================================================
// Labels Tests
// ============================================================

describe('OkrProgressBar - Labels', () => {
  const defaultProps = {
    baseline: 0,
    current: 50,
    target: 100,
    direction: 'up' as OkrDirection,
    status: 'green' as OkrRagStatus,
  };

  it('should show labels by default', () => {
    render(<OkrProgressBar {...defaultProps} />);
    expect(screen.getByText(/Base:/)).toBeInTheDocument();
    expect(screen.getByText(/Meta:/)).toBeInTheDocument();
  });

  it('should hide labels when showLabels is false', () => {
    render(<OkrProgressBar {...defaultProps} showLabels={false} />);
    expect(screen.queryByText(/Base:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Meta:/)).not.toBeInTheDocument();
  });

  it('should display custom unit', () => {
    render(<OkrProgressBar {...defaultProps} unit="R$" />);
    expect(screen.getByText(/R\$/)).toBeInTheDocument();
  });

  it('should default to % unit', () => {
    render(<OkrProgressBar {...defaultProps} />);
    expect(screen.getByText(/50 %/)).toBeInTheDocument();
  });
});

// ============================================================
// Status Color Tests
// ============================================================

describe('OkrProgressBar - Status Colors', () => {
  const defaultProps = {
    baseline: 0,
    current: 50,
    target: 100,
    direction: 'up' as OkrDirection,
  };

  it('should apply green status color', () => {
    const { container } = render(
      <OkrProgressBar {...defaultProps} status="green" />
    );
    expect(container.querySelector('.bg-status-green')).toBeTruthy();
  });

  it('should apply yellow status color', () => {
    const { container } = render(
      <OkrProgressBar {...defaultProps} status="yellow" />
    );
    expect(container.querySelector('.bg-status-yellow')).toBeTruthy();
  });

  it('should apply red status color', () => {
    const { container } = render(
      <OkrProgressBar {...defaultProps} status="red" />
    );
    expect(container.querySelector('.bg-status-red')).toBeTruthy();
  });

  it('should apply gray status color for not_started', () => {
    const { container } = render(
      <OkrProgressBar {...defaultProps} status="not_started" />
    );
    expect(container.querySelector('[class*="bg-status-gray"]')).toBeTruthy();
  });
});

// ============================================================
// Edge Cases Tests
// ============================================================

describe('OkrProgressBar - Edge Cases', () => {
  it('should handle zero baseline and target', () => {
    const { container } = render(
      <OkrProgressBar
        baseline={0}
        current={0}
        target={0}
        direction="up"
        status="not_started"
      />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('should handle negative values', () => {
    render(
      <OkrProgressBar
        baseline={-100}
        current={-50}
        target={0}
        direction="up"
        status="yellow"
      />
    );
    expect(document.body.textContent).toBeTruthy();
  });

  it('should handle large numbers', () => {
    render(
      <OkrProgressBar
        baseline={0}
        current={500000}
        target={1000000}
        direction="up"
        status="green"
        unit="R$"
      />
    );
    // Should format with locale
    expect(screen.getByText(/500\.000/)).toBeInTheDocument();
  });

  it('should accept className prop', () => {
    const { container } = render(
      <OkrProgressBar
        baseline={0}
        current={50}
        target={100}
        direction="up"
        status="green"
        className="custom-class"
      />
    );
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
