/**
 * EventsDashboardPage — Main dashboard with ROI & Insights
 */
import { Link } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { ScopeFilter } from "../components/shared/ScopeFilter";
import { KpiCards } from "../components/dashboard/KpiCards";
import { ShareOfMindRadar } from "../components/dashboard/ShareOfMindRadar";
import { BrandPainMatrix } from "../components/dashboard/BrandPainMatrix";

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
        <PageHeader
          title="Dashboard ROI & Insights"
          description="Jet Experience • Patrocinador"
          breadcrumbs={[
            { label: "Eventos" },
          ]}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to="/events/settings">
                <Settings className="h-3.5 w-3.5" />
                Configurações
              </Link>
            </Button>
          }
        />
        <ScopeFilter />

        {/* KPIs */}
        <KpiCards />

        {/* Row 1: Radar + Pain Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ShareOfMindRadar />
          <BrandPainMatrix />
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
