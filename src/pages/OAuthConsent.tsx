/**
 * Tela de consentimento OAuth 2.1 (servidor MCP do Next).
 *
 * O Supabase redireciona para `/.lovable/oauth/consent?authorization_id=...`
 * quando um cliente (Claude, ChatGPT, Cursor…) pede acesso ao Next em nome do
 * usuário. Aqui ele aprova ou nega. Sem sessão, mandamos para `/auth` com
 * `?next=` preservando a URL completa, para voltar exatamente para cá.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthorizationDetails = {
  client?: { name?: string | null; client_uri?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
  scope?: string | null;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

function oauthApi(): OAuthApi | null {
  const api = (supabase.auth as unknown as { oauth?: OAuthApi }).oauth;
  return api ?? null;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!authorizationId) {
        setError("Pedido de autorização inválido: identificador ausente.");
        return;
      }

      const api = oauthApi();
      if (!api) {
        setError("Este ambiente ainda não tem o servidor de autorização habilitado.");
        return;
      }

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const back = window.location.pathname + window.location.search;
        window.location.href = `/auth?next=${encodeURIComponent(back)}`;
        return;
      }

      const { data, error: detailsError } = await api.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }

      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data ?? {});
    })();

    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    const api = oauthApi();
    if (!api) return;
    setBusy(true);
    const { data, error: decisionError } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);

    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }

    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não devolveu o endereço de retorno.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
            <CardTitle>Não foi possível carregar o pedido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.assign("/")}>
              Voltar ao Next
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "um aplicativo";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
          <CardTitle>Conectar {clientName} à sua conta</CardTitle>
          <CardDescription>
            {clientName} vai consultar informações do Next em seu nome, com as mesmas permissões que você já tem.
            Nada é criado nem alterado por essa conexão.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button disabled={busy} onClick={() => decide(true)}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Autorizar
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
            Recusar
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
