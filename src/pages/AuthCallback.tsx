import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearBuClientCache } from "@/integrations/supabase/buScopedClient";
import { Loader2, AlertCircle } from "lucide-react";

/**
 * AuthCallback
 * 
 * Handles magic link authentication callback.
 * 
 * The magic link email includes token_hash and email as query params (not hash fragment)
 * because SendGrid click tracking strips the hash. We use verifyOtp to complete auth.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  const next = useMemo(() => {
    const raw = searchParams.get("next") || "/";
    // Only allow internal, absolute paths. Reject protocol-relative URLs like "//evil.com".
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
    return raw;
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    const processAuth = async () => {
      try {
        // Check for token_hash in query params (our custom flow that survives SendGrid tracking)
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (tokenHash && type === "magiclink") {
          console.log("[AuthCallback] Processing magic link with token_hash");
          
          // Use verifyOtp with token_hash to complete authentication
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "magiclink",
          });

          if (verifyError) {
            console.error("[AuthCallback] verifyOtp error:", verifyError);
            if (mounted) {
              setError(verifyError.message || "Link expirado ou inválido. Solicite um novo.");
              setIsProcessing(false);
            }
            return;
          }

          if (data.session) {
            console.log("[AuthCallback] Session established via verifyOtp:", {
              userId: data.session.user.id,
              email: data.session.user.email,
              expiresAt: data.session.expires_at,
            });
            
            // Clear BU client cache to ensure fresh clients with the new JWT
            clearBuClientCache();
            
            // Wait for the auth state listener to process the new session.
            // The SDK emits SIGNED_IN asynchronously after verifyOtp resolves.
            // We poll getSession to confirm the session is fully hydrated.
            let attempts = 0;
            const maxAttempts = 10;
            while (attempts < maxAttempts && mounted) {
              await new Promise(resolve => setTimeout(resolve, 100));
              const { data: checkData } = await supabase.auth.getSession();
              if (checkData.session?.user?.id === data.session.user.id) {
                console.log("[AuthCallback] Session confirmed after", attempts + 1, "checks");
                break;
              }
              attempts++;
            }
            
            console.log("[AuthCallback] Redirecting to:", next);
            if (mounted) navigate(next, { replace: true });
            return;
          }
        }

        // Fallback: check if session already exists (e.g., from hash fragment processed by SDK)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[AuthCallback] Session error:", sessionError);
          if (mounted) {
            setError(sessionError.message);
            setIsProcessing(false);
          }
          return;
        }

        if (session) {
          console.log("[AuthCallback] Existing session found, redirecting to:", next);
          if (mounted) navigate(next, { replace: true });
          return;
        }

        // No session and no token - wait a bit for SDK to process hash (legacy support)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession && mounted) {
          navigate(next, { replace: true });
          return;
        }

        // Still no session - redirect to auth page
        console.warn("[AuthCallback] No session after processing, redirecting to /auth");
        if (mounted) navigate("/auth", { replace: true });
        
      } catch (e: any) {
        console.error("[AuthCallback] Error:", e);
        if (mounted) {
          setError(e?.message || "Erro ao finalizar login");
          setIsProcessing(false);
        }
      }
    };

    // Small delay to allow page to render
    const timer = setTimeout(processAuth, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [navigate, next, searchParams]);

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
        <p className="text-sm text-muted-foreground">
          {isProcessing ? "Verificando seu acesso..." : "Finalizando login..."}
        </p>
      </div>
    </div>
  );
}
