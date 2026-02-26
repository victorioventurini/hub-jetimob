import { useEffect } from "react";
import { useBu } from "@/contexts/BuContext";

const DEFAULT_PRIMARY_COLOR = "#0A3D62";
const DEFAULT_SECONDARY_COLOR = "#EAF2FF";

function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");
  
  // Parse hex values
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function isValidHex(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export function useBuBranding() {
  const { currentBu } = useBu();
  
  useEffect(() => {
    const root = document.documentElement;
    
    // Get colors from BU or use defaults
    const primaryColor = currentBu?.primary_color && isValidHex(currentBu.primary_color)
      ? currentBu.primary_color
      : DEFAULT_PRIMARY_COLOR;
    
    const secondaryColor = currentBu?.secondary_color && isValidHex(currentBu.secondary_color)
      ? currentBu.secondary_color
      : DEFAULT_SECONDARY_COLOR;
    
    // Convert to HSL and set CSS variables for BU branding
    const primaryHSL = hexToHSL(primaryColor);
    const secondaryHSL = hexToHSL(secondaryColor);
    
    // Set BU-specific CSS variables (these override the sidebar colors)
    root.style.setProperty("--bu-primary", primaryHSL);
    root.style.setProperty("--bu-secondary", secondaryHSL);
    
    // Update sidebar colors to use BU branding
    root.style.setProperty("--sidebar-primary", primaryHSL);
    root.style.setProperty("--sidebar-primary-foreground", "0 0% 100%");
    
    return () => {
      // Reset to defaults when unmounting
      root.style.removeProperty("--bu-primary");
      root.style.removeProperty("--bu-secondary");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-primary-foreground");
    };
  }, [currentBu]);
  
  return {
    symbolUrl: currentBu?.symbol_url || null,
    logoUrl: currentBu?.logo_url || null,
    primaryColor: currentBu?.primary_color || DEFAULT_PRIMARY_COLOR,
    secondaryColor: currentBu?.secondary_color || DEFAULT_SECONDARY_COLOR,
    buName: currentBu?.name || "Hub",
    memberDisplayName: currentBu?.member_display_name || "Usuários",
  };
}
