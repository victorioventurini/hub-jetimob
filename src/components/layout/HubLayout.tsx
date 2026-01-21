import { ReactNode, useState, useEffect, useCallback } from "react";
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

/**
 * Função agressiva de limpeza de pointer-events
 * Resolve problemas com Radix UI deixando body bloqueado
 */
function forceCleanupPointerEvents() {
  // Remove inline styles
  document.body.style.removeProperty('pointer-events');
  document.documentElement.style.removeProperty('pointer-events');
  
  // Fallback: se computed ainda for 'none', força 'auto'
  const bodyComputed = window.getComputedStyle(document.body).pointerEvents;
  const htmlComputed = window.getComputedStyle(document.documentElement).pointerEvents;

  if (bodyComputed === "none") {
    document.body.style.pointerEvents = "auto";
  }
  if (htmlComputed === "none") {
    document.documentElement.style.pointerEvents = "auto";
  }
  
  // Remove qualquer aria-hidden residual do body (Radix Portal cleanup)
  if (document.body.getAttribute('data-scroll-locked') === '1') {
    document.body.removeAttribute('data-scroll-locked');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }
  
  // Força fechamento de qualquer tooltip aberto (dispatch blur)
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  
  // Remove portals de Radix que podem estar travados
  const radixPortals = document.querySelectorAll('[data-radix-popper-content-wrapper]');
  radixPortals.forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.pointerEvents = 'auto';
    }
  });
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

    // Executa imediatamente + timers para cobrir animações (até 1s)
    forceCleanupPointerEvents();
    const timers = [0, 50, 150, 300, 500, 1000].map((delay) => 
      window.setTimeout(forceCleanupPointerEvents, delay)
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [location.pathname]);
  
  // Listener global de clique para forçar desbloqueio se detectar bloqueio
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const bodyComputed = window.getComputedStyle(document.body).pointerEvents;
      if (bodyComputed === "none") {
        // Detectou bloqueio durante clique - força limpeza
        forceCleanupPointerEvents();
      }
    };
    
    // Captura fase para detectar antes de qualquer bloqueio
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

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