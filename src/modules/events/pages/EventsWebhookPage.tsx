/**
 * EventsWebhookPage — Webhook configuration + simulator
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { WebhookSimulator } from "../components/opportunities/WebhookSimulator";

export default function EventsWebhookPage() {
  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Webhook"
          description="Simulador de webhooks para integração"
          breadcrumbs={[
            { label: "Eventos", href: "/events" },
            { label: "Webhook" },
          ]}
        />
        <WebhookSimulator />
      </div>
    </HubLayout>
  );
}
