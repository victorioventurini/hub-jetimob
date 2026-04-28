import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { RitualCalendarViewToggle } from '../RitualCalendarViewToggle';

describe('RitualCalendarViewToggle', () => {
  it('renders calendar and list options', () => {
    renderWithProviders(
      <RitualCalendarViewToggle viewMode="calendar" onViewModeChange={vi.fn()} />,
    );
    expect(screen.getByText('Calendário')).toBeInTheDocument();
    expect(screen.getByText('Lista')).toBeInTheDocument();
  });

  it('calls onViewModeChange when clicking list', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RitualCalendarViewToggle viewMode="calendar" onViewModeChange={onChange} />,
    );
    fireEvent.click(screen.getByText('Lista'));
    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('calls onViewModeChange when clicking calendar', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RitualCalendarViewToggle viewMode="list" onViewModeChange={onChange} />,
    );
    fireEvent.click(screen.getByText('Calendário'));
    expect(onChange).toHaveBeenCalledWith('calendar');
  });
});
