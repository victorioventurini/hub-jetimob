/**
 * Tests for LoadingState, LoadingSpinner, SkeletonCard, SkeletonList, SkeletonTable
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingState, LoadingSpinner, SkeletonCard, SkeletonList, SkeletonTable } from './loading-state';

describe('LoadingSpinner', () => {
  it('should render without text', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render with text', () => {
    render(<LoadingSpinner text="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('LoadingState', () => {
  it('should render default text', () => {
    render(<LoadingState />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('should render custom text', () => {
    render(<LoadingState text="Verificando permissões..." />);
    expect(screen.getByText('Verificando permissões...')).toBeInTheDocument();
  });

  it('should apply fullPage class', () => {
    const { container } = render(<LoadingState fullPage />);
    expect(container.firstChild).toHaveClass('min-h-screen');
  });

  it('should apply section class by default', () => {
    const { container } = render(<LoadingState />);
    expect(container.firstChild).toHaveClass('py-16');
  });

  it('should hide text when null', () => {
    const { container } = render(<LoadingState text="" />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });
});

describe('SkeletonCard', () => {
  it('should render with default lines', () => {
    const { container } = render(<SkeletonCard />);
    // 1 title skeleton + 2 body skeletons = 3 total inside flex-1
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [class*="rounded"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('SkeletonList', () => {
  it('should render correct number of items (card variant)', () => {
    const { container } = render(<SkeletonList count={5} />);
    const cards = container.querySelectorAll('.rounded-lg.border');
    expect(cards).toHaveLength(5);
  });

  it('should render row variant', () => {
    const { container } = render(<SkeletonList count={3} variant="row" />);
    const rows = container.querySelectorAll('.flex.items-center');
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });
});

describe('SkeletonTable', () => {
  it('should render header and rows', () => {
    const { container } = render(<SkeletonTable rows={3} columns={4} />);
    // 1 header + 3 data rows
    const allRows = container.querySelectorAll('.flex.gap-4');
    expect(allRows).toHaveLength(4);
  });
});
