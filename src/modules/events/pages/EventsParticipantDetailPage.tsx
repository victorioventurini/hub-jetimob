/**
 * EventsParticipantDetailPage — Detail page for a participant
 */
import { useParams, Navigate } from "react-router-dom";
import { HubLayout } from "@/components/layout/HubLayout";
import { ParticipantDetail } from "../components/participants/ParticipantDetail";
import { PARTICIPANTS_MOCK } from "../mocks/participants";

export default function EventsParticipantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const participant = PARTICIPANTS_MOCK.find((p) => p.id === id);

  if (!participant) return <Navigate to="/events/participants" replace />;

  return (
    <HubLayout>
      <ParticipantDetail participant={participant} />
    </HubLayout>
  );
}
