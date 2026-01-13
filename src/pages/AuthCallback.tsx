import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

/**
 * AuthCallback
 * 
 * Finaliza login via link (implicit hash) ou PKCE (code param) e redireciona para o destino original.
 * 
 * Motivo: alguns navegadores/flows não persistem sessão automaticamente ao voltar do link.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const next = useMemo(() => {
    const raw = searchParams.get("next") || "/";
    // next pode vir como "/okrs/quality?team=..."
    return raw.startsWith("/") ? raw : "/";
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    async function finalize() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // PKCE flow
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Magic link (implicit)
          // @ts-expect-error - método existe no SDK, mas tipos podem variar conforme build
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) throw error;
        }

        // Garantir que a sessão foi persistida
        await supabase.auth.getSession();

        if (!mounted) return;
        navigate(next, { replace: true });
      } catch (e: any) {
        console.error("[AuthCallback] Failed to finalize auth:", e);
        if (!mounted) return;
        setError(e?.message || "Não foi possível finalizar o login.");
      }
    }

    finalize();

    return () => {
      mounted = false;
    };
  }, [navigate, next]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full rounded-lg border bg-card p-6">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-semibold">Falha no login</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                className="text-sm underline text-foreground"
                onClick={() => navigate("/auth", { replace: true })}
              >
                Voltar para o login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Finalizando login...</p>
      </div>
    </div>
  );
}
