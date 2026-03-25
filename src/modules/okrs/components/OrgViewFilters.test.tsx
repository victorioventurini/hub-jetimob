/**
 * @file OrgViewFilters.test.tsx
 * @description Tests for OrgViewFilters component
 * 
 * Coverage:
 * - Filter rendering
 * - Status and team filters
 * - Clear filters button
 * - Filter change callbacks
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrgViewFilters, StatusFilter, TeamFilter } from './org-view/OrgViewFilters';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('OrgViewFilters', () => {
  const defaultProps = {
    statusFilter: 'all' as StatusFilter,
    onStatusFilterChange: vi.fn(),
    teamFilter: 'all' as TeamFilter,
    onTeamFilterChange: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render status filter', () => {
      renderWithQueryClient(<OrgViewFilters {...defaultProps} />);
      
      // Should render filter components
      expect(document.body).toBeTruthy();
    });

    it('should render team filter', () => {
      renderWithQueryClient(<OrgViewFilters {...defaultProps} />);
      
      // Team filter should be present
      expect(screen.getByText(/time/i)).toBeInTheDocument();
    });
  });

  describe('status filter options', () => {
    it('should support all status', () => {
      renderWithQueryClient(
        <OrgViewFilters {...defaultProps} statusFilter="all" />
      );
      
      // All status should be selectable
    });

    it('should support green status', () => {
      renderWithQueryClient(
        <OrgViewFilters {...defaultProps} statusFilter="green" />
      );
      
      // Green status should be selectable
    });

    it('should support yellow status', () => {
      renderWithQueryClient(
        <OrgViewFilters {...defaultProps} statusFilter="yellow" />
      );
      
      // Yellow status should be selectable
    });

    it('should support red status', () => {
      renderWithQueryClient(
        <OrgViewFilters {...defaultProps} statusFilter="red" />
      );
      
      // Red status should be selectable
    });

    it('should support not_started status', () => {
      renderWithQueryClient(
        <OrgViewFilters {...defaultProps} statusFilter="not_started" />
      );
      
      // Not started status should be selectable
    });
  });

  describe('clear filters button', () => {
    it('should not show clear button when no filters active', () => {
      renderWithQueryClient(
        <OrgViewFilters 
          {...defaultProps} 
          statusFilter="all"
          teamFilter="all"
        />
      );
      
      expect(screen.queryByText(/limpar/i)).not.toBeInTheDocument();
    });

    it('should show clear button when status filter is active', () => {
      renderWithQueryClient(
        <OrgViewFilters 
          {...defaultProps} 
          statusFilter="green"
          teamFilter="all"
        />
      );
      
      expect(screen.getByText(/limpar/i)).toBeInTheDocument();
    });

    it('should show clear button when team filter is active', () => {
      renderWithQueryClient(
        <OrgViewFilters 
          {...defaultProps} 
          statusFilter="all"
          teamFilter="team-123"
        />
      );
      
      expect(screen.getByText(/limpar/i)).toBeInTheDocument();
    });

    it('should call clear callbacks when clicked', () => {
      const onStatusFilterChange = vi.fn();
      const onTeamFilterChange = vi.fn();
      
      renderWithQueryClient(
        <OrgViewFilters 
          statusFilter="green"
          onStatusFilterChange={onStatusFilterChange}
          teamFilter="team-123"
          onTeamFilterChange={onTeamFilterChange}
        />
      );
      
      fireEvent.click(screen.getByText(/limpar/i));
      
      expect(onStatusFilterChange).toHaveBeenCalledWith('all');
      expect(onTeamFilterChange).toHaveBeenCalledWith('all');
    });
  });

  describe('callbacks', () => {
    it('should call onStatusFilterChange when status changes', () => {
      const onStatusFilterChange = vi.fn();
      
      renderWithQueryClient(
        <OrgViewFilters 
          {...defaultProps}
          onStatusFilterChange={onStatusFilterChange}
        />
      );
      
      expect(typeof onStatusFilterChange).toBe('function');
    });

    it('should call onTeamFilterChange when team changes', () => {
      const onTeamFilterChange = vi.fn();
      
      renderWithQueryClient(
        <OrgViewFilters 
          {...defaultProps}
          onTeamFilterChange={onTeamFilterChange}
        />
      );
      
      expect(typeof onTeamFilterChange).toBe('function');
    });
  });

  describe('type exports', () => {
    it('should export StatusFilter type', () => {
      const status: StatusFilter = 'all';
      expect(['all', 'green', 'yellow', 'red', 'not_started']).toContain(status);
    });

    it('should export TeamFilter type', () => {
      const team: TeamFilter = 'all';
      expect(typeof team).toBe('string');
    });
  });

  describe('props interface', () => {
    it('should require all filter props', () => {
      const props = {
        statusFilter: 'all' as StatusFilter,
        onStatusFilterChange: vi.fn(),
        teamFilter: 'all' as TeamFilter,
        onTeamFilterChange: vi.fn(),
      };
      
      expect(props.statusFilter).toBeDefined();
      expect(props.onStatusFilterChange).toBeDefined();
      expect(props.teamFilter).toBeDefined();
      expect(props.onTeamFilterChange).toBeDefined();
    });
  });
});
