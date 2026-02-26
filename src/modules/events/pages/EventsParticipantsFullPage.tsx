/**
 * EventsParticipantsFullPage — Full participants list with filters, tabs and fit
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { ScopeFilter } from "../components/shared/ScopeFilter";
import { ParticipantsFullList } from "../components/participants/ParticipantsFullList";

export default function EventsParticipantsFullPage() {
  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Lista de Participantes"
          description="Segmentação e qualificação de participantes por evento"
          breadcrumbs={[
            { label: "Jet Experience", href: "/events" },
            { label: "Participantes" },
          ]}
        />
        <ScopeFilter />
        <ParticipantsFullList />
      </div>
    </HubLayout>
  );
}
