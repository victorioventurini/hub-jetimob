/**
 * Tests for StatusBadge, StatusDot, and helper functions
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, StatusDot, getStatusConfig, getStatusLabel, getStatusDotColor } from './status-badge';

describe('getStatusConfig', () => {
  it('should return config for known status', () => {
    const config = getStatusConfig('on_track');
    expect(config.label).toBe('No caminho');
    expect(config.dotColor).toBe('bg-status-green');
  });

  it('should return inactive config for unknown status', () => {
    const config = getStatusConfig('nonexistent_status');
    expect(config.label).toBe('Inativo');
  });
});

describe('getStatusLabel', () => {
  it.each([
    ['waiting', 'Aguardando'],
    ['in_progress', 'Em andamento'],
    ['done', 'Concluído'],
    ['discarded', 'Descartado'],
    ['available', 'Disponível'],
    ['loaned', 'Emprestado'],
    ['at_risk', 'Em risco'],
    ['off_track', 'Fora do caminho'],
  ])('should return "%s" → "%s"', (status, label) => {
    expect(getStatusLabel(status)).toBe(label);
  });

  it('should return raw status for unknown', () => {
    expect(getStatusLabel('xyz_unknown')).toBe('xyz_unknown');
  });
});

describe('getStatusDotColor', () => {
  it('should return dot color for known status', () => {
    expect(getStatusDotColor('on_track')).toBe('bg-status-green');
    expect(getStatusDotColor('at_risk')).toBe('bg-status-yellow');
    expect(getStatusDotColor('off_track')).toBe('bg-status-red');
  });

  it('should return fallback for unknown status', () => {
    expect(getStatusDotColor('xyz')).toBe('bg-muted-foreground');
  });
});

describe('StatusBadge', () => {
  it('should render with correct label', () => {
    render(<StatusBadge status="waiting" />);
    expect(screen.getByText('Aguardando')).toBeInTheDocument();
  });

  it('should render custom label', () => {
    render(<StatusBadge status="waiting" customLabel="Custom" />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.queryByText('Aguardando')).not.toBeInTheDocument();
  });

  it('should render dot by default', () => {
    const { container } = render(<StatusBadge status="on_track" />);
    const dot = container.querySelector('.rounded-full');
    expect(dot).toBeInTheDocument();
  });

  it('should hide dot when showDot=false', () => {
    const { container } = render(<StatusBadge status="on_track" showDot={false} />);
    const dots = container.querySelectorAll('.rounded-full');
    expect(dots).toHaveLength(0);
  });
});

describe('StatusDot', () => {
  it('should render with correct size class', () => {
    const { container } = render(<StatusDot status="on_track" size="lg" />);
    const dot = container.querySelector('.w-3.h-3');
    expect(dot).toBeInTheDocument();
  });
});
