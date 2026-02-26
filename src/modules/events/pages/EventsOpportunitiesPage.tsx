/**
 * EventsOpportunitiesPage — Opportunities list + export
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { SponsorHeader } from "../components/shared/SponsorHeader";
import { OpportunitiesList } from "../components/opportunities/OpportunitiesList";

export default function EventsOpportunitiesPage() {
  return (
    <HubLayout>
      <div className="space-y-6">
        <SponsorHeader title="Oportunidades" />
        <OpportunitiesList />
      </div>
    </HubLayout>
  );
}
