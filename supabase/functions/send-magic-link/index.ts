import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail, buildMagicLinkEmailHtml } from "../_shared/email-sender.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MagicLinkRequest {
  email: string;
  magicLink: string;
}

// Check if email domain is allowed in any active BU
async function isEmailDomainAllowed(email: string): Promise<{ allowed: boolean; buName: string | null }> {
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
  for (const bu of data || []) {
    const allowedDomains = bu.allowed_email_domains || [];
    if (allowedDomains.some((d: string) => d.toLowerCase() === domain)) {
      return { allowed: true, buName: bu.name };
    }
  }

  return { allowed: false, buName: null };
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Server-side validation: Check if email domain is allowed
    const { allowed, buName } = await isEmailDomainAllowed(email);
    if (!allowed) {
      const domain = email.split('@')[1] || 'unknown';
      console.warn("Invalid email domain attempted:", domain);
      return new Response(
        JSON.stringify({ error: `O domínio @${domain} não está autorizado.` }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Sending magic link email to:", email);

    // Build email HTML
    const html = buildMagicLinkEmailHtml({
      magicLink,
      buName: buName || undefined,
    });

    // Send email via SendGrid (with Resend fallback)
    const result = await sendEmail({
      to: email,
      subject: "Seu link de acesso ao Hub Jetimob",
      html,
      from: {
        email: "no-reply@hub.jetimob.com",
        name: "Hub Jetimob",
      },
    });

    if (!result.success) {
      console.error("Failed to send email:", result.error);
      return new Response(
        JSON.stringify({ error: result.error || "Erro ao enviar email." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Email sent successfully via ${result.provider} to: ${email}`);

    return new Response(JSON.stringify({ success: true, provider: result.provider }), {
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
