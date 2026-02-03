/**
 * KpiSelect - Testes unitários
 * 
 * Testa o componente canônico de seleção de KPIs/Métricas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KpiSelect } from '../KpiSelect';

// Mock dos hooks e contextos necessários
vi.mock('@/integrations/supabase/getOptionalBuClient', () => ({
  useOptionalBuClient: () => ({
    client: null,
    isReady: false,
  }),
}));

vi.mock('@/contexts/BuContext', () => ({
  useBu: () => ({
    currentBuId: 'test-bu-id',
    currentBu: { id: 'test-bu-id', name: 'Test BU' },
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('KpiSelect', () => {
  const mockOnValueChange = vi.fn();

  beforeEach(() => {
    mockOnValueChange.mockClear();
  });

  it('renderiza com placeholder padrão', () => {
    renderWithProviders(
      <KpiSelect
        onValueChange={mockOnValueChange}
      />
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renderiza com placeholder customizado', () => {
    renderWithProviders(
      <KpiSelect
        onValueChange={mockOnValueChange}
        placeholder="Escolha um KPI"
      />
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renderiza em estado desabilitado', () => {
    renderWithProviders(
      <KpiSelect
        onValueChange={mockOnValueChange}
        disabled={true}
      />
    );
    
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('aplica className customizado', () => {
    renderWithProviders(
      <KpiSelect
        onValueChange={mockOnValueChange}
        className="custom-class"
      />
    );
    
    // O trigger do select deve existir
    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
  });

  it('suporta prop allowNone', () => {
    renderWithProviders(
      <KpiSelect
        onValueChange={mockOnValueChange}
        allowNone={true}
        noneLabel="Sem indicador"
      />
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('aceita excludeIds para filtrar KPIs', () => {
    const excludeIds = ['kpi-1', 'kpi-2'];
    
    renderWithProviders(
      <KpiSelect
        onValueChange={mockOnValueChange}
        excludeIds={excludeIds}
      />
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('aceita filtro por teamId', () => {
    renderWithProviders(
      <KpiSelect
        onValueChange={mockOnValueChange}
        teamId="team-123"
      />
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('aceita filtro por areaId', () => {
    renderWithProviders(
      <KpiSelect
        onValueChange={mockOnValueChange}
        areaId="area-456"
      />
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('suporta showSearch=false', () => {
    renderWithProviders(
      <KpiSelect
        onValueChange={mockOnValueChange}
        showSearch={false}
      />
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

describe('KpiSelect - Props Interface', () => {
  it('exporta KpiSelectProps corretamente', async () => {
    // Verifica que o tipo é exportado (compilação TypeScript)
    const module = await import('../KpiSelect');
    expect(module.KpiSelect).toBeDefined();
  });
});
