import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ProjectProgressBar } from '../ProjectProgressBar';

describe('ProjectProgressBar', () => {
  it('renders label with done/total by default', () => {
    renderWithProviders(<ProjectProgressBar total={5} done={3} pct={60} />);
    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    renderWithProviders(<ProjectProgressBar total={5} done={3} pct={60} showLabel={false} />);
    expect(screen.queryByText('3/5')).not.toBeInTheDocument();
  });

  it('renders 0/0 for empty project', () => {
    renderWithProviders(<ProjectProgressBar total={0} done={0} pct={0} />);
    expect(screen.getByText('0/0')).toBeInTheDocument();
  });

  it('renders full completion', () => {
    renderWithProviders(<ProjectProgressBar total={4} done={4} pct={100} />);
    expect(screen.getByText('4/4')).toBeInTheDocument();
  });
});
