/**
 * EventsDashboardPage — Main dashboard with ROI & Insights
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { SponsorHeader } from "../components/shared/SponsorHeader";
import { KpiCards } from "../components/dashboard/KpiCards";
import { ShareOfMindRadar } from "../components/dashboard/ShareOfMindRadar";
import { BrandRecallChart } from "../components/dashboard/BrandRecallChart";
import { BrandPainMatrix } from "../components/dashboard/BrandPainMatrix";
import { BaselineEndlineChart } from "../components/dashboard/BaselineEndlineChart";
import { LeadQualificationFunnel } from "../components/dashboard/LeadQualificationFunnel";
import { PipelineRoiChart } from "../components/dashboard/PipelineRoiChart";
import { SegmentationCharts } from "../components/dashboard/SegmentationCharts";
import { PainRankingTable } from "../components/dashboard/PainRankingTable";
import { OpportunitiesVolumeChart } from "../components/dashboard/OpportunitiesVolumeChart";
import { BrandRecallLeadsOverlap } from "../components/dashboard/BrandRecallLeadsOverlap";

export default function EventsDashboardPage() {
  return (
    <HubLayout>
      <div className="space-y-6">
        <SponsorHeader title="Dashboard ROI & Insights" />

        {/* KPIs */}
        <KpiCards />

        {/* Row 1: Radar + Recall */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ShareOfMindRadar />
          <BrandRecallChart />
        </div>

        {/* Row 2: Pain Matrix + Baseline/Endline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BrandPainMatrix />
          <BaselineEndlineChart />
        </div>

        {/* Row 3: Funnel + Pipeline ROI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LeadQualificationFunnel />
          <PipelineRoiChart />
        </div>

        {/* Segmentation donuts */}
        <SegmentationCharts />

        {/* Row 5: Volume + Recall×Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OpportunitiesVolumeChart />
          <BrandRecallLeadsOverlap />
        </div>

        {/* Pain ranking */}
        <PainRankingTable />
      </div>
    </HubLayout>
  );
}
