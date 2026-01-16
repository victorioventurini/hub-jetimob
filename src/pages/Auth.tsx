import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, type Location } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, AlertCircle, RefreshCw, Mail } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { checkEmailDomainAllowed } from "@/modules/bu/hooks";
import JetimobIcon from "@/assets/jetimob-icon.svg";

const STORAGE_KEY = "hub_last_email";
const STORAGE_TTL_DAYS = 30;

interface SavedEmail {
  email: string;
  savedAt: number;
}

function getSavedEmail(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data: SavedEmail = JSON.parse(stored);
    const now = Date.now();
    const expiresAt = data.savedAt + STORAGE_TTL_DAYS * 24 * 60 * 60 * 1000;
    if (now > expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data.email;
  } catch {
    return null;
  }
}

function saveEmail(email: string) {
  const data: SavedEmail = {
    email,
    savedAt: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

type AuthState = "first-access" | "returning" | "link-sent";

export default function Auth() {
  usePageTitle("Login", {
    skipBu: true
  });
  const savedEmail = getSavedEmail();
  const [email, setEmail] = useState(savedEmail || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [authState, setAuthState] = useState<AuthState>(savedEmail ? "returning" : "first-access");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authTimeout, setAuthTimeout] = useState(false);
  
  const {
    user,
    isLoading: authLoading,
    signInWithMagicLink,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Safety timeout - if auth takes too long, show the form anyway
  useEffect(() => {
    if (!authLoading) {
      setAuthTimeout(false);
      return;
    }
    
    const timer = setTimeout(() => {
      console.warn('[Auth] Auth loading timeout - showing form');
      setAuthTimeout(true);
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(timer);
  }, [authLoading]);

  // Redirect if already logged in (preserve original destination if any)
  useEffect(() => {
    if (!user || authLoading) return;

    const from = (location.state as { from?: Location } | null)?.from;
    const target = from && from.pathname && from.pathname !== "/auth"
      ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
      : "/";

    navigate(target, { replace: true });
  }, [user, authLoading, navigate, location.state]);

  // Clear domain error when email changes
  useEffect(() => {
    setDomainError(null);
  }, [email]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Build redirect URL preserving original destination
  const getRedirectUrl = useCallback(() => {
    const from = (location.state as { from?: Location } | null)?.from;

    const target = from && from.pathname && from.pathname !== "/auth"
      ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
      : "/";

    const next = encodeURIComponent(target);
    return `${window.location.origin}/auth/callback?next=${next}`;
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDomainError(null);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Ops, esse e-mail não parece válido.");
      return;
    }

    // Check if email domain is allowed
    setIsCheckingDomain(true);
    const { allowed } = await checkEmailDomainAllowed(email);
    setIsCheckingDomain(false);
    if (!allowed) {
      setDomainError("Esse e-mail não tem acesso ao Hub.");
      return;
    }
    
    setIsLoading(true);
    const redirectUrl = getRedirectUrl();
    const { error } = await signInWithMagicLink(email, redirectUrl);
    setIsLoading(false);
    
    if (error) {
      toast.error("Algo deu errado. Tenta de novo?");
      return;
    }

    // Save email to localStorage
    saveEmail(email);
    setAuthState("link-sent");
    setResendCooldown(60);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    const redirectUrl = getRedirectUrl();
    const { error } = await signInWithMagicLink(email, redirectUrl);
    setIsLoading(false);
    if (error) {
      toast.error("Não conseguimos reenviar. Tenta de novo?");
      return;
    }
    toast.success("Link reenviado!");
    setResendCooldown(60);
  };

  const handleChangeEmail = useCallback(() => {
    setAuthState("first-access");
    setEmail("");
  }, []);

  // Extract first name from email for personalized greeting
  const getFirstName = (): string | null => {
    if (!savedEmail) return null;
    const localPart = savedEmail.split("@")[0];
    const firstName = localPart.split(".")[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  };

  // Show loading while checking auth state (with timeout fallback)
  if (authLoading && !authTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  // STATE: Link Sent - User should check email
  if (authState === "link-sent") {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Branding */}
        <BrandingSide />

        {/* Right side - Link sent confirmation */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm space-y-6"
          >
            <div className="lg:hidden w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-6">
              <img
                src={JetimobIcon}
                alt="Hub"
                className="w-8 h-8"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Verifique seu e-mail 📬
                </h1>
                <p className="text-muted-foreground">
                  Enviamos um link de acesso para{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
              <p className="text-sm text-muted-foreground">
                Clique no link do e-mail para entrar. O link expira em <strong>10 minutos</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Não encontrou? Olhe na caixa de spam.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {resendCooldown > 0
                  ? `Reenviar em ${resendCooldown}s`
                  : "Reenviar link"}
              </Button>

              <button
                type="button"
                onClick={handleChangeEmail}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Usar outro e-mail
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const firstName = getFirstName();
  const isReturning = authState === "returning" && savedEmail;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Branding */}
      <BrandingSide />

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="lg:hidden w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-6">
            <img
              src={JetimobIcon}
              alt="Hub"
              className="w-8 h-8"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>

          {/* STATE 1: First Access */}
          {!isReturning && (
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Buenas! 👋
              </h1>
              <p className="text-muted-foreground text-sm">
                Digite seu e-mail @jet para receber o link de acesso.
              </p>
            </div>
          )}

          {/* STATE 2: Returning User */}
          {isReturning && (
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {firstName
                  ? `Buenas, ${firstName}.`
                  : "Buenas! Bom te ver por aqui."}
              </h1>
              <p className="text-muted-foreground">
                Vamos enviar o link para{" "}
                <span className="font-medium text-foreground">{savedEmail}</span>.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isReturning && (
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.nome@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`h-12 ${
                    domainError
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                  required
                  autoFocus
                  disabled={isLoading || isCheckingDomain}
                />
                {domainError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{domainError}</span>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="accent"
              className="w-full h-12 gap-2 text-base"
              disabled={isLoading || isCheckingDomain}
            >
              {isCheckingDomain ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  Receber link
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {isReturning && (
              <button
                type="button"
                onClick={handleChangeEmail}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Trocar e-mail
              </button>
            )}
          </form>

          <p className="text-xs text-muted-foreground text-center pt-4">
            Ao continuar, você concorda com os{" "}
            <a
              href="https://www.jetimob.com/termos"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              termos de uso
            </a>{" "}
            e{" "}
            <a
              href="https://www.jetimob.com/politica"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              política de privacidade
            </a>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// Reusable branding side component
function BrandingSide() {
  return (
    <div className="hidden lg:flex lg:flex-1 gradient-hero items-center justify-center p-12">
      <div className="max-w-md text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-8"
        >
          <img src={JetimobIcon} alt="Hub" className="w-12 h-12" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="text-4xl font-bold text-primary-foreground mb-4"
        >
          Hub
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          className="text-lg text-primary-foreground/80"
        >
          O ponto de encontro dos Jetimobers para evoluir, executar e...
          simplificar o morar!
        </motion.p>
      </div>
    </div>
  );
}
