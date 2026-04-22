import { describe, it, expect } from 'vitest';
import {
  ATTENDANCE_CONFIG,
  getAttendanceConfig,
  isAttendanceEnabled,
  permissionKeyForMarkerRole,
  PERMISSION_BY_MARKER_ROLE,
} from '../attendanceConfig';

describe('attendanceConfig', () => {
  it('enables presence for collective rituals', () => {
    const collective = ['team-checkin', 'weekly', 'mbr', 'qbr-meeting', 'qbr-post'] as const;
    collective.forEach((persona) => {
      expect(ATTENDANCE_CONFIG[persona].enabled).toBe(true);
      expect(ATTENDANCE_CONFIG[persona].resolver).toBeDefined();
      expect(ATTENDANCE_CONFIG[persona].markerRole).toBeDefined();
    });
  });

  it('disables presence for individual rituals', () => {
    const individual = [
      'collaborator',
      'leader-prep',
      'clevel-checkin',
      'pre-weekly',
      'mbr-pre',
      'qbr-pre',
      'qbr-pre-clevel',
      'team-okr-creation',
      'team-kr-creation',
    ] as const;
    individual.forEach((persona) => {
      expect(ATTENDANCE_CONFIG[persona].enabled).toBe(false);
    });
  });

  it('team-checkin uses team-leader role with default-all', () => {
    const cfg = getAttendanceConfig('team-checkin');
    expect(cfg.markerRole).toBe('team-leader');
    expect(cfg.defaultPresence).toBe('all');
    expect(cfg.requireConfirmation).toBe(false);
  });

  it('weekly/mbr/qbr use conductor role with default-none and confirmation', () => {
    (['weekly', 'mbr', 'qbr-meeting', 'qbr-post'] as const).forEach((p) => {
      const cfg = getAttendanceConfig(p);
      expect(cfg.markerRole).toBe('conductor');
      expect(cfg.defaultPresence).toBe('none');
      expect(cfg.requireConfirmation).toBe(true);
    });
  });

  it('maps marker roles to permission keys deterministically', () => {
    expect(permissionKeyForMarkerRole('conductor')).toBe('okrs.attendance.mark:bu');
    expect(permissionKeyForMarkerRole('team-leader')).toBe('okrs.attendance.mark:team');
    expect(PERMISSION_BY_MARKER_ROLE.conductor).toBe('okrs.attendance.mark:bu');
  });

  it('isAttendanceEnabled is a thin alias', () => {
    expect(isAttendanceEnabled('weekly')).toBe(true);
    expect(isAttendanceEnabled('collaborator')).toBe(false);
  });
});
