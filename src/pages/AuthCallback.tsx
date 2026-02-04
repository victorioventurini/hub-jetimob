import { useEffect, useMemo, useState, forwardRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/globalClient";
import { clearBuClientCache } from "@/integrations/supabase/buScopedClient";
import { Loader2, AlertCircle } from "lucide-react";
import { initSessionContext } from "@/lib/analytics";

/**
 * AuthCallback
 * 
 * Handles Magic Link authentication callback.
 * Uses forwardRef to avoid React Router warnings about refs on function components.
 * 
 * The Magic Link email includes token_hash and type as query params (not hash fragment)
 * because SendGrid click tracking strips the hash. We call supabase.auth.verifyOtp() 
 * with token_hash and type="magiclink" to complete the authentication.
 */
const AuthCallback = forwardRef<HTMLDivElement>(function AuthCallback(_props, ref) {
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
          
          // Complete Magic Link authentication using token_hash
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
            
            // Initialize GA4 session context with user ID (UUID, não email - seguro para GA4)
            initSessionContext({
              userId: data.session.user.id,
            });
            
            // Clear BU client cache to ensure fresh clients with the new JWT
            clearBuClientCache();
            
            // Wait for the auth state listener to process the new session.
            // The SDK emits SIGNED_IN asynchronously after verifyOtp resolves.
            // We poll getSession to confirm the session is fully hydrated AND
            // that the token is persisted to localStorage (critical for BU-scoped client).
            let attempts = 0;
            const maxAttempts = 20; // Increased from 10 to give more time
            while (attempts < maxAttempts && mounted) {
              await new Promise(resolve => setTimeout(resolve, 150)); // Slightly longer delay
              const { data: checkData } = await supabase.auth.getSession();
              
              // Also verify token is in localStorage (BuScopedClient reads from there)
              const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'oiwnghihyqdsinouwmga'}-auth-token`;
              const storedSession = localStorage.getItem(storageKey);
              const hasStoredToken = storedSession && JSON.parse(storedSession)?.access_token;
              
              if (checkData.session?.user?.id === data.session.user.id && hasStoredToken) {
                console.log("[AuthCallback] Session confirmed in SDK and localStorage after", attempts + 1, "checks");
                break;
              }
              attempts++;
            }
            
            // Final verification - if we still don't have the token, force a setSession call
            const finalStorageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'oiwnghihyqdsinouwmga'}-auth-token`;
            const finalCheck = localStorage.getItem(finalStorageKey);
            if (!finalCheck || !JSON.parse(finalCheck)?.access_token) {
              console.warn("[AuthCallback] Token not in localStorage after polling, forcing setSession");
              await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              });
              // Small delay to let storage persist
              await new Promise(resolve => setTimeout(resolve, 200));
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
});

export default AuthCallback;
