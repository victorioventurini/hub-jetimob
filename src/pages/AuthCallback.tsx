import { useEffect, useMemo, useState, forwardRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/globalClient";
import { clearBuClientCache } from "@/integrations/supabase/buScopedClient";
import { AlertCircle, Mail, WifiOff } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { initSessionContext } from "@/lib/analytics";
import { resolveAuthTarget } from "@/lib/authRedirect";
import { readSharedSessionRaw } from "@/integrations/supabase/sharedSessionStorage";

import { logger } from "@/lib/logger";

type AuthErrorKind = "expired" | "network" | "generic";

interface AuthErrorState {
  kind: AuthErrorKind;
  message: string;
}

/**
 * AuthCallback
 *
 * Handles Magic Link authentication callback.
 *
 * The Magic Link email includes token_hash and type as query params (not hash fragment)
 * because SendGrid click tracking strips the hash. We call supabase.auth.verifyOtp()
 * with token_hash and type="magiclink" to complete the authentication.
 *
 * Trata 3 categorias de erro com CTAs específicos:
 * - expired: token consumido por scanner corporativo ou expirado → solicitar novo link
 * - network: bloqueio CORS/firewall corporativo → tentar outra rede ou modo anônimo
 * - generic: erro inesperado → fallback
 */
function classifyError(rawMessage: string | undefined | null): AuthErrorState {
  const msg = (rawMessage || "").toLowerCase();

  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed")
  ) {
    return {
      kind: "network",
      message:
        "Não foi possível conectar ao servidor de autenticação. Sua rede ou navegador pode estar bloqueando a conexão.",
    };
  }

  if (
    msg.includes("otp_expired") ||
    msg.includes("token has expired") ||
    msg.includes("invalid_token") ||
    msg.includes("expired") ||
    msg.includes("invalid")
  ) {
    return {
      kind: "expired",
      message:
        "Este link já foi usado ou expirou. Solicite um novo link de acesso.",
    };
  }

  return {
    kind: "generic",
    message: rawMessage || "Erro ao finalizar login. Tente novamente.",
  };
}

const AuthCallback = forwardRef<HTMLDivElement>(function AuthCallback(_props, _ref) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<AuthErrorState | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  const next = useMemo(() => {
    return normalizeAuthNext(searchParams.get("next"));
  }, [searchParams]);

  // Tenta extrair email da sessão (se já houver) ou do JWT do token_hash (não disponível)
  // Como fallback, deixamos o usuário re-digitar em /auth.
  const userEmailHint = searchParams.get("email") || "";

  useEffect(() => {
    let mounted = true;

    const processAuth = async () => {
      try {
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (tokenHash && type === "magiclink") {
          logger.debug("[AuthCallback] Processing magic link with token_hash");

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "magiclink",
          });

          if (verifyError) {
            console.error("[AuthCallback] verifyOtp error:", verifyError);
            if (mounted) {
              setError(classifyError(verifyError.message));
              setIsProcessing(false);
            }
            return;
          }

          if (data.session) {
            logger.debug("[AuthCallback] Session established via verifyOtp:", {
              userId: data.session.user.id,
              email: data.session.user.email,
              expiresAt: data.session.expires_at,
            });

            initSessionContext({
              userId: data.session.user.id,
            });

            clearBuClientCache();

            let attempts = 0;
            const maxAttempts = 20;
            while (attempts < maxAttempts && mounted) {
              await new Promise((resolve) => setTimeout(resolve, 150));
              const { data: checkData } = await supabase.auth.getSession();

              const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID || "oiwnghihyqdsinouwmga"}-auth-token`;
              const storedSession = localStorage.getItem(storageKey);
              const hasStoredToken =
                storedSession && JSON.parse(storedSession)?.access_token;

              if (
                checkData.session?.user?.id === data.session.user.id &&
                hasStoredToken
              ) {
                logger.debug(
                  "[AuthCallback] Session confirmed in SDK and localStorage after",
                  attempts + 1,
                  "checks"
                );
                break;
              }
              attempts++;
            }

            const finalStorageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID || "oiwnghihyqdsinouwmga"}-auth-token`;
            const finalCheck = localStorage.getItem(finalStorageKey);
            if (!finalCheck || !JSON.parse(finalCheck)?.access_token) {
              console.warn(
                "[AuthCallback] Token not in localStorage after polling, forcing setSession"
              );
              await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              });
              await new Promise((resolve) => setTimeout(resolve, 200));
            }

            logger.debug("[AuthCallback] Redirecting to:", next);
            if (mounted) navigate(next, { replace: true });
            return;
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[AuthCallback] Session error:", sessionError);
          if (mounted) {
            setError(classifyError(sessionError.message));
            setIsProcessing(false);
          }
          return;
        }

        if (session) {
          logger.debug("[AuthCallback] Existing session found, redirecting to:", next);
          if (mounted) navigate(next, { replace: true });
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const {
          data: { session: retrySession },
        } = await supabase.auth.getSession();
        if (retrySession && mounted) {
          navigate(next, { replace: true });
          return;
        }

        console.warn("[AuthCallback] No session after processing, redirecting to /auth");
        if (mounted) navigate("/auth", { replace: true });
      } catch (e: any) {
        console.error("[AuthCallback] Error:", e);
        if (mounted) {
          setError(classifyError(e?.message));
          setIsProcessing(false);
        }
      }
    };

    const timer = setTimeout(processAuth, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [navigate, next, searchParams]);

  if (error) {
    const Icon =
      error.kind === "network" ? WifiOff : error.kind === "expired" ? Mail : AlertCircle;

    const handleRequestNew = () => {
      const params = new URLSearchParams();
      if (userEmailHint) params.set("email", userEmailHint);
      const qs = params.toString();
      navigate(qs ? `/auth?${qs}` : "/auth", { replace: true });
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Icon className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-3 flex-1">
              <h1 className="text-lg font-semibold">
                {error.kind === "network"
                  ? "Conexão bloqueada"
                  : error.kind === "expired"
                  ? "Link expirado ou já usado"
                  : "Falha no login"}
              </h1>
              <p className="text-sm text-muted-foreground">{error.message}</p>

              {error.kind === "network" && (
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Tente abrir o link em uma janela anônima.</li>
                  <li>Tente em outra rede (ex: 4G do celular).</li>
                  <li>Desative extensões do navegador temporariamente.</li>
                </ul>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button size="sm" onClick={handleRequestNew}>
                  Solicitar novo link
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/auth" replace>
                    Voltar para o login
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingState text={isProcessing ? "Verificando seu acesso..." : "Finalizando login..."} />
    </div>
  );
});

export default AuthCallback;
