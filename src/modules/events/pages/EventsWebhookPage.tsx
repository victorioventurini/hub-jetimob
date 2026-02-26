/**
 * EventsWebhookPage — Webhook configuration + simulator
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { SponsorHeader } from "../components/shared/SponsorHeader";
import { WebhookSimulator } from "../components/opportunities/WebhookSimulator";

export default function EventsWebhookPage() {
  return (
    <HubLayout>
      <div className="space-y-6">
        <SponsorHeader title="Webhook" />
        <WebhookSimulator />
      </div>
    </HubLayout>
  );
}
