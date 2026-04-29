import { Badge } from '@/components/ui/badge';
import { Settings2, Link2, BarChart3 } from 'lucide-react';
import { useEntityLookup, resolveName } from '@/modules/okrs/hooks/useEntityLookup';
import { ReportSection, EmptyState } from './shared';

/** Onda 4 Fase 2: KPI IDs resolvidos por nome via useEntityLookup. */
export function ManagersCheckinReport({ data }: { data: Record<string, any> }) {
  const adjustments = Array.isArray(data.adjustments) ? data.adjustments : [];
  const resolvedDependencies = Array.isArray(data.resolvedDependencies) ? data.resolvedDependencies : [];
  const kpisForFollowup: unknown[] = Array.isArray(data.kpisMarkedForFollowup) ? data.kpisMarkedForFollowup : [];

  const kpiIds = kpisForFollowup.filter((v): v is string => typeof v === 'string');
  const lookups = useEntityLookup({ kpiIds });

  const hasContent = adjustments.length > 0 || resolvedDependencies.length > 0 || kpisForFollowup.length > 0;

  if (!hasContent) return <EmptyState message="Nenhum dado registrado neste check-in de gestores." />;

  return (
    <div className="space-y-4">
      {adjustments.length > 0 && (
        <ReportSection title={`Ajustes registrados (${adjustments.length})`} icon={<Settings2 className="h-4 w-4" />}>
          <div className="space-y-2">
            {adjustments.map((a: any, i: number) => (
              <div key={i} className="p-2 rounded border text-sm">
                {typeof a === 'string' ? a : a.text || JSON.stringify(a)}
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {resolvedDependencies.length > 0 && (
        <ReportSection title={`Dependências resolvidas (${resolvedDependencies.length})`} icon={<Link2 className="h-4 w-4" />}>
          <div className="space-y-2">
            {resolvedDependencies.map((d: any, i: number) => (
              <div key={i} className="p-2 rounded border text-sm">
                {typeof d === 'string' ? d : d.description || JSON.stringify(d)}
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {kpisForFollowup.length > 0 && (
        <ReportSection title={`KPIs para acompanhamento (${kpisForFollowup.length})`} icon={<BarChart3 className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-2">
            {kpisForFollowup.map((id: unknown, i: number) => (
              <Badge key={i} variant="outline" className="text-xs">
                {typeof id === 'string' ? resolveName(lookups.kpis, id) : JSON.stringify(id)}
              </Badge>
            ))}
          </div>
        </ReportSection>
      )}
    </div>
  );
}
