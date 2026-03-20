/**
 * Tests for RequirePermission component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/components/ui/loading-state', () => ({
  LoadingState: ({ text }: { text?: string }) => <div data-testid="loading">{text}</div>,
}));

vi.mock('@/modules/vic/components/VicAccessDenied', () => ({
  VicAccessDenied: () => <div data-testid="access-denied">Acesso negado</div>,
}));

import { RequirePermission } from './RequirePermission';
import { usePermissions } from '@/hooks/usePermissions';

const mockUsePermissions = vi.mocked(usePermissions);

function setup(overrides: Partial<ReturnType<typeof usePermissions>> = {}) {
  mockUsePermissions.mockReturnValue({
    permissions: [],
    has: () => false,
    hasAny: () => false,
    hasAll: () => false,
    isWildcard: false,
    isLoading: false,
    isImpersonating: false,
    ...overrides,
  });
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('RequirePermission', () => {
  it('should show loading state while permissions load', () => {
    setup({ isLoading: true });
    renderWithRouter(
      <RequirePermission anyOf={['tickets.view']}>
        <span>Content</span>
      </RequirePermission>
    );
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should render children when user has permission', () => {
    setup({ hasAny: () => true });
    renderWithRouter(
      <RequirePermission anyOf={['tickets.view']}>
        <span>Protected Content</span>
      </RequirePermission>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should render children for wildcard user', () => {
    setup({ isWildcard: true });
    renderWithRouter(
      <RequirePermission anyOf={['any.permission']}>
        <span>Admin Content</span>
      </RequirePermission>
    );
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should show access denied when user lacks permission', () => {
    setup({ hasAny: () => false });
    renderWithRouter(
      <RequirePermission anyOf={['tickets.admin']}>
        <span>Content</span>
      </RequirePermission>
    );
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should redirect when redirectOnDeny is true', () => {
    setup({ hasAny: () => false });
    renderWithRouter(
      <RequirePermission anyOf={['tickets.admin']} redirectOnDeny fallbackRoute="/home">
        <span>Content</span>
      </RequirePermission>
    );
    // Navigate component renders nothing visible - just verify content is not shown
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });
});
