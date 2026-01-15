import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DynamicSidebar } from "./DynamicSidebar";
import { MobileSidebar } from "./MobileSidebar";
import { Header } from "./Header";
import { ImpersonationBanner } from "@/components/impersonation";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
import { cn } from "@/lib/utils";

interface HubLayoutProps {
  children: ReactNode;
}

export function HubLayout({ children }: HubLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isImpersonating } = useOptionalImpersonation();
  const location = useLocation();

  // Fix: ao navegar entre páginas, garantimos que o menu mobile fecha
  // e que qualquer lock residual do Radix (pointer-events:none) seja removido.
  useEffect(() => {
    setMobileMenuOpen(false);

    const cleanup = () => {
      const bodyComputed = window.getComputedStyle(document.body).pointerEvents;
      const htmlComputed = window.getComputedStyle(document.documentElement).pointerEvents;

      // Se o computed ficou travado em 'none', força override inline.
      if (bodyComputed === "none") {
        document.body.style.pointerEvents = "auto";
      } else if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }

      if (htmlComputed === "none") {
        document.documentElement.style.pointerEvents = "auto";
      } else if (document.documentElement.style.pointerEvents === "none") {
        document.documentElement.style.pointerEvents = "";
      }
    };

    // Rodar mais de uma vez para cobrir animações do Sheet/Dialog (closed duration ~300ms)
    const timers = [0, 250, 550, 900].map((delay) => window.setTimeout(cleanup, delay));

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Impersonation Banner */}
      {isImpersonating && <ImpersonationBanner />}
      
      {/* Desktop Sidebar */}
      <DynamicSidebar 
        collapsed={sidebarCollapsed} 
        onCollapse={setSidebarCollapsed} 
      />
      
      {/* Mobile Sidebar (Sheet) */}
      <MobileSidebar 
        open={mobileMenuOpen} 
        onOpenChange={setMobileMenuOpen} 
      />
      
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64",
          isImpersonating && "pt-10" // Compensar altura do banner
        )}
      >
        <Header 
          sidebarCollapsed={sidebarCollapsed} 
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />
        <main className="p-4 lg:p-8 pt-20 lg:pt-24">
          {children}
        </main>
      </div>
    </div>
  );
}