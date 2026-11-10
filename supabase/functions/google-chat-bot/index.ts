import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendGoogleChatText } from "../_shared/notification-providers/google-chat.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const RITUAL_TEST =
  "⏰ *Lembrete: Pré-MBR aberto*\nO Pré-MBR de outubro do seu time está aberto até *sexta-feira*. Leva cerca de 15 minutos.\n👉 https://next.jetimob.com/rituals/mbr-pre\n\n_(mensagem de teste — os lembretes automáticos ainda não estão ligados)_";
const HELLO = "👋 Olá! Esta é a primeira mensagem do Next no Google Chat. Em breve você receberá aqui avisos de tickets, menções e ritos.";

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
    return json(await sendGoogleChatText(data.user.email, body?.kind === "ritual" ? RITUAL_TEST : HELLO));
  }

  // Google Chat interaction events — record who talks to the bot so we can DM them later.
  const user = body?.chat?.user ?? body?.user;
  const space = body?.chat?.messagePayload?.space ?? body?.chat?.addedToSpacePayload?.space ?? body?.space;
  if (user?.email && user?.name) {
    await admin().from("google_chat_user_links").upsert({
      email: String(user.email).toLowerCase(),
      chat_user_name: user.name,
      dm_space_name: space?.type === "DM" || space?.spaceType === "DIRECT_MESSAGE" || space?.singleUserBotDm ? space.name : null,
      updated_at: new Date().toISOString(),
    });
  }

  const reply = "Olá! Sou o bot do Next. Vou te avisar aqui sobre tickets, menções e ritos. 🚀";
  if (body?.chat) {
    return json({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: { text: reply } } } } });
  }
  if (body?.type === "ADDED_TO_SPACE" || body?.type === "MESSAGE") return json({ text: reply });
  return json({});
});
