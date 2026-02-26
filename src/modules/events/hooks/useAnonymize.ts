/**
 * Hook for brand anonymization based on view mode
 */
import { useCallback } from "react";
import { useEventsContext } from "../context/EventsContext";
import { getBrandDisplayName, getBrandColor } from "../utils/anonymize";

export function useAnonymize() {
  const { viewMode } = useEventsContext();

  const getDisplayName = useCallback(
    (brandId: string) => getBrandDisplayName(brandId, viewMode),
    [viewMode]
  );

  return { getDisplayName, getBrandColor, viewMode };
}
