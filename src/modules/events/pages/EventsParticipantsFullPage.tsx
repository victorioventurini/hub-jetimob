/**
 * EventsParticipantsFullPage — Full participants list with filters, tabs and fit
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { SponsorHeader } from "../components/shared/SponsorHeader";
import { ParticipantsFullList } from "../components/participants/ParticipantsFullList";

export default function EventsParticipantsFullPage() {
  return (
    <HubLayout>
      <div className="space-y-6">
        <SponsorHeader title="Lista de Participantes" />
        <ParticipantsFullList />
      </div>
    </HubLayout>
  );
}
