/**
 * OpportunityExportCsv — Button to export CSV
 */
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportOpportunitiesCsv } from "../../utils/csv";
import type { Opportunity } from "../../types";

export function OpportunityExportCsv({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-9 text-xs gap-1.5"
      onClick={() => exportOpportunitiesCsv(opportunities)}
    >
      <Download className="h-3.5 w-3.5" />
      Exportar CSV
    </Button>
  );
}
