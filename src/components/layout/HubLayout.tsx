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

/**
 * Função agressiva de limpeza de pointer-events
 * Resolve problemas com Radix UI deixando body bloqueado
 */
function forceCleanupPointerEvents() {
  // Remove inline styles do body e html
  document.body.style.removeProperty('pointer-events');
  document.documentElement.style.removeProperty('pointer-events');
  
  // Força pointer-events: auto (não apenas remove)
  document.body.style.pointerEvents = '';
  document.documentElement.style.pointerEvents = '';
  
  // Remove qualquer data-scroll-locked residual do body (Radix Portal cleanup)
  if (document.body.getAttribute('data-scroll-locked')) {
    document.body.removeAttribute('data-scroll-locked');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('margin-right');
  }
  
  // Remove aria-hidden residual (Radix dialog/sheet)
  if (document.body.hasAttribute('aria-hidden')) {
    document.body.removeAttribute('aria-hidden');
  }
  
  // Remove inert residual
  if (document.body.hasAttribute('inert')) {
    document.body.removeAttribute('inert');
  }
  
  // Limpa todos os portals de Radix que podem estar travados
  document.querySelectorAll('[data-radix-popper-content-wrapper]').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.pointerEvents = '';
    }
  });
  
  // Limpa overlays de dialog/sheet que podem estar travados
  document.querySelectorAll('[data-radix-portal]').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.pointerEvents = '';
    }
  });
  
  // Remove qualquer overlay fantasma
  document.querySelectorAll('[data-state="closed"]').forEach((el) => {
    if (el instanceof HTMLElement && el.style.pointerEvents === 'none') {
      el.style.pointerEvents = '';
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
  
  // Listener global para forçar desbloqueio em qualquer movimento do mouse
  useEffect(() => {
    let cleanupScheduled = false;
    
    const scheduleCleanup = () => {
      if (cleanupScheduled) return;
      cleanupScheduled = true;
      requestAnimationFrame(() => {
        forceCleanupPointerEvents();
        cleanupScheduled = false;
      });
    };
    
    // Detecta movimento do mouse - se houver bloqueio, limpa
    const handleMouseMove = () => {
      const bodyComputed = window.getComputedStyle(document.body).pointerEvents;
      if (bodyComputed === "none") {
        scheduleCleanup();
      }
    };
    
    // Detecta clique - força limpeza se bloqueado
    const handleClick = () => {
      scheduleCleanup();
    };
    
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
    };
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