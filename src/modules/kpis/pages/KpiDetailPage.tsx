/**
 * KpiDetailPage — Página dedicada para visualização de um KPI
 * 
 * Rota: /kpis/:kpiId
 * Usa HubLayout em todos os estados (loading, error, not found, success).
 */

import { useParams } from 'react-router-dom';
import { HubLayout } from '@/components/layout/HubLayout';
import { PageHeader } from '@/components/ui/page-header';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useKpiDetail } from '@/modules/kpis/hooks';
import { KpiDetailContent } from '../components/KpiDetailContent';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertCircle } from 'lucide-react';

export default function KpiDetailPage() {
  const { kpiId } = useParams<{ kpiId: string }>();
  const goBack = useSafeBack({ moduleRoot: '/kpis' });
  const { kpi, isLoading } = useKpiDetail(kpiId || '');

  usePageTitle(kpi?.name ?? 'Indicador', {
    customDescription: kpi?.description ?? undefined,
  });

  if (!kpiId) {
    return (
      <HubLayout>
        <EmptyState
          icon={AlertCircle}
          title="KPI não encontrado"
          description="O indicador solicitado não existe ou foi removido."
        />
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title={isLoading ? 'Carregando...' : (kpi?.name ?? 'Indicador')}
          onBack={goBack}
        />
        <KpiDetailContent kpiId={kpiId} />
      </div>
    </HubLayout>
  );
}
