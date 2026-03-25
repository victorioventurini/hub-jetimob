import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthContext, type AuthContextType } from '@/hooks/useAuth';
import { BuContext } from '@/contexts/BuContext';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Default mock auth context for tests.
 * Override via `renderWithProviders(ui, { authOverrides: { ... } })`.
 */
const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  profile: null,
  role: null,
  isLoading: false,
  isAdmin: false,
  signInWithMagicLink: async () => ({ error: null }),
  signOut: async () => {},
};

/**
 * Default mock BU context for tests.
 * Override via `renderWithProviders(ui, { buOverrides: { ... } })`.
 */
const defaultBuContext = {
  currentBuId: 'test-bu-id',
  currentBu: null,
  userBus: [],
  isLoading: false,
  hasMultipleBus: false,
  userRole: null,
  buSelected: true,
  isExternalUser: false,
  selectBu: () => {},
  switchBu: () => {},
  clearBuSelection: () => {},
};

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authOverrides?: Partial<AuthContextType>;
  buOverrides?: Partial<typeof defaultBuContext>;
}

interface AllProvidersProps {
  children: React.ReactNode;
}

function createAllProviders(options?: ExtendedRenderOptions) {
  const authValue = { ...defaultAuthContext, ...options?.authOverrides };
  const buValue = { ...defaultBuContext, ...options?.buOverrides };

  return function AllProviders({ children }: AllProvidersProps) {
    const queryClient = createTestQueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthContext.Provider value={authValue}>
            <BuContext.Provider value={buValue}>
              <BrowserRouter>
                {children}
              </BrowserRouter>
            </BuContext.Provider>
          </AuthContext.Provider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  };
}

/**
 * Custom render function that wraps components with all necessary providers:
 * QueryClient, TooltipProvider, AuthContext, BuContext, BrowserRouter.
 *
 * @example
 * // Default (unauthenticated)
 * const { getByText } = renderWithProviders(<MyComponent />);
 *
 * // Authenticated admin
 * renderWithProviders(<AdminPage />, {
 *   authOverrides: { isAdmin: true, role: 'admin', user: mockUser },
 *   buOverrides: { currentBuId: 'bu-123' },
 * });
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: ExtendedRenderOptions
) {
  const { authOverrides, buOverrides, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: createAllProviders({ authOverrides, buOverrides }),
    ...renderOptions,
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };
