/**
 * Tests for useCanEditKr hook.
 *
 * Permission rules (any one grants edit):
 * 1. Owner of the KR
 * 2. Co-responsible of the KR
 * 3. Leader of the team (or parent team)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@/test/test-utils';

vi.mock('@/hooks/useIdentity', () => ({
  useProfileId: vi.fn(),
}));

vi.mock('./useCanManageTeamOkr', () => ({
  useCanManageTeamOkr: vi.fn(),
}));

import { useCanEditKr } from './useCanEditKr';
import { useProfileId } from '@/hooks/useIdentity';
import { useCanManageTeamOkr } from './useCanManageTeamOkr';

const mockUseProfileId = vi.mocked(useProfileId);
const mockUseCanManageTeamOkr = vi.mocked(useCanManageTeamOkr);

function setup(profileId: string | null, canManage: boolean, isLoading = false) {
  mockUseProfileId.mockReturnValue(profileId);
  mockUseCanManageTeamOkr.mockReturnValue({ canManage, isLoading });
}

const baseKr = { team_id: 'team-1', owner_user_id: null, co_responsibles: null };

describe('useCanEditKr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns canEdit=false when kr is null', () => {
    setup('user-1', true);
    const { result } = renderHook(() => useCanEditKr(null));
    expect(result.current.canEdit).toBe(false);
  });

  it('returns canEdit=false when kr is undefined', () => {
    setup('user-1', true);
    const { result } = renderHook(() => useCanEditKr(undefined));
    expect(result.current.canEdit).toBe(false);
  });

  it('returns canEdit=false when profileId is null', () => {
    setup(null, true);
    const { result } = renderHook(() => useCanEditKr({ ...baseKr, owner_user_id: 'user-1' }));
    expect(result.current.canEdit).toBe(false);
  });

  it('grants edit when user is owner', () => {
    setup('user-1', false);
    const { result } = renderHook(() => useCanEditKr({ ...baseKr, owner_user_id: 'user-1' }));
    expect(result.current.canEdit).toBe(true);
  });

  it('grants edit when user is co-responsible', () => {
    setup('user-2', false);
    const { result } = renderHook(() =>
      useCanEditKr({ ...baseKr, owner_user_id: 'user-1', co_responsibles: ['user-2', 'user-3'] })
    );
    expect(result.current.canEdit).toBe(true);
  });

  it('grants edit when user is team leader (canManage=true)', () => {
    setup('user-99', true);
    const { result } = renderHook(() => useCanEditKr({ ...baseKr, owner_user_id: 'user-1' }));
    expect(result.current.canEdit).toBe(true);
  });

  it('denies edit when user is neither owner, co-responsible, nor leader', () => {
    setup('user-99', false);
    const { result } = renderHook(() =>
      useCanEditKr({ ...baseKr, owner_user_id: 'user-1', co_responsibles: ['user-2'] })
    );
    expect(result.current.canEdit).toBe(false);
  });

  it('handles null co_responsibles gracefully', () => {
    setup('user-99', false);
    const { result } = renderHook(() =>
      useCanEditKr({ ...baseKr, owner_user_id: 'user-1', co_responsibles: null })
    );
    expect(result.current.canEdit).toBe(false);
  });

  it('handles empty co_responsibles array', () => {
    setup('user-99', false);
    const { result } = renderHook(() =>
      useCanEditKr({ ...baseKr, owner_user_id: 'user-1', co_responsibles: [] })
    );
    expect(result.current.canEdit).toBe(false);
  });

  it('propagates isLoading from useCanManageTeamOkr', () => {
    setup('user-1', false, true);
    const { result } = renderHook(() => useCanEditKr({ ...baseKr, owner_user_id: 'user-1' }));
    expect(result.current.isLoading).toBe(true);
  });
});
