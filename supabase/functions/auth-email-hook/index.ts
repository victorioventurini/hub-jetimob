import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail, buildMagicLinkEmailHtml } from "../_shared/email-sender.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailPayload {
  user: {
    email: string;
    user_metadata?: {
      first_name?: string;
      display_name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
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
    const payload: AuthEmailPayload = await req.json();
    
    console.log("Received auth email hook payload for:", payload.user?.email);

    const { user, email_data } = payload;
    const { token_hash, redirect_to, email_action_type } = email_data;

    // Validate email domain against BU allowed domains
    const { allowed, buName } = await isEmailDomainAllowed(user.email);
    
    if (!allowed) {
      const domain = user.email.split('@')[1] || 'unknown';
      console.warn("Auth hook called with unauthorized email domain:", domain);
      return new Response(
        JSON.stringify({ 
          error: {
            http_code: 403,
            message: `O domínio @${domain} não está autorizado para acesso ao Hub.` 
          }
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Construct the magic link URL
    const magicLink = `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`;

    console.log("Constructed magic link for:", user.email, "BU:", buName);

    // Get display name - always use first name only for greetings
    const fullName = user.user_metadata?.first_name || 
                     user.user_metadata?.display_name || 
                     user.email.split('@')[0];
    const displayName = fullName.split(' ')[0]; // Use first name only

    // Build email HTML
    const html = buildMagicLinkEmailHtml({
      magicLink,
      displayName,
      buName: buName || undefined,
    });

    // Send email via SendGrid (with Resend fallback)
    const result = await sendEmail({
      to: user.email,
      subject: `Seu link de acesso ao Hub ${buName || "Jet"}`,
      html,
      from: {
        email: "no-reply@hub.jetimob.com",
        name: `Hub ${buName || "Jet"}`,
      },
    });

    if (!result.success) {
      console.error("Failed to send email:", result.error);
      return new Response(
        JSON.stringify({ 
          error: {
            http_code: 500,
            message: result.error || "Erro ao enviar email." 
          }
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Email sent successfully via ${result.provider} to: ${user.email}`);

    return new Response(JSON.stringify({ success: true, provider: result.provider }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in auth-email-hook function:", error);
    return new Response(
      JSON.stringify({ 
        error: {
          http_code: 500,
          message: error.message 
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
