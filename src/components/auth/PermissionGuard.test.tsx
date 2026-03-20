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
  mockUsePermissions.mockReturnValue({
    permissions: [],
    has: (key: string) => overrides.permissions?.includes(key) ?? false,
    hasAny: (keys: string[]) => keys.some(k => overrides.permissions?.includes(k)),
    hasAll: (keys: string[]) => keys.every(k => overrides.permissions?.includes(k)),
    isWildcard: false,
    isLoading: false,
    isImpersonating: false,
    ...overrides,
  });
}

describe('PermissionGuard', () => {
  it('should render children when user has single permission', () => {
    setupPermissions({ permissions: ['tickets.view'], has: () => true });
    render(
      <PermissionGuard permission="tickets.view">
        <span>Content</span>
      </PermissionGuard>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render fallback when user lacks permission', () => {
    setupPermissions({ has: () => false });
    render(
      <PermissionGuard permission="tickets.admin" fallback={<span>No access</span>}>
        <span>Content</span>
      </PermissionGuard>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.getByText('No access')).toBeInTheDocument();
  });

  it('should render null fallback by default', () => {
    setupPermissions({ has: () => false });
    const { container } = render(
      <PermissionGuard permission="tickets.admin">
        <span>Content</span>
      </PermissionGuard>
    );
    expect(container.textContent).toBe('');
  });

  it('should render children when isWildcard (admin)', () => {
    setupPermissions({ isWildcard: true });
    render(
      <PermissionGuard permission="any.permission">
        <span>Admin Content</span>
      </PermissionGuard>
    );
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should render fallback during loading', () => {
    setupPermissions({ isLoading: true });
    const { container } = render(
      <PermissionGuard permission="tickets.view">
        <span>Content</span>
      </PermissionGuard>
    );
    expect(container.textContent).toBe('');
  });

  it('should support anyOf - passes when one matches', () => {
    setupPermissions({ hasAny: (keys: string[]) => keys.includes('tickets.view') });
    render(
      <PermissionGuard anyOf={['tickets.view', 'tickets.admin']}>
        <span>Content</span>
      </PermissionGuard>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should support anyOf - fails when none match', () => {
    setupPermissions({ hasAny: () => false });
    render(
      <PermissionGuard anyOf={['tickets.admin', 'tickets.delete']}>
        <span>Content</span>
      </PermissionGuard>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should support allOf - passes when all match', () => {
    setupPermissions({ hasAll: () => true });
    render(
      <PermissionGuard allOf={['tickets.view', 'tickets.edit']}>
        <span>Content</span>
      </PermissionGuard>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should support allOf - fails when one missing', () => {
    setupPermissions({ hasAll: () => false });
    render(
      <PermissionGuard allOf={['tickets.view', 'tickets.admin']}>
        <span>Content</span>
      </PermissionGuard>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should render children when no permission props provided', () => {
    setupPermissions({});
    render(
      <PermissionGuard>
        <span>Open Content</span>
      </PermissionGuard>
    );
    expect(screen.getByText('Open Content')).toBeInTheDocument();
  });
});
