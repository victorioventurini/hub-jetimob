import { HubLayout } from "@/components/layout/HubLayout";
import { InventoryDetailView } from "../components/inventory/InventoryDetailView";

export default function InventoryDetailPage() {
  // usePageTitle é chamado dentro de InventoryDetailView para ter acesso ao item

  return (
    <HubLayout>
      <div className="container py-6 max-w-5xl">
        <InventoryDetailView />
      </div>
    </HubLayout>
  );
}
