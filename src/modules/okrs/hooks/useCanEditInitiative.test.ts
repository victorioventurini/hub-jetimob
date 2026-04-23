/**
 * Tests for useCanEditInitiative hook.
 *
 * Permission rules (any one grants edit):
 * 1. Owner of the initiative
 * 2. Contributor of the initiative
 * 3. Leader of the KR's team (or parent team)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@/test/test-utils';

vi.mock('@/hooks/useIdentity', () => ({
  useProfileId: vi.fn(),
}));

vi.mock('./useCanManageTeamOkr', () => ({
  useCanManageTeamOkr: vi.fn(),
}));

import { useCanEditInitiative } from './useCanEditInitiative';
import { useProfileId } from '@/hooks/useIdentity';
import { useCanManageTeamOkr } from './useCanManageTeamOkr';

const mockUseProfileId = vi.mocked(useProfileId);
const mockUseCanManageTeamOkr = vi.mocked(useCanManageTeamOkr);

function setup(profileId: string | null, canManage: boolean, isLoading = false) {
  mockUseProfileId.mockReturnValue(profileId);
  mockUseCanManageTeamOkr.mockReturnValue({ canManage, isLoading });
}

describe('useCanEditInitiative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns canEdit=false when initiative is null', () => {
    setup('user-1', true);
    const { result } = renderHook(() => useCanEditInitiative(null, 'team-1'));
    expect(result.current.canEdit).toBe(false);
  });

  it('returns canEdit=false when initiative is undefined', () => {
    setup('user-1', true);
    const { result } = renderHook(() => useCanEditInitiative(undefined, 'team-1'));
    expect(result.current.canEdit).toBe(false);
  });

  it('returns canEdit=false when profileId is null', () => {
    setup(null, true);
    const { result } = renderHook(() =>
      useCanEditInitiative({ owner_user_id: 'user-1' }, 'team-1')
    );
    expect(result.current.canEdit).toBe(false);
  });

  it('grants edit when user is owner', () => {
    setup('user-1', false);
    const { result } = renderHook(() =>
      useCanEditInitiative({ owner_user_id: 'user-1' }, 'team-1')
    );
    expect(result.current.canEdit).toBe(true);
  });

  it('grants edit when user is contributor', () => {
    setup('user-2', false);
    const { result } = renderHook(() =>
      useCanEditInitiative(
        { owner_user_id: 'user-1', contributors: ['user-2', 'user-3'] },
        'team-1'
      )
    );
    expect(result.current.canEdit).toBe(true);
  });

  it('grants edit when user is team leader (canManage=true)', () => {
    setup('user-9', true);
    const { result } = renderHook(() =>
      useCanEditInitiative({ owner_user_id: 'user-1' }, 'team-1')
    );
    expect(result.current.canEdit).toBe(true);
  });

  it('denies edit when not owner, not contributor, not leader', () => {
    setup('user-9', false);
    const { result } = renderHook(() =>
      useCanEditInitiative(
        { owner_user_id: 'user-1', contributors: ['user-2'] },
        'team-1'
      )
    );
    expect(result.current.canEdit).toBe(false);
  });

  it('handles null contributors gracefully', () => {
    setup('user-2', false);
    const { result } = renderHook(() =>
      useCanEditInitiative({ owner_user_id: 'user-1', contributors: null }, 'team-1')
    );
    expect(result.current.canEdit).toBe(false);
  });

  it('propagates loading state from useCanManageTeamOkr', () => {
    setup('user-1', false, true);
    const { result } = renderHook(() =>
      useCanEditInitiative({ owner_user_id: 'user-9' }, 'team-1')
    );
    expect(result.current.isLoading).toBe(true);
  });

  it('handles missing krTeamId (passes undefined to useCanManageTeamOkr)', () => {
    setup('user-1', false);
    const { result } = renderHook(() =>
      useCanEditInitiative({ owner_user_id: 'user-1' }, null)
    );
    // Owner still wins
    expect(result.current.canEdit).toBe(true);
  });
});
