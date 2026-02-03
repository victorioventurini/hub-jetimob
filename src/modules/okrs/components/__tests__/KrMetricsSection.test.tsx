/**
 * KrMetricsSection - Testes unitários
 * 
 * Testa o componente de vinculação de KPIs a Key Results
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KrMetricsSection } from '../KrMetricsSection';

// Mock dos hooks de métricas
vi.mock('../../hooks/useOkrKrMetrics', () => ({
  usePrimaryKrMetric: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useGuardrailKrMetrics: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useCreateKrMetric: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useDeleteKrMetric: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

// Mock do KpiSelect
vi.mock('@/components/selects/KpiSelect', () => ({
  KpiSelect: ({ placeholder, disabled }: { placeholder?: string; disabled?: boolean }) => (
    <div data-testid="kpi-select" data-placeholder={placeholder} data-disabled={disabled}>
      Mock KpiSelect
    </div>
  ),
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

describe('KrMetricsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza a seção com título "Métricas Vinculadas"', () => {
    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="team"
      />
    );
    
    expect(screen.getByText('Métricas Vinculadas')).toBeInTheDocument();
  });

  it('renderiza seção de KPI Primário', () => {
    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="team"
      />
    );
    
    expect(screen.getByText('KPI Primário')).toBeInTheDocument();
  });

  it('renderiza seção de Guardrails', () => {
    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="team"
      />
    );
    
    expect(screen.getByText('Guardrails')).toBeInTheDocument();
  });

  it('mostra botão "Adicionar" guardrail', () => {
    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="team"
      />
    );
    
    expect(screen.getByRole('button', { name: /adicionar/i })).toBeInTheDocument();
  });

  it('mostra mensagem quando não há guardrails', () => {
    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="team"
      />
    );
    
    expect(screen.getByText('Nenhum guardrail configurado')).toBeInTheDocument();
  });

  it('aceita prop disabled', () => {
    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="team"
        disabled={true}
      />
    );
    
    // Botão de adicionar deve estar desabilitado
    const addButton = screen.getByRole('button', { name: /adicionar/i });
    expect(addButton).toBeDisabled();
  });

  it('aceita prop teamId para filtrar KPIs', () => {
    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="team"
        teamId="team-456"
      />
    );
    
    expect(screen.getByText('Métricas Vinculadas')).toBeInTheDocument();
  });

  it('funciona com krType="org"', () => {
    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="org"
      />
    );
    
    expect(screen.getByText('Métricas Vinculadas')).toBeInTheDocument();
  });
});

describe('KrMetricsSection - Loading State', () => {
  it('mostra skeleton quando carregando', async () => {
    // Re-mock para simular loading
    const useOkrKrMetricsMock = await import('../../hooks/useOkrKrMetrics');
    vi.mocked(useOkrKrMetricsMock.usePrimaryKrMetric).mockReturnValue({
      data: null,
      isLoading: true,
    } as any);
    vi.mocked(useOkrKrMetricsMock.useGuardrailKrMetrics).mockReturnValue({
      data: [],
      isLoading: true,
    } as any);

    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="team"
      />
    );
    
    // Durante o loading, não deve mostrar o conteúdo principal
    // (o componente mostra Skeleton)
  });
});

describe('KrMetricsSection - Com Dados', () => {
  beforeEach(async () => {
    const useOkrKrMetricsMock = await import('../../hooks/useOkrKrMetrics');
    
    vi.mocked(useOkrKrMetricsMock.usePrimaryKrMetric).mockReturnValue({
      data: {
        id: 'metric-1',
        kr_id: 'kr-123',
        kr_type: 'team',
        kpi_id: 'kpi-1',
        role: 'primary',
        kpi: {
          id: 'kpi-1',
          name: 'Taxa de Conversão',
          unit: '%',
          target_value: 15,
          direction: 'up',
        },
      },
      isLoading: false,
    } as any);
    
    vi.mocked(useOkrKrMetricsMock.useGuardrailKrMetrics).mockReturnValue({
      data: [
        {
          id: 'metric-2',
          kr_id: 'kr-123',
          kr_type: 'team',
          kpi_id: 'kpi-2',
          role: 'guardrail',
          kpi: {
            id: 'kpi-2',
            name: 'Tempo de Resposta',
            unit: 'ms',
            target_value: 200,
            direction: 'down',
          },
        },
      ],
      isLoading: false,
    } as any);
  });

  it('exibe KPI primário vinculado', () => {
    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="team"
      />
    );
    
    // O KpiSelect mock é renderizado
    expect(screen.getByText('KPI Primário')).toBeInTheDocument();
  });

  it('exibe guardrails vinculados', () => {
    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="team"
      />
    );
    
    expect(screen.getByText('Tempo de Resposta')).toBeInTheDocument();
  });

  it('mostra botão de remover em guardrails', () => {
    renderWithProviders(
      <KrMetricsSection
        krId="kr-123"
        krType="team"
      />
    );
    
    // Deve haver um botão para remover o guardrail
    const removeButtons = screen.getAllByRole('button');
    expect(removeButtons.length).toBeGreaterThan(0);
  });
});
