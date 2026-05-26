import { useMemo, useState, forwardRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeAuthNext } from "@/lib/authRedirect";

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
 * Acionada via lista URL_DETONATION_DOMAINS em request-magic-link.
 */
const AuthConfirm = forwardRef<HTMLDivElement>(function AuthConfirm(_props, _ref) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [confirming, setConfirming] = useState(false);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "magiclink";

  const next = useMemo(() => {
    return normalizeAuthNext(searchParams.get("next"));
  }, [searchParams]);

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
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default AuthConfirm;
