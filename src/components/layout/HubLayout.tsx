import { ReactNode, useState } from "react";
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