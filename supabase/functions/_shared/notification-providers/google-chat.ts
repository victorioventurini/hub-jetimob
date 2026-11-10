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
  const body: Record<string, unknown> = { text: m.url ? text : text };
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

/** Sends a DM to a Workspace user by email. Returns { success, error, skipped }. */
export async function sendGoogleChat(email: string, m: GoogleChatMessage): Promise<{ success: boolean; provider?: string; error?: string }> {
  try {
    const token = await getGoogleChatToken();
    const find = await fetch(`https://chat.googleapis.com/v1/spaces:findDirectMessage?name=users/${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let spaceName: string | null = null;
    if (find.ok) {
      spaceName = (await find.json()).name;
    } else if (find.status === 404) {
      // No DM yet: create one (bot can open DM with users in the org).
      const setup = await fetch("https://chat.googleapis.com/v1/spaces:setup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ space: { spaceType: "DIRECT_MESSAGE", singleUserBotDm: true }, memberships: [{ member: { name: `users/${email}`, type: "HUMAN" } }] }),
      });
      if (!setup.ok) return { success: false, error: `GCHAT_NO_DM ${setup.status}` };
      spaceName = (await setup.json()).name;
    } else {
      return { success: false, error: `GCHAT_FIND ${find.status}` };
    }
    const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildGoogleChatBody(m)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: `GCHAT_SEND ${res.status} ${err?.error?.message ?? ""}`.trim() };
    }
    return { success: true, provider: "google_chat" };
  } catch (e) {
    return { success: false, error: `GCHAT ${e instanceof Error ? e.message : String(e)}` };
  }
}
