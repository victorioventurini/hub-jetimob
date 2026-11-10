import { createClient } from "npm:@supabase/supabase-js@2";
// Google Chat provider — DM 1:1 via bot (Service Account, scope chat.bot).
// Secret: GOOGLE_CHAT_SERVICE_ACCOUNT_JSON.

let cachedToken: { token: string; exp: number } | null = null;

function b64url(data: ArrayBuffer | string) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function getGoogleChatToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  const sa = JSON.parse(Deno.env.get("GOOGLE_CHAT_SERVICE_ACCOUNT_JSON") ?? "{}");
  if (!sa.client_email || !sa.private_key) throw new Error("GOOGLE_CHAT_SERVICE_ACCOUNT_JSON missing");
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
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${b64url(sig)}` }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`google token: ${data?.error ?? res.status}`);
  cachedToken = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return cachedToken.token;
}

export interface GoogleChatMessage {
  title: string;
  message?: string | null;
  url?: string | null;
  buttonText?: string;
}

export function buildGoogleChatBody(m: GoogleChatMessage) {
  const text = [`*${m.title}*`, m.message ? String(m.message).slice(0, 1500) : null].filter(Boolean).join("\n");
  const body: Record<string, unknown> = { text };
  if (m.url) {
    body.cardsV2 = [{
      cardId: "next",
      card: {
        sections: [{
          widgets: [{
            buttonList: { buttons: [{ text: m.buttonText ?? "Abrir no Next", onClick: { openLink: { url: m.url } } }] },
          }],
        }],
      },
    }];
  }
  return body;
}

async function resolveDmSpace(token: string, email: string): Promise<{ space?: string; error?: string }> {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: link } = await sb.from("google_chat_user_links")
    .select("chat_user_name, dm_space_name").eq("email", email.toLowerCase()).maybeSingle();
  if (link?.dm_space_name) return { space: link.dm_space_name };
  // Prefer the Chat user id (users/123); email aliases are rejected under app auth.
  const userRef = link?.chat_user_name ?? `users/${email}`;
  const find = await fetch(`https://chat.googleapis.com/v1/spaces:findDirectMessage?name=${encodeURIComponent(userRef)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (find.ok) {
    const name = (await find.json()).name as string;
    if (link) await sb.from("google_chat_user_links").update({ dm_space_name: name }).eq("email", email.toLowerCase());
    return { space: name };
  }
  const err = await find.json().catch(() => ({}));
  return { error: `GCHAT_NO_DM ${find.status} ${err?.error?.message ?? ""}`.trim() };
}

async function post(email: string, payload: Record<string, unknown>): Promise<{ success: boolean; provider?: string; error?: string }> {
  try {
    const token = await getGoogleChatToken();
    const { space, error } = await resolveDmSpace(token, email);
    if (!space) return { success: false, error };
    const res = await fetch(`https://chat.googleapis.com/v1/${space}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      return { success: false, error: `GCHAT_SEND ${res.status} ${e?.error?.message ?? ""}`.trim() };
    }
    return { success: true, provider: "google_chat" };
  } catch (e) {
    return { success: false, error: `GCHAT ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** DM a Workspace user (by email) with a title/message/link card. */
export function sendGoogleChat(email: string, m: GoogleChatMessage) {
  return post(email, buildGoogleChatBody(m));
}

/** DM a Workspace user with plain text. */
export function sendGoogleChatText(email: string, text: string) {
  return post(email, { text });
}
