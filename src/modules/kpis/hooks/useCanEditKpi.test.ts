/**
 * Tests for useCanEditKpi hook.
 *
 * Validates v3.9.0 metadata edit + value update hierarchy:
 * - canEdit: who can edit metadata (name, target, scope)
 * - canUpdateValues: who can post check-ins / values
 *
 * Mocks Supabase queries for contributors and led areas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@/test/test-utils';

vi.mock('@/hooks/useIdentity', () => ({
  useProfileId: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/hooks/useTeamManagement', () => ({
  useTeamManagement: vi.fn(),
}));

vi.mock('@/integrations/supabase/getOptionalBuClient', () => ({
  useOptionalBuClient: vi.fn(),
}));

import { useCanEditKpi } from './useCanEditKpi';
import { useProfileId } from '@/hooks/useIdentity';
import { usePermissions } from '@/hooks/usePermissions';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';

const mockUseProfileId = vi.mocked(useProfileId);
const mockUsePermissions = vi.mocked(usePermissions);
const mockUseTeamManagement = vi.mocked(useTeamManagement);
const mockUseOptionalBuClient = vi.mocked(useOptionalBuClient);

/**
 * Builds a chainable Supabase query mock that resolves with the given data.
 */
function buildClientMock(opts: { contributors?: string[]; ledAreas?: string[] } = {}) {
  const contributorRows = (opts.contributors ?? []).map(id => ({ contributor_user_id: id }));
  const areaRows = (opts.ledAreas ?? []).map(id => ({ id }));

  const fromMock = vi.fn((table: string) => {
    if (table === 'kpi_data_contributors') {
      return {
        select: () => ({
          eq: () => ({
            is: () => Promise.resolve({ data: contributorRows, error: null }),
          }),
        }),
      };
    }
    if (table === 'areas') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => Promise.resolve({ data: areaRows, error: null }),
            }),
          }),
        }),
      };
    }
    return {
      select: () => ({ eq: () => ({ is: () => Promise.resolve({ data: [], error: null }) }) }),
    };
  });

  return { from: fromMock } as any;
}

function setup(opts: {
  profileId?: string | null;
  isWildcard?: boolean;
  permissions?: string[];
  manageableTeamIds?: string[];
  contributors?: string[];
  ledAreas?: string[];
  isReady?: boolean;
} = {}) {
  mockUseProfileId.mockReturnValue(opts.profileId ?? 'me-1');
  const perms = opts.permissions ?? [];
  mockUsePermissions.mockReturnValue({
    permissions: perms,
    has: (k: string) => opts.isWildcard || perms.includes(k),
    hasAny: () => false,
    hasAll: () => false,
    isWildcard: opts.isWildcard ?? false,
    isLoading: false,
    isImpersonating: false,
  });
  const manageable = opts.manageableTeamIds ?? [];
  mockUseTeamManagement.mockReturnValue({
    manageableTeamIds: manageable,
    canManageTeam: (id: string) => manageable.includes(id),
    isLoading: false,
  } as any);
  mockUseOptionalBuClient.mockReturnValue({
    client: buildClientMock({ contributors: opts.contributors, ledAreas: opts.ledAreas }),
    isReady: opts.isReady ?? true,
    buId: 'bu-1',
  } as any);
}

describe('useCanEditKpi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false everywhere when kpi is null', async () => {
    setup({});
    const { result } = renderHook(() => useCanEditKpi(null));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canUpdateValues).toBe(false);
  });

  it('returns false when profileId is null', async () => {
    setup({ profileId: null, isWildcard: true });
    const { result } = renderHook(() =>
      useCanEditKpi({ id: 'k1', bu_id: 'bu-1', scope: 'team', team_id: 't1' })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(false);
  });

  it('grants both canEdit and canUpdateValues for wildcard admin', async () => {
    setup({ isWildcard: true });
    const { result } = renderHook(() =>
      useCanEditKpi({ id: 'k1', bu_id: 'bu-1', scope: 'org' })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(true);
    expect(result.current.canUpdateValues).toBe(true);
  });

  it('grants canEdit with kpis.settings.manage:bu permission', async () => {
    setup({ permissions: ['kpis.settings.manage:bu'] });
    const { result } = renderHook(() =>
      useCanEditKpi({ id: 'k1', bu_id: 'bu-1', scope: 'area' })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(true);
  });

  it('denies non-admin from editing org-scoped KPI', async () => {
    setup({ manageableTeamIds: ['t1'] });
    const { result } = renderHook(() =>
      useCanEditKpi({ id: 'k1', bu_id: 'bu-1', scope: 'org' })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(false);
  });

  it('denies non-admin from editing area-scoped KPI', async () => {
    setup({ manageableTeamIds: ['t1'] });
    const { result } = renderHook(() =>
      useCanEditKpi({ id: 'k1', bu_id: 'bu-1', scope: 'area', area_id: 'a1' })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(false);
  });

  it('grants canEdit to team leader for team-scoped KPI', async () => {
    setup({ manageableTeamIds: ['t1'] });
    const { result } = renderHook(() =>
      useCanEditKpi({ id: 'k1', bu_id: 'bu-1', scope: 'team', team_id: 't1' })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(true);
  });

  it('grants canEdit to KPI owner (team scope)', async () => {
    setup({ profileId: 'me-1' });
    const { result } = renderHook(() =>
      useCanEditKpi({ id: 'k1', bu_id: 'bu-1', scope: 'team', team_id: 't-other', owner_user_id: 'me-1' })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(true);
  });

  it('grants canUpdateValues to area leader (area_id matches led areas)', async () => {
    setup({ ledAreas: ['a1'] });
    const { result } = renderHook(() =>
      useCanEditKpi({ id: 'k1', bu_id: 'bu-1', scope: 'area', area_id: 'a1' })
    );
    await waitFor(() => expect(result.current.canUpdateValues).toBe(true));
    // Area leader cannot edit metadata (only admin can for area scope)
    expect(result.current.canEdit).toBe(false);
  });

  it('grants canUpdateValues to team leader via responsible_team_id', async () => {
    setup({ manageableTeamIds: ['rt-1'] });
    const { result } = renderHook(() =>
      useCanEditKpi({
        id: 'k1',
        bu_id: 'bu-1',
        scope: 'org',
        responsible_team_id: 'rt-1',
      })
    );
    await waitFor(() => expect(result.current.canUpdateValues).toBe(true));
    expect(result.current.canEdit).toBe(false);
  });

  it('grants canUpdateValues to contributors', async () => {
    setup({ profileId: 'me-1', contributors: ['me-1', 'other'] });
    const { result } = renderHook(() =>
      useCanEditKpi({ id: 'k1', bu_id: 'bu-1', scope: 'org' })
    );
    await waitFor(() => expect(result.current.canUpdateValues).toBe(true));
  });

  it('denies all to plain collaborator with no relationships', async () => {
    setup({ profileId: 'me-1' });
    const { result } = renderHook(() =>
      useCanEditKpi({
        id: 'k1',
        bu_id: 'bu-1',
        scope: 'team',
        team_id: 't-other',
        owner_user_id: 'someone-else',
      })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canUpdateValues).toBe(false);
  });

  it('reports loading when client is not ready', () => {
    setup({ isReady: false });
    const { result } = renderHook(() =>
      useCanEditKpi({ id: 'k1', bu_id: 'bu-1', scope: 'team', team_id: 't1' })
    );
    expect(result.current.isLoading).toBe(true);
  });
});
