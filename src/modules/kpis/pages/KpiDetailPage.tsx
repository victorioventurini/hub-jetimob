/**
 * KpiDetailPage — Página dedicada para visualização de um KPI
 * 
 * Rota: /kpis/:kpiId
 * Usa HubLayout em todos os estados (loading, error, not found, success).
 */

import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { HubLayout } from '@/components/layout/HubLayout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useKpiDetail } from '@/modules/kpis/hooks';
import { KpiDetailContent } from '../components/KpiDetailContent';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function KpiDetailPage() {
  const { kpiId } = useParams<{ kpiId: string }>();
  const { kpi } = useKpiDetail(kpiId || '');

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
      <div className="space-y-4 max-w-3xl mx-auto">
        <Link to="/kpis">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Indicadores
          </Button>
        </Link>
        <KpiDetailContent kpiId={kpiId} />
      </div>
    </HubLayout>
  );
}
