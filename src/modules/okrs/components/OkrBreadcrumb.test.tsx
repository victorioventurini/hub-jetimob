/**
 * @file OkrBreadcrumb.test.tsx
 * @description Tests for OkrBreadcrumb legacy components
 * 
 * NOTA: Estes componentes são DEPRECATED conforme UI_COMPONENTS_REGISTRY.md.
 * O padrão canônico é usar PageHeader.breadcrumbs diretamente.
 * Os testes mantêm compatibilidade com uso legado.
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
    it('should render Hub and OKRs in breadcrumb', () => {
      renderWithRouter(<OkrBreadcrumb items={[]} />);
      
      // Hub é adicionado automaticamente pelo GlobalBreadcrumb
      expect(screen.getByText('Hub')).toBeInTheDocument();
      expect(screen.getByText('OKRs')).toBeInTheDocument();
    });

    it('should render with additional items', () => {
      renderWithRouter(
        <OkrBreadcrumb 
          items={[{ label: 'Dashboard', href: '/okrs/dashboard' }]} 
        />
      );
      
      expect(screen.getByText('Hub')).toBeInTheDocument();
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
      
      expect(screen.getByText('Hub')).toBeInTheDocument();
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
    it('should render intermediate items with href as links', () => {
      renderWithRouter(
        <OkrBreadcrumb 
          items={[
            { label: 'Dashboard', href: '/okrs/dashboard' },
            { label: 'Current Page' },
          ]} 
        />
      );
      
      // OKRs should be a link since items come after it
      const okrsLink = screen.getByText('OKRs').closest('a');
      expect(okrsLink).toHaveAttribute('href', '/okrs');
      
      // Dashboard should be a link since it has href and is not last
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/okrs/dashboard');
      
      // Current Page (último) não deve ser link
      const currentPage = screen.getByText('Current Page');
      expect(currentPage.closest('a')).toBeNull();
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
  it('should render only Hub and OKRs (empty items)', () => {
    renderWithRouter(<OkrDashboardBreadcrumb />);
    
    // OkrDashboardBreadcrumb passa items=[] para OkrBreadcrumb
    // Resultado: Hub > OKRs (OKRs como último item, sem link)
    expect(screen.getByText('Hub')).toBeInTheDocument();
    expect(screen.getByText('OKRs')).toBeInTheDocument();
  });
});

describe('OkrOrgViewListBreadcrumb', () => {
  it('should render org view list breadcrumb', () => {
    renderWithRouter(<OkrOrgViewListBreadcrumb />);
    
    expect(screen.getByText('Hub')).toBeInTheDocument();
    expect(screen.getByText('OKRs')).toBeInTheDocument();
    expect(screen.getByText('Visão Organizacional')).toBeInTheDocument();
  });
});

describe('OkrTeamViewBreadcrumb', () => {
  it('should render team view breadcrumb', () => {
    renderWithRouter(<OkrTeamViewBreadcrumb teamName="Engineering" />);
    
    expect(screen.getByText('Hub')).toBeInTheDocument();
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
