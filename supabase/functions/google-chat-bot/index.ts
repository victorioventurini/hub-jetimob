import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function b64url(data: ArrayBuffer | string) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  const sa = JSON.parse(Deno.env.get("GOOGLE_CHAT_SERVICE_ACCOUNT_JSON") ?? "{}");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/chat.bot",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${b64url(sig)}` }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`token: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function sendDm(email: string, text: string) {
  const token = await getAccessToken();
  const find = await fetch(`https://chat.googleapis.com/v1/spaces:findDirectMessage?name=users/${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } });
  const space = await find.json();
  if (!find.ok) return { ok: false, step: "findDirectMessage", status: find.status, error: space?.error?.message };
  const msg = await fetch(`https://chat.googleapis.com/v1/${space.name}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const out = await msg.json();
  return msg.ok ? { ok: true, space: space.name } : { ok: false, step: "send", status: msg.status, error: out?.error?.message };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  // Test send: requires a signed-in Next user; sends only to the caller's own email.
  if (body?.action === "test") {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user?.email) return json({ error: "unauthorized" }, 401);
    try {
      const text = body?.kind === "ritual"
        ? "⏰ *Lembrete: Pré-MBR aberto*\nO Pré-MBR de outubro do seu time está aberto até *sexta-feira*. Leva cerca de 15 minutos.\n👉 https://next.jetimob.com/rituals/mbr-pre\n\n_(mensagem de teste — os lembretes automáticos ainda não estão ligados)_"
        : "👋 Olá! Esta é a primeira mensagem do Next no Google Chat. Em breve você receberá aqui avisos de tickets, menções e ritos.";
      return json(await sendDm(data.user.email, text));
    } catch (e) { return json({ ok: false, error: String(e) }, 500); }
  }

  // Google Chat interaction events (DM to the app, added to space, etc.)
  const type = body?.type ?? body?.chat?.messagePayload ? "MESSAGE" : body?.type;
  const reply = "Olá! Sou o bot do Next. Vou te avisar aqui sobre tickets, menções e ritos. 🚀";
  if (body?.chat) {
    // Workspace add-on event format
    return json({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: { text: reply } } } } });
  }
  if (type === "ADDED_TO_SPACE" || type === "MESSAGE") return json({ text: reply });
  return json({});
});
