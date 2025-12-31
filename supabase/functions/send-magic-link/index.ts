import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

// Allowed email domain for security
const ALLOWED_EMAIL_DOMAIN = "@jetimob.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MagicLinkRequest {
  email: string;
  magicLink: string;
}

// Validate email format and domain
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, magicLink }: MagicLinkRequest = await req.json();

    // Server-side validation: Email and magicLink are required
    if (!email || !magicLink) {
      console.warn("Missing required fields: email or magicLink");
      return new Response(
        JSON.stringify({ error: "Email and magicLink are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Server-side validation: Only allow @jetimob.com emails
    if (!isValidEmail(email)) {
      console.warn("Invalid email domain attempted:", email.split('@')[1] || 'unknown');
      return new Response(
        JSON.stringify({ error: "Only @jetimob.com emails are allowed" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Sending magic link email to:", email);

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
            subject: "Seu link de acesso ao Hub Jetimob",
          },
        ],
        from: {
          email: "no-reply@hub.jetimob.com",
          name: "Hub Jetimob",
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
                    <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 600;">Hub Jetimob</h1>
                  </div>
                  
                  <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    Olá! 👋
                  </p>
                  
                  <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                    Clique no botão abaixo para acessar o Hub Jetimob. Este link é válido por 1 hora.
                  </p>
                  
                  <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Acessar Hub Jetimob
                    </a>
                  </div>
                  
                  <p style="color: #71717a; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
                    Se você não solicitou este link, pode ignorar este email com segurança.
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
                  
                  <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
                    O ponto de encontro dos Jetimobers para evoluir, executar e simplificar o morar.
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-magic-link function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
