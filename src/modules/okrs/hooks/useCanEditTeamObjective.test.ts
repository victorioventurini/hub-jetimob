/**
 * Tests for useCanEditTeamObjective hook.
 *
 * Permission rules (any one grants edit):
 * 1. Owner of the objective
 * 2. Leader of the team (or parent team)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@/test/test-utils';

vi.mock('@/hooks/useIdentity', () => ({
  useProfileId: vi.fn(),
}));

vi.mock('./useCanManageTeamOkr', () => ({
  useCanManageTeamOkr: vi.fn(),
}));

import { useCanEditTeamObjective } from './useCanEditTeamObjective';
import { useProfileId } from '@/hooks/useIdentity';
import { useCanManageTeamOkr } from './useCanManageTeamOkr';

const mockUseProfileId = vi.mocked(useProfileId);
const mockUseCanManageTeamOkr = vi.mocked(useCanManageTeamOkr);

function setup(profileId: string | null, canManage: boolean, isLoading = false) {
  mockUseProfileId.mockReturnValue(profileId);
  mockUseCanManageTeamOkr.mockReturnValue({ canManage, isLoading });
}

describe('useCanEditTeamObjective', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when objective is null', () => {
    setup('user-1', true);
    const { result } = renderHook(() => useCanEditTeamObjective(null));
    expect(result.current.canEdit).toBe(false);
  });

  it('returns false when objective is undefined', () => {
    setup('user-1', true);
    const { result } = renderHook(() => useCanEditTeamObjective(undefined));
    expect(result.current.canEdit).toBe(false);
  });

  it('returns false when profileId is null', () => {
    setup(null, true);
    const { result } = renderHook(() =>
      useCanEditTeamObjective({ team_id: 'team-1', owner_user_id: 'user-1' })
    );
    expect(result.current.canEdit).toBe(false);
  });

  it('grants edit when user is owner', () => {
    setup('user-1', false);
    const { result } = renderHook(() =>
      useCanEditTeamObjective({ team_id: 'team-1', owner_user_id: 'user-1' })
    );
    expect(result.current.canEdit).toBe(true);
  });

  it('grants edit when user is team leader (canManage=true)', () => {
    setup('user-99', true);
    const { result } = renderHook(() =>
      useCanEditTeamObjective({ team_id: 'team-1', owner_user_id: 'user-1' })
    );
    expect(result.current.canEdit).toBe(true);
  });

  it('denies edit when neither owner nor leader', () => {
    setup('user-99', false);
    const { result } = renderHook(() =>
      useCanEditTeamObjective({ team_id: 'team-1', owner_user_id: 'user-1' })
    );
    expect(result.current.canEdit).toBe(false);
  });

  it('handles missing owner_user_id', () => {
    setup('user-99', false);
    const { result } = renderHook(() =>
      useCanEditTeamObjective({ team_id: 'team-1' })
    );
    expect(result.current.canEdit).toBe(false);
  });

  it('propagates isLoading', () => {
    setup('user-1', false, true);
    const { result } = renderHook(() =>
      useCanEditTeamObjective({ team_id: 'team-1', owner_user_id: 'user-1' })
    );
    expect(result.current.isLoading).toBe(true);
  });
});
