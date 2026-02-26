/**
 * EventsParticipantsFullPage — Full participants list with filters, tabs and fit
 */
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
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
            { label: "Eventos", href: "/events" },
            { label: "Participantes" },
          ]}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Baixar .csv
            </Button>
          }
        />
        <ScopeFilter />
        <ParticipantsFullList />
      </div>
    </HubLayout>
  );
}
