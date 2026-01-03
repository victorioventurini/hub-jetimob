import { useEffect } from "react";
import { useBu } from "@/contexts/BuContext";

interface HubBranding {
  hubName: string;
  hubFullName: string;
  hubDescription: string;
}

/**
 * Hook to get dynamic Hub branding based on selected BU context
 * - When no BU is selected: "Hub"
 * - When a BU is selected: "Hub [BU Name]" (e.g., "Hub Jetimob", "Hub Jet Experience")
 */
export function useHubBranding(): HubBranding {
  const { currentBu, buSelected } = useBu();

  const hubName = buSelected && currentBu ? `Hub ${currentBu.name}` : "Hub";
  const hubFullName = hubName;
  const hubDescription = buSelected && currentBu 
    ? `Plataforma central da ${currentBu.name} para gestão de pessoas, times, OKRs e muito mais.`
    : "Plataforma central para gestão de pessoas, times, OKRs e muito mais.";

  // Update document title when branding changes
  useEffect(() => {
    document.title = hubName;
  }, [hubName]);

  return {
    hubName,
    hubFullName,
    hubDescription,
  };
}

/**
 * Component to set document meta based on BU context
 * Use this in layout components to keep meta tags updated
 */
export function useDocumentMeta(pageTitle?: string) {
  const { hubName } = useHubBranding();

  useEffect(() => {
    const fullTitle = pageTitle ? `${pageTitle} | ${hubName}` : hubName;
    document.title = fullTitle;
  }, [pageTitle, hubName]);
}
