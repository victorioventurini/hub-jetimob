/**
 * useIdleTimeout — Encerra a sessão após inatividade prolongada.
 *
 * Monitora mouse, teclado, toque e scroll. Se nenhum evento de interação
 * for detectado dentro do período configurado, executa sign-out automático.
 *
 * IMPORTANTE: Deve ser usado dentro do AuthProvider, pois depende de useAuth().
 *
 * @see docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md — Seção 1.2 (Auth)
 */
import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

/** Duração do idle timeout em milissegundos (8 horas = 1 jornada de trabalho). */
const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8h

/** Intervalo de verificação em ms. Evita setTimeouts muito longos. */
const CHECK_INTERVAL_MS = 60 * 1000; // 1 min

/** Eventos de interação que resetam o timer. */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "pointerdown",
];

/**
 * Hook que monitora inatividade e faz sign-out após IDLE_TIMEOUT_MS.
 *
 * Só ativa quando há usuário autenticado. Persiste o timestamp da última
 * atividade em localStorage para funcionar cross-tab e sobreviver a reloads.
 */
export function useIdleTimeout() {
  const { user, signOut } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const STORAGE_KEY = "hub_last_activity_ts";

  const touch = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }, []);

  // Reset activity on user interaction
  useEffect(() => {
    if (!user) return;

    // Set initial activity timestamp
    touch();

    const handler = () => touch();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handler, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handler);
      }
    };
  }, [user, touch]);

  // Periodically check if idle timeout has been exceeded
  useEffect(() => {
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const lastActivity = parseInt(raw, 10);
      if (isNaN(lastActivity)) return;

      const elapsed = Date.now() - lastActivity;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        console.warn(
          `[useIdleTimeout] Sessão expirada por inatividade (${Math.round(elapsed / 60_000)}min). Fazendo sign-out.`
        );
        // Clean up storage key before sign-out to avoid loops
        localStorage.removeItem(STORAGE_KEY);
        signOut();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, signOut]);
}
