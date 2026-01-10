/**
 * VicTypewriterQueue - Gerencia sequenciamento de animações de digitação
 * 
 * Evita múltiplos blocos animando simultaneamente.
 * Blocos se registram na fila e aguardam sua vez.
 */

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

// ============================================================
// TYPES
// ============================================================

interface QueueItem {
  id: string;
  priority: number;
  startCallback: () => void;
}

interface VicTypewriterQueueContextType {
  /** Registra um bloco na fila. Retorna função para notificar conclusão. */
  register: (id: string, priority: number, onStart: () => void) => () => void;
  /** Notifica que um bloco terminou de digitar */
  notifyComplete: (id: string) => void;
  /** Remove um bloco da fila (cleanup) */
  unregister: (id: string) => void;
}

const VicTypewriterQueueContext = createContext<VicTypewriterQueueContextType | null>(null);

// ============================================================
// PROVIDER
// ============================================================

export function VicTypewriterQueueProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<QueueItem[]>([]);
  const activeIdRef = useRef<string | null>(null);
  const [, forceUpdate] = useState(0);
  
  const processQueue = useCallback(() => {
    // Se já tem um ativo, não faz nada
    if (activeIdRef.current) return;
    
    // Pega o próximo da fila (menor priority = primeiro)
    if (queueRef.current.length === 0) return;
    
    // Sort by priority
    queueRef.current.sort((a, b) => a.priority - b.priority);
    
    const next = queueRef.current[0];
    if (next) {
      activeIdRef.current = next.id;
      next.startCallback();
    }
  }, []);
  
  const register = useCallback((id: string, priority: number, onStart: () => void) => {
    // Evita duplicatas
    const exists = queueRef.current.some(item => item.id === id);
    if (!exists) {
      queueRef.current.push({ id, priority, startCallback: onStart });
    }
    
    // Tenta processar imediatamente
    setTimeout(processQueue, 0);
    
    // Retorna a função para notificar conclusão
    return () => {
      // Cleanup
      queueRef.current = queueRef.current.filter(item => item.id !== id);
      if (activeIdRef.current === id) {
        activeIdRef.current = null;
      }
    };
  }, [processQueue]);
  
  const notifyComplete = useCallback((id: string) => {
    // Remove da fila
    queueRef.current = queueRef.current.filter(item => item.id !== id);
    
    // Libera o slot ativo
    if (activeIdRef.current === id) {
      activeIdRef.current = null;
    }
    
    // Processa próximo
    setTimeout(processQueue, 50); // Pequeno delay entre blocos
    forceUpdate(n => n + 1);
  }, [processQueue]);
  
  const unregister = useCallback((id: string) => {
    queueRef.current = queueRef.current.filter(item => item.id !== id);
    if (activeIdRef.current === id) {
      activeIdRef.current = null;
      setTimeout(processQueue, 0);
    }
  }, [processQueue]);
  
  return (
    <VicTypewriterQueueContext.Provider value={{ register, notifyComplete, unregister }}>
      {children}
    </VicTypewriterQueueContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

/**
 * Hook para usar a fila de typewriter.
 * Retorna null se não estiver dentro de um provider (fallback para comportamento normal).
 */
export function useVicTypewriterQueue() {
  return useContext(VicTypewriterQueueContext);
}
