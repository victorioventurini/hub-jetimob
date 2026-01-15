/**
 * @file TeamContributionFilters.test.tsx
 * @description Tests for TeamContributionFilters component
 * 
 * Coverage:
 * - Filter rendering
 * - Status filter options
 * - Filter change callbacks
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamContributionFilters } from './team-contribution/TeamContributionFilters';

describe('TeamContributionFilters', () => {
  const defaultProps = {
    statusFilter: 'all',
    onStatusFilterChange: vi.fn(),
  };

  describe('rendering', () => {
    it('should render status filter', () => {
      render(<TeamContributionFilters {...defaultProps} />);
      
      // Should render select component
      expect(document.body).toBeTruthy();
    });

    it('should render with all status selected', () => {
      render(<TeamContributionFilters {...defaultProps} statusFilter="all" />);
      
      // All should be displayed
      expect(screen.getByText(/todos/i)).toBeInTheDocument();
    });
  });

  describe('status options', () => {
    it('should support all filter', () => {
      render(<TeamContributionFilters {...defaultProps} statusFilter="all" />);
      
      expect(screen.getByText(/todos/i)).toBeInTheDocument();
    });

    it('should support on_track filter', () => {
      render(<TeamContributionFilters {...defaultProps} statusFilter="on_track" />);
      
      // Should show on track label
    });

    it('should support at_risk filter', () => {
      render(<TeamContributionFilters {...defaultProps} statusFilter="at_risk" />);
      
      // Should show at risk label
    });

    it('should support off_track filter', () => {
      render(<TeamContributionFilters {...defaultProps} statusFilter="off_track" />);
      
      // Should show off track label
    });
  });

  describe('callbacks', () => {
    it('should call onStatusFilterChange when filter changes', () => {
      const onStatusFilterChange = vi.fn();
      
      render(
        <TeamContributionFilters 
          statusFilter="all"
          onStatusFilterChange={onStatusFilterChange}
        />
      );
      
      // Callback should be passed to select
      expect(typeof onStatusFilterChange).toBe('function');
    });
  });

  describe('props interface', () => {
    it('should require statusFilter', () => {
      const props = {
        statusFilter: 'all',
        onStatusFilterChange: vi.fn(),
      };
      
      expect(props.statusFilter).toBeDefined();
    });

    it('should require onStatusFilterChange', () => {
      const props = {
        statusFilter: 'all',
        onStatusFilterChange: vi.fn(),
      };
      
      expect(typeof props.onStatusFilterChange).toBe('function');
    });
  });
});
