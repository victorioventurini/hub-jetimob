/**
 * EventsParticipantsPage — Legacy participants list (kept for participant detail back-nav)
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { ScopeFilter } from "../components/shared/ScopeFilter";
import { ParticipantsList } from "../components/participants/ParticipantsList";

export default function EventsParticipantsPage() {
  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Participantes"
          description="Lista de participantes dos eventos"
          breadcrumbs={[
            { label: "Eventos", href: "/events" },
            { label: "Participantes" },
          ]}
        />
        <ScopeFilter />
        <ParticipantsList />
      </div>
    </HubLayout>
  );
}
