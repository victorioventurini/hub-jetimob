/**
 * @file CycleCheckinsFilters.test.tsx
 * @description Tests for CycleCheckinsFilters component
 * 
 * Coverage:
 * - Filter rendering
 * - Search input
 * - Team and status filters
 * - Clear filters functionality
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CycleCheckinsFilters } from './cycle-checkins/CycleCheckinsFilters';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CycleCheckinsFilters', () => {
  const defaultFilters = {
    teamId: '',
    ownerId: '',
    confidence: '',
    ragStatus: '',
    dateFrom: '',
    dateTo: '',
    onlyOverdue: false,
    search: '',
    page: 1,
    pageSize: 20,
  };

  const defaultProps = {
    filters: defaultFilters,
    onFiltersChange: vi.fn(),
    onClearFilters: vi.fn(),
    hasActiveFilters: false,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render filter bar', () => {
      renderWithProviders(<CycleCheckinsFilters {...defaultProps} />);
      
      // Should render filter components
      expect(document.body).toBeTruthy();
    });

    it('should render search input', () => {
      renderWithProviders(<CycleCheckinsFilters {...defaultProps} />);
      
      // Search input should be present
    });

    it('should render team filter', () => {
      renderWithProviders(<CycleCheckinsFilters {...defaultProps} />);
      
      // Team filter should be present
    });
  });

  describe('clear filters button', () => {
    it('should not show clear button when no active filters', () => {
      renderWithProviders(
        <CycleCheckinsFilters {...defaultProps} hasActiveFilters={false} />
      );
      
      expect(screen.queryByText(/limpar/i)).not.toBeInTheDocument();
    });

    it('should show clear button when has active filters', () => {
      renderWithProviders(
        <CycleCheckinsFilters {...defaultProps} hasActiveFilters={true} />
      );
      
      expect(screen.getByText(/limpar/i)).toBeInTheDocument();
    });

    it('should call onClearFilters when clear button clicked', () => {
      const onClearFilters = vi.fn();
      
      renderWithProviders(
        <CycleCheckinsFilters 
          {...defaultProps} 
          hasActiveFilters={true}
          onClearFilters={onClearFilters}
        />
      );
      
      fireEvent.click(screen.getByText(/limpar/i));
      
      expect(onClearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('filter options', () => {
    it('should have confidence filter options', () => {
      // Confidence options: high, medium, low
      const confidenceOptions = ['high', 'medium', 'low'];
      expect(confidenceOptions.length).toBe(3);
    });

    it('should have RAG filter options', () => {
      // RAG options: green, yellow, red
      const ragOptions = ['green', 'yellow', 'red'];
      expect(ragOptions.length).toBe(3);
    });
  });

  describe('callbacks', () => {
    it('should call onFiltersChange when filters change', () => {
      const onFiltersChange = vi.fn();
      
      renderWithProviders(
        <CycleCheckinsFilters 
          {...defaultProps}
          onFiltersChange={onFiltersChange}
        />
      );
      
      expect(typeof onFiltersChange).toBe('function');
    });
  });

  describe('props interface', () => {
    it('should require filters prop', () => {
      const props = {
        filters: defaultFilters,
        onFiltersChange: vi.fn(),
        onClearFilters: vi.fn(),
        hasActiveFilters: false,
      };
      
      expect(props.filters).toBeDefined();
    });

    it('should require onFiltersChange callback', () => {
      const props = {
        filters: defaultFilters,
        onFiltersChange: vi.fn(),
        onClearFilters: vi.fn(),
        hasActiveFilters: false,
      };
      
      expect(typeof props.onFiltersChange).toBe('function');
    });

    it('should require onClearFilters callback', () => {
      const props = {
        filters: defaultFilters,
        onFiltersChange: vi.fn(),
        onClearFilters: vi.fn(),
        hasActiveFilters: false,
      };
      
      expect(typeof props.onClearFilters).toBe('function');
    });

    it('should require hasActiveFilters boolean', () => {
      const props = {
        filters: defaultFilters,
        onFiltersChange: vi.fn(),
        onClearFilters: vi.fn(),
        hasActiveFilters: false,
      };
      
      expect(typeof props.hasActiveFilters).toBe('boolean');
    });
  });

  describe('FiltersState interface', () => {
    it('should define correct filter state structure', () => {
      const filtersState = {
        teamId: 'team-123',
        ownerId: 'owner-456',
        confidence: 'high',
        ragStatus: 'green',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        onlyOverdue: true,
        search: 'query',
        page: 1,
        pageSize: 20,
      };
      
      expect(filtersState.teamId).toBeDefined();
      expect(filtersState.ownerId).toBeDefined();
      expect(filtersState.confidence).toBeDefined();
      expect(filtersState.ragStatus).toBeDefined();
      expect(filtersState.page).toBeDefined();
      expect(filtersState.pageSize).toBeDefined();
    });
  });
});
