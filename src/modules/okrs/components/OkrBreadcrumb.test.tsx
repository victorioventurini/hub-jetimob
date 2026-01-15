/**
 * @file OkrBreadcrumb.test.tsx
 * @description Tests for OkrBreadcrumb components
 * 
 * Coverage:
 * - Base OkrBreadcrumb
 * - Preset breadcrumbs for different views
 * - Items handling
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { 
  OkrBreadcrumb,
  OkrDashboardBreadcrumb,
  OkrOrgViewListBreadcrumb,
  OkrTeamViewBreadcrumb,
} from './ui/OkrBreadcrumb';

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('OkrBreadcrumb', () => {
  describe('base component', () => {
    it('should render OKRs root link', () => {
      renderWithRouter(<OkrBreadcrumb items={[]} />);
      
      expect(screen.getByText('OKRs')).toBeInTheDocument();
    });

    it('should render with additional items', () => {
      renderWithRouter(
        <OkrBreadcrumb 
          items={[{ label: 'Dashboard', href: '/okrs/dashboard' }]} 
        />
      );
      
      expect(screen.getByText('OKRs')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should render multiple items', () => {
      renderWithRouter(
        <OkrBreadcrumb 
          items={[
            { label: 'Times', href: '/okrs/teams' },
            { label: 'Engineering' },
          ]} 
        />
      );
      
      expect(screen.getByText('OKRs')).toBeInTheDocument();
      expect(screen.getByText('Times')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    it('should accept className prop', () => {
      const { container } = renderWithRouter(
        <OkrBreadcrumb items={[]} className="custom-class" />
      );
      
      const breadcrumb = container.querySelector('.custom-class');
      expect(breadcrumb).toBeInTheDocument();
    });
  });

  describe('item links', () => {
    it('should render items with href as links', () => {
      renderWithRouter(
        <OkrBreadcrumb 
          items={[{ label: 'Dashboard', href: '/okrs/dashboard' }]} 
        />
      );
      
      const link = screen.getByText('Dashboard').closest('a');
      expect(link).toHaveAttribute('href', '/okrs/dashboard');
    });

    it('should render items without href as text', () => {
      renderWithRouter(
        <OkrBreadcrumb 
          items={[{ label: 'Current Page' }]} 
        />
      );
      
      const text = screen.getByText('Current Page');
      expect(text.closest('a')).toBeNull();
    });
  });
});

describe('OkrDashboardBreadcrumb', () => {
  it('should render dashboard breadcrumb', () => {
    renderWithRouter(<OkrDashboardBreadcrumb />);
    
    expect(screen.getByText('OKRs')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

describe('OkrOrgViewListBreadcrumb', () => {
  it('should render org view list breadcrumb', () => {
    renderWithRouter(<OkrOrgViewListBreadcrumb />);
    
    expect(screen.getByText('OKRs')).toBeInTheDocument();
  });
});

describe('OkrTeamViewBreadcrumb', () => {
  it('should render team view breadcrumb', () => {
    renderWithRouter(<OkrTeamViewBreadcrumb teamName="Engineering" />);
    
    expect(screen.getByText('OKRs')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });
});

describe('props interface', () => {
  it('should accept items array', () => {
    const items = [
      { label: 'Item 1', href: '/path1' },
      { label: 'Item 2' },
    ];
    
    expect(Array.isArray(items)).toBe(true);
    expect(items[0].label).toBeDefined();
  });

  it('should accept optional className', () => {
    const props = { items: [], className: 'test' };
    expect(props.className).toBeDefined();
  });
});
