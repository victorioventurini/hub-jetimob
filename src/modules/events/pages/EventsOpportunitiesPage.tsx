/**
 * EventsOpportunitiesPage — Opportunities list + export
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { ScopeFilter } from "../components/shared/ScopeFilter";
import { OpportunitiesList } from "../components/opportunities/OpportunitiesList";

export default function EventsOpportunitiesPage() {
  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Oportunidades"
          description="Oportunidades capturadas nos eventos"
          breadcrumbs={[
            { label: "Jet Experience", href: "/events" },
            { label: "Oportunidades" },
          ]}
        />
        <ScopeFilter />
        <OpportunitiesList />
      </div>
    </HubLayout>
  );
}
