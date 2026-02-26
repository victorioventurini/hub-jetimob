/**
 * Hook for CSV export
 */
import { useCallback } from "react";
import { useEventsContext } from "../context/EventsContext";
import { exportOpportunitiesCsv } from "../utils/csv";

export function useCsvExport() {
  const { opportunities } = useEventsContext();

  const exportAll = useCallback(() => {
    exportOpportunitiesCsv(opportunities);
  }, [opportunities]);

  const exportFiltered = useCallback((filteredOpps: typeof opportunities) => {
    exportOpportunitiesCsv(filteredOpps);
  }, []);

  return { exportAll, exportFiltered };
}
