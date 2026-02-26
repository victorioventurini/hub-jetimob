/**
 * EventsParticipantsPage — List of participants
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { SponsorHeader } from "../components/shared/SponsorHeader";
import { ParticipantsList } from "../components/participants/ParticipantsList";

export default function EventsParticipantsPage() {
  return (
    <HubLayout>
      <div className="space-y-6">
        <SponsorHeader title="Participantes" />
        <ParticipantsList />
      </div>
    </HubLayout>
  );
}
