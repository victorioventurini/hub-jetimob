/**
 * EventsCapturePage — Public capture page
 */
import { useParams } from "react-router-dom";
import { EventsProvider } from "../context/EventsContext";
import { CaptureForm } from "../components/capture/CaptureForm";

export default function EventsCapturePage() {
  const { eventCode } = useParams<{ eventCode: string }>();

  return (
    <EventsProvider>
      <CaptureForm eventCode={eventCode ?? ""} />
    </EventsProvider>
  );
}
