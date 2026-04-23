/**
 * Tests for PermissionGuard component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock usePermissions before importing the component
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

import { PermissionGuard } from './PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const mockUsePermissions = vi.mocked(usePermissions);

function setupPermissions(overrides: Partial<ReturnType<typeof usePermissions>> = {}) {
  const perms = overrides.permissions ?? [];
  mockUsePermissions.mockReturnValue({
    permissions: perms,
    has: (key: string) => overrides.isWildcard || perms.includes(key),
    hasAny: (keys: string[]) => overrides.isWildcard || keys.some(k => perms.includes(k)),
    hasAll: (keys: string[]) => overrides.isWildcard || keys.every(k => perms.includes(k)),
    isWildcard: false,
    isLoading: false,
    isImpersonating: false,
    ...overrides,
  } as any);
}

describe('PermissionGuard', () => {
  it('renders fallback while loading', () => {
    setupPermissions({ isLoading: true });
    render(
      <PermissionGuard permission="x.y" fallback={<span>fb</span>}>
        <span>secret</span>
      </PermissionGuard>
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.getByText('fb')).toBeInTheDocument();
  });

  it('renders children for wildcard regardless of permission', () => {
    setupPermissions({ isWildcard: true });
    render(
      <PermissionGuard permission="non.existent">
        <span>secret</span>
      </PermissionGuard>
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('renders children when single permission matches', () => {
    setupPermissions({ permissions: ['okrs.team_objective.cancel:team'] });
    render(
      <PermissionGuard permission="okrs.team_objective.cancel:team">
        <span>secret</span>
      </PermissionGuard>
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('renders fallback when single permission missing', () => {
    setupPermissions({ permissions: ['okrs.view'] });
    render(
      <PermissionGuard permission="okrs.manage" fallback={<span>denied</span>}>
        <span>secret</span>
      </PermissionGuard>
    );
    expect(screen.getByText('denied')).toBeInTheDocument();
  });

  it('renders children when ANY of anyOf permissions match', () => {
    setupPermissions({ permissions: ['okrs.view'] });
    render(
      <PermissionGuard anyOf={['okrs.manage', 'okrs.view']}>
        <span>secret</span>
      </PermissionGuard>
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('renders fallback when NONE of anyOf permissions match', () => {
    setupPermissions({ permissions: ['other.perm'] });
    render(
      <PermissionGuard anyOf={['okrs.manage', 'okrs.view']} fallback={<span>denied</span>}>
        <span>secret</span>
      </PermissionGuard>
    );
    expect(screen.getByText('denied')).toBeInTheDocument();
  });

  it('renders children when ALL allOf permissions match', () => {
    setupPermissions({ permissions: ['a', 'b', 'c'] });
    render(
      <PermissionGuard allOf={['a', 'b']}>
        <span>secret</span>
      </PermissionGuard>
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('renders fallback when allOf is missing one permission', () => {
    setupPermissions({ permissions: ['a'] });
    render(
      <PermissionGuard allOf={['a', 'b']} fallback={<span>denied</span>}>
        <span>secret</span>
      </PermissionGuard>
    );
    expect(screen.getByText('denied')).toBeInTheDocument();
  });

  it('renders children when no permission props are provided (open guard)', () => {
    setupPermissions({});
    render(
      <PermissionGuard>
        <span>secret</span>
      </PermissionGuard>
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('combines permission + anyOf — both must pass', () => {
    setupPermissions({ permissions: ['x'] });
    render(
      <PermissionGuard permission="x" anyOf={['y', 'z']} fallback={<span>denied</span>}>
        <span>secret</span>
      </PermissionGuard>
    );
    expect(screen.getByText('denied')).toBeInTheDocument();
  });
});
