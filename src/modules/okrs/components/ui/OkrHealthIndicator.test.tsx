/**
 * OkrHealthIndicator Component Tests
 * 
 * Tests for the health indicator component with different variants.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { OkrHealthIndicator, RagStatusDot, RagSummary, type HealthStatus } from './OkrHealthIndicator';

// ============================================================
// OkrHealthIndicator Tests
// ============================================================

describe('OkrHealthIndicator', () => {
  describe('basic rendering', () => {
    it('should render with score', () => {
      render(<OkrHealthIndicator score={75} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should render without crashing for low score', () => {
      const { container } = render(<OkrHealthIndicator score={25} />);
      expect(container.firstChild).toBeTruthy();
    });

    it('should render without crashing for high score', () => {
      const { container } = render(<OkrHealthIndicator score={100} />);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('status from score calculation', () => {
    it('should derive healthy status for score >= 70', () => {
      render(<OkrHealthIndicator score={75} />);
      expect(screen.getByText(/Saudável/)).toBeInTheDocument();
    });

    it('should derive at_risk status for score >= 40 and < 70', () => {
      render(<OkrHealthIndicator score={55} />);
      expect(screen.getByText(/Em Risco/)).toBeInTheDocument();
    });

    it('should derive critical status for score < 40', () => {
      render(<OkrHealthIndicator score={25} />);
      expect(screen.getByText(/Crítico/)).toBeInTheDocument();
    });

    it('should use provided status over calculated', () => {
      render(<OkrHealthIndicator score={90} status="critical" />);
      expect(screen.getByText(/Crítico/)).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should render badge variant (default)', () => {
      const { container } = render(<OkrHealthIndicator score={75} variant="badge" />);
      expect(container.firstChild).toBeTruthy();
    });

    it('should render pill variant', () => {
      const { container } = render(<OkrHealthIndicator score={75} variant="pill" />);
      expect(container.querySelector('.rounded-full')).toBeTruthy();
    });

    it('should render score variant', () => {
      render(<OkrHealthIndicator score={75} variant="score" />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('showScore prop', () => {
    it('should show score by default', () => {
      render(<OkrHealthIndicator score={75} />);
      expect(screen.getByText(/75%/)).toBeInTheDocument();
    });

    it('should hide score when showScore is false', () => {
      render(<OkrHealthIndicator score={75} showScore={false} variant="pill" />);
      expect(screen.queryByText('75%')).not.toBeInTheDocument();
    });
  });

  describe('summary prop', () => {
    it('should accept summary for tooltip', () => {
      const { container } = render(
        <OkrHealthIndicator score={75} summary="Objetivo está progredindo bem" />
      );
      expect(container.firstChild).toBeTruthy();
    });
  });
});

// ============================================================
// getStatusFromScore Tests
// ============================================================

describe('getStatusFromScore logic', () => {
  const getStatusFromScore = (score: number): HealthStatus => {
    if (score >= 70) return 'healthy';
    if (score >= 40) return 'at_risk';
    return 'critical';
  };

  it('should return healthy for score 100', () => {
    expect(getStatusFromScore(100)).toBe('healthy');
  });

  it('should return healthy for score 70', () => {
    expect(getStatusFromScore(70)).toBe('healthy');
  });

  it('should return at_risk for score 69', () => {
    expect(getStatusFromScore(69)).toBe('at_risk');
  });

  it('should return at_risk for score 40', () => {
    expect(getStatusFromScore(40)).toBe('at_risk');
  });

  it('should return critical for score 39', () => {
    expect(getStatusFromScore(39)).toBe('critical');
  });

  it('should return critical for score 0', () => {
    expect(getStatusFromScore(0)).toBe('critical');
  });
});

// ============================================================
// RagStatusDot Tests
// ============================================================

describe('RagStatusDot', () => {
  it('should render green status', () => {
    const { container } = render(<RagStatusDot status="green" />);
    expect(container.querySelector('.bg-status-green')).toBeTruthy();
  });

  it('should render yellow status', () => {
    const { container } = render(<RagStatusDot status="yellow" />);
    expect(container.querySelector('.bg-status-yellow')).toBeTruthy();
  });

  it('should render red status', () => {
    const { container } = render(<RagStatusDot status="red" />);
    expect(container.querySelector('.bg-status-red')).toBeTruthy();
  });

  it('should render not_started status', () => {
    const { container } = render(<RagStatusDot status="not_started" />);
    expect(container.querySelector('.bg-status-gray')).toBeTruthy();
  });

  it('should show label when showLabel is true', () => {
    render(<RagStatusDot status="green" showLabel />);
    expect(screen.getByText('On Track')).toBeInTheDocument();
  });

  it('should use custom label', () => {
    render(<RagStatusDot status="green" showLabel label="Custom Label" />);
    expect(screen.getByText('Custom Label')).toBeInTheDocument();
  });

  it('should hide label by default', () => {
    render(<RagStatusDot status="green" />);
    expect(screen.queryByText('On Track')).not.toBeInTheDocument();
  });
});

// ============================================================
// RagSummary Tests
// ============================================================

describe('RagSummary', () => {
  it('should render with all statuses', () => {
    render(<RagSummary green={3} yellow={2} red={1} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should show total count', () => {
    render(<RagSummary green={3} yellow={2} red={1} />);
    expect(screen.getByText('6 KRs')).toBeInTheDocument();
  });

  it('should use singular for 1 KR', () => {
    render(<RagSummary green={1} yellow={0} red={0} />);
    expect(screen.getByText('1 KR')).toBeInTheDocument();
  });

  it('should not render for zero total', () => {
    const { container } = render(<RagSummary green={0} yellow={0} red={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('should include notStarted in total', () => {
    render(<RagSummary green={1} yellow={1} red={1} notStarted={1} />);
    expect(screen.getByText('4 KRs')).toBeInTheDocument();
  });

  it('should hide zero count statuses', () => {
    const { container } = render(<RagSummary green={5} yellow={0} red={0} />);
    // Only green should be visible
    expect(container.querySelectorAll('.bg-status-yellow').length).toBe(0);
    expect(container.querySelectorAll('.bg-status-red').length).toBe(0);
  });
});

// ============================================================
// Status Config Tests
// ============================================================

describe('Status Configuration', () => {
  const statusConfig = {
    healthy: { label: 'Saudável', emoji: '🟢' },
    at_risk: { label: 'Em Risco', emoji: '🟡' },
    critical: { label: 'Crítico', emoji: '🔴' },
  };

  it('should have correct labels', () => {
    expect(statusConfig.healthy.label).toBe('Saudável');
    expect(statusConfig.at_risk.label).toBe('Em Risco');
    expect(statusConfig.critical.label).toBe('Crítico');
  });

  it('should have correct emojis', () => {
    expect(statusConfig.healthy.emoji).toBe('🟢');
    expect(statusConfig.at_risk.emoji).toBe('🟡');
    expect(statusConfig.critical.emoji).toBe('🔴');
  });
});
