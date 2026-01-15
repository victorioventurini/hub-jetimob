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

  // Fix: Limpa pointer-events residual após navegação
  // Dialogs/Sheets do Radix podem deixar pointer-events:none no body
  useEffect(() => {
    // Pequeno delay para garantir que transições completaram
    const timer = setTimeout(() => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    }, 100);
    
    return () => clearTimeout(timer);
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