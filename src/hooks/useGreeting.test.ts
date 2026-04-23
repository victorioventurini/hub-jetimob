/**
 * Tests for useGreeting — deterministic by mocking Date and Math.random.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGreeting } from './useGreeting';

function setNow(iso: string) {
  vi.setSystemTime(new Date(iso));
}

describe('useGreeting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Force "no Buenas" path and 0 emoji so output is deterministic per period.
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses "Bom dia" in the morning hours', () => {
    setNow('2025-01-20T09:00:00Z'); // Monday morning UTC; jsdom uses local tz, but hours pulled from getHours()
    // Force getHours to morning regardless of tz
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(8);
    vi.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
    const { result } = renderHook(() => useGreeting({ userName: 'João Silva' }));
    expect(result.current.greeting).toMatch(/^Bom dia/);
  });

  it('uses "Boa tarde" in afternoon', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    vi.spyOn(Date.prototype, 'getDay').mockReturnValue(2);
    const { result } = renderHook(() => useGreeting({ userName: 'Ana' }));
    expect(result.current.greeting).toMatch(/^Boa tarde/);
  });

  it('uses "Boa noite" at night', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(21);
    vi.spyOn(Date.prototype, 'getDay').mockReturnValue(3);
    const { result } = renderHook(() => useGreeting({ userName: 'Bia' }));
    expect(result.current.greeting).toMatch(/^Boa noite/);
  });

  it('uses only the first name in the greeting', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    vi.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
    const { result } = renderHook(() => useGreeting({ userName: 'Maria José Pereira' }));
    expect(result.current.greeting).toContain('Maria');
    expect(result.current.greeting).not.toContain('Pereira');
  });

  it('omits the name when userName is null/undefined', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    vi.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
    const { result } = renderHook(() => useGreeting({ userName: null }));
    expect(result.current.greeting).toMatch(/^Bom dia\./);
  });

  it('builds executive subtext using BU name when profile=executive', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    vi.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
    const { result } = renderHook(() =>
      useGreeting({ userName: 'C-Level', profile: 'executive', buName: 'Jetimob' })
    );
    expect(result.current.subtext).toContain('Jetimob');
  });

  it('builds leader subtext referencing team name', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    vi.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
    const { result } = renderHook(() =>
      useGreeting({ userName: 'Líder', profile: 'leader', teamName: 'Engenharia' })
    );
    expect(result.current.subtext).toBeTruthy();
  });

  it('returns external-specific subtext for external profile', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    vi.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
    const { result } = renderHook(() =>
      useGreeting({ userName: 'Parceiro', profile: 'external' })
    );
    expect(result.current.subtext).toBe('Acompanhe suas demandas');
  });
});
