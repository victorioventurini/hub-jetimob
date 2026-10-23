import { useMemo, useState, forwardRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Shield, ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveAuthTarget } from "@/lib/authRedirect";
import { supabase as globalClient } from "@/integrations/supabase/globalClient";
import { clearBuClientCache } from "@/integrations/supabase/buScopedClient";
import { checkSessionPolicy, POLICY_MESSAGES } from "@/lib/authPolicy";
import { initSessionContext } from "@/lib/analytics";

/**
 * AuthConfirm
 *
 * Página intermediária de confirmação manual ("double opt-in click") para
 * mitigar URL Detonation feita por gateways corporativos de proteção
 * (Mimecast / Proofpoint / Microsoft Defender ATP) que escaneiam links
 * automaticamente — consumindo o token single-use antes do usuário clicar.
 *
 * Esta página NÃO chama verifyOtp no mount. Apenas renderiza um botão
 * que, ao ser clicado manualmente, navega para /auth/callback preservando
 * todos os query params (token_hash, type, next).
 *
 * Gateways mais agressivos executam JS e clicam no botão em sandbox. Para
 * esses casos, o e-mail inclui também um código de 6 dígitos (email_otp):
 * o scanner não consegue digitá-lo, então o código sobrevive mesmo se o
 * link for consumido. Quando a URL traz `email`, exibimos o campo de código.
 *
 * Acionada via lista URL_DETONATION_DOMAINS em request-magic-link.
 */
const AuthConfirm = forwardRef<HTMLDivElement>(function AuthConfirm(_props, _ref) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "magiclink";
  const email = searchParams.get("email");

  // Mantém o destino final (rota interna ou sistema VibeCoding via SSO)
  const next = useMemo(
    () => resolveAuthTarget(searchParams.get("next")).target,
    [searchParams]
  );

  const isValidLink = Boolean(tokenHash && type);

  const handleConfirm = () => {
    if (!isValidLink) return;
    setConfirming(true);
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("token_hash", tokenHash!);
    callbackUrl.searchParams.set("type", type);
    callbackUrl.searchParams.set("next", next);
    navigate(`${callbackUrl.pathname}${callbackUrl.search}`, { replace: true });
  };

  const handleCodeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = code.replace(/\D/g, "");
    if (!email || token.length !== 6 || verifyingCode) return;

    setVerifyingCode(true);
    setCodeError(null);

    const { data, error } = await globalClient.auth.verifyOtp({
      email,
      token,
      type: "magiclink",
    });

    if (error || !data.session) {
      setVerifyingCode(false);
      setCodeError("Código inválido ou expirado. Confira o e-mail e tente novamente.");
      return;
    }

    const violation = checkSessionPolicy(data.session);
    if (violation) {
      await globalClient.auth.signOut({ scope: "local" });
      setVerifyingCode(false);
      setCodeError(POLICY_MESSAGES[violation]);
      return;
    }

    initSessionContext({ userId: data.session.user.id });
    clearBuClientCache();
    navigate(next, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Shield className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Confirme seu acesso</h1>
            <p className="text-sm text-muted-foreground">
              Por motivos de segurança, confirme o acesso ao Next clicando no botão abaixo.
            </p>
          </div>

          {!isValidLink ? (
            <div className="w-full space-y-3 pt-2">
              <p className="text-sm text-destructive">
                Link inválido ou incompleto. Solicite um novo link de acesso.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/auth" replace>
                  Voltar para o login
                </Link>
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-3 pt-2">
              <Button
                className="w-full"
                size="lg"
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming ? "Acessando..." : "Acessar o Next"}
                {!confirming && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
              <p className="text-xs text-muted-foreground">
                Este passo extra protege o link contra escaneamentos automáticos de segurança do seu provedor de email.
              </p>

              {email && (
                <form onSubmit={handleCodeSubmit} className="w-full space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <KeyRound className="h-4 w-4" />
                    <span>Ou digite o código de 6 dígitos enviado no e-mail</span>
                  </div>
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-lg tracking-[0.5em] font-mono"
                    maxLength={6}
                  />
                  {codeError && (
                    <p className="text-sm text-destructive">{codeError}</p>
                  )}
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    disabled={code.replace(/\D/g, "").length !== 6 || verifyingCode}
                  >
                    {verifyingCode ? "Verificando..." : "Entrar com código"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default AuthConfirm;
