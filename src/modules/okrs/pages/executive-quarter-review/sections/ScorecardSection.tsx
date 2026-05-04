import { Badge } from '@/components/ui/badge';
import { MetricCard } from '../components/MetricCard';
import type { AreaGroup } from '../types';

interface Props {
  okrsOnTrack: number;
  okrsAtRisk: number;
  engagement: number;
  decisionsCount: number;
  groupedAreaData: AreaGroup[];
}

export function ScorecardSection({
  okrsOnTrack,
  okrsAtRisk,
  engagement,
  decisionsCount,
  groupedAreaData,
}: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Scorecard do quarter</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="OKRs no ritmo"
          value={String(okrsOnTrack)}
          subtitle="KRs com saúde saudável"
        />
        <MetricCard
          title="OKRs em risco"
          value={String(okrsAtRisk)}
          subtitle="KRs em atenção ou fora de rota"
        />
        <MetricCard
          title="Engajamento"
          value={`${engagement}%`}
          subtitle="KRs com check-in nos últimos 7 dias"
        />
        <MetricCard
          title="Decisões"
          value={String(decisionsCount)}
          subtitle="Decisões registradas nos rituais"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {groupedAreaData.map((area) => (
          <Badge key={area.areaName} variant="outline" className="gap-2">
            <span>{area.areaName}</span>
            <span className="font-semibold">{area.healthScoreAvg}</span>
          </Badge>
        ))}
      </div>
    </section>
  );
}
