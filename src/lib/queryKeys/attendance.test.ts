import { describe, it, expect } from 'vitest';
import { attendanceKeys } from './attendance';

describe('attendanceKeys', () => {
  it('builds session key with prefix', () => {
    expect(attendanceKeys.session('abc')).toEqual(['attendance', 'session', 'abc']);
    expect(attendanceKeys.session('abc')[0]).toBe(attendanceKeys.sessionsPrefix()[0]);
  });

  it('builds summary key', () => {
    expect(attendanceKeys.summary('s1')).toEqual(['attendance', 'summary', 's1']);
  });

  it('participant history defaults range to all', () => {
    expect(attendanceKeys.participantHistory('p1', 'weekly')).toEqual([
      'attendance',
      'history',
      'p1',
      'weekly',
      'all',
    ]);
  });

  it('bu ritual series respects range', () => {
    expect(attendanceKeys.buRitualSeries('bu1', 'mbr', '12w')).toEqual([
      'attendance',
      'series',
      'bu1',
      'mbr',
      '12w',
    ]);
  });

  it('all() acts as global prefix', () => {
    expect(attendanceKeys.all()).toEqual(['attendance']);
  });
});
