import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

/**
 * AuthCallback
 * 
 * Aguarda a sessão ser detectada pelo listener global e redireciona para o destino.
 * O SDK Supabase v2 processa automaticamente o hash/code da URL.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const next = useMemo(() => {
    const raw = searchParams.get("next") || "/";
    return raw.startsWith("/") ? raw : "/";
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // O SDK já processa o hash/code automaticamente.
    // Aguardamos a sessão ficar disponível via listener global.
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[AuthCallback] Session error:", sessionError);
          if (mounted) setError(sessionError.message);
          return;
        }

        if (session) {
          console.log("[AuthCallback] Session found, redirecting to:", next);
          if (mounted) navigate(next, { replace: true });
        } else {
          // Aguardar um pouco e tentar novamente (o listener pode ainda não ter processado)
          timeoutId = setTimeout(() => {
            if (mounted) {
              supabase.auth.getSession().then(({ data: { session: s } }) => {
                if (s && mounted) {
                  navigate(next, { replace: true });
                } else if (mounted) {
                  // Após 2 tentativas, redirecionar para /auth
                  console.warn("[AuthCallback] No session after retry, redirecting to /auth");
                  navigate("/auth", { replace: true });
                }
              });
            }
          }, 1000);
        }
      } catch (e: any) {
        console.error("[AuthCallback] Error:", e);
        if (mounted) setError(e?.message || "Erro ao finalizar login");
      }
    };

    // Pequeno delay para dar tempo do SDK processar o hash
    const initialDelay = setTimeout(() => {
      checkSession();
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(initialDelay);
      clearTimeout(timeoutId);
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
