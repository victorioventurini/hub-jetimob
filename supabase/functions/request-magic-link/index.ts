import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MagicLinkRequest {
  email: string;
  redirectTo: string;
}

// Check if email domain is allowed in any active BU
async function getEmailBu(email: string): Promise<{ allowed: boolean; buName: string | null }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { allowed: false, buName: null };
  }

  const { data, error } = await supabase
    .from("bu_units")
    .select("id, name, allowed_email_domains")
    .eq("status", "active");

  if (error) {
    console.error("Error checking email domain:", error);
    return { allowed: false, buName: null };
  }

  // Check if domain exists in any BU's allowed_email_domains
  for (const bu of (data as { id: string; name: string; allowed_email_domains: string[] }[]) || []) {
    const allowedDomains = bu.allowed_email_domains || [];
    if (allowedDomains.some((d: string) => d.toLowerCase() === domain)) {
      return { allowed: true, buName: bu.name };
    }
  }

  return { allowed: false, buName: null };
}

async function sendMagicLinkEmail(email: string, magicLink: string, userName?: string, buName?: string): Promise<void> {
  const displayName = userName || email.split('@')[0].split('.')[0];
  // Capitalize first letter
  const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  const orgName = buName || "Jetimob";
  
  console.log(`Sending magic link email to ${email} via SendGrid from no-reply@hub.jetimob.com`);
  
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email }],
          subject: `Seu código de acesso ao Hub ${orgName}`,
        },
      ],
      from: {
        email: "no-reply@hub.jetimob.com",
        name: `Hub ${orgName}`,
      },
      content: [
        {
          type: "text/html",
          value: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
              <div style="max-width: 480px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 28px; font-weight: bold;">J</span>
                  </div>
                  <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 600;">Hub ${orgName}</h1>
                </div>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  Olá, ${formattedName}! 👋
                </p>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                  Clique no botão abaixo para acessar o Hub. Este link é válido por 1 hora.
                </p>
                
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Acessar Hub ${orgName}
                  </a>
                </div>
                
                <p style="color: #71717a; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
                  Se você não solicitou este link, pode ignorar este email com segurança.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
                
                <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
                  O ponto de encontro para evoluir, executar e simplificar o morar.
                </p>
              </div>
            </body>
            </html>
          `,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("SendGrid API error:", response.status, errorText);
    throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
  }

  console.log("Magic link email sent successfully to:", email);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectTo }: MagicLinkRequest = await req.json();

    // Validate input
    if (!email || !redirectTo) {
      console.warn("Missing required fields: email or redirectTo");
      return new Response(
        JSON.stringify({ error: "Email e redirectTo são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if email domain is allowed
    const { allowed, buName } = await getEmailBu(email);
    
    if (!allowed) {
      const domain = email.split('@')[1] || 'unknown';
      console.warn("Unauthorized email domain attempted:", domain);
      return new Response(
        JSON.stringify({ error: `O domínio @${domain} não está autorizado para acesso ao Hub.` }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Generating magic link for ${email} (BU: ${buName})`);

    // Generate magic link using admin API (this doesn't send email)
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error("Error generating magic link:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de acesso. Tente novamente." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!data?.properties?.action_link) {
      console.error("No action_link returned from generateLink");
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de acesso." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const magicLink = data.properties.action_link;
    console.log("Magic link generated successfully for:", email);

    // Send email via SendGrid
    await sendMagicLinkEmail(email, magicLink, undefined, buName || undefined);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in request-magic-link function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
