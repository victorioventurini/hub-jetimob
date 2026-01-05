import { HubLayout } from "@/components/layout/HubLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { InventoryDetailView } from "../components/inventory/InventoryDetailView";

export default function InventoryDetailPage() {
  usePageTitle("Detalhes do Item");

  return (
    <HubLayout>
      <div className="container py-6 max-w-5xl">
        <InventoryDetailView />
      </div>
    </HubLayout>
  );
}
