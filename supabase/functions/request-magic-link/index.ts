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
  redirectTo: string;
}

// Check if email domain is allowed in any active BU
async function getEmailBu(email: string): Promise<{ allowed: boolean; buName: string | null; isPartnerContact: boolean }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const emailLower = email.toLowerCase();
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { allowed: false, buName: null, isPartnerContact: false };
  }

  // First, check if email is in partner_contacts allowlist (Modo B - external users)
  const { data: partnerContact, error: partnerError } = await supabase
    .from("partner_contacts")
    .select(`
      id,
      bu_id,
      partner_company:partner_companies!inner(id, name, status),
      bu:bu_units!inner(id, name, status)
    `)
    .eq("email", emailLower)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (partnerError) {
    console.error("Error checking partner contact:", partnerError);
  }

  if (partnerContact) {
    // Handle the join result - it returns the first matching record due to !inner
    const company = partnerContact.partner_company as unknown as { id: string; name: string; status: string } | null;
    const bu = partnerContact.bu as unknown as { id: string; name: string; status: string } | null;
    
    if (company?.status === 'active' && bu?.status === 'active') {
      console.log(`Partner contact found: ${emailLower} from ${company.name}`);
      return { allowed: true, buName: bu.name, isPartnerContact: true };
    }
  }

  // Second, check if domain is allowed in any BU (internal users)
  const { data, error } = await supabase
    .from("bu_units")
    .select("id, name, allowed_email_domains")
    .eq("status", "active");

  if (error) {
    console.error("Error checking email domain:", error);
    return { allowed: false, buName: null, isPartnerContact: false };
  }

  // Check if domain exists in any BU's allowed_email_domains
  for (const bu of (data as { id: string; name: string; allowed_email_domains: string[] }[]) || []) {
    const allowedDomains = bu.allowed_email_domains || [];
    if (allowedDomains.some((d: string) => d.toLowerCase() === domain)) {
      return { allowed: true, buName: bu.name, isPartnerContact: false };
    }
  }

  return { allowed: false, buName: null, isPartnerContact: false };
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

    // Check if email domain is allowed or is a partner contact
    const { allowed, buName, isPartnerContact } = await getEmailBu(email);
    
    if (!allowed) {
      const domain = email.split('@')[1] || 'unknown';
      console.warn("Unauthorized email attempted:", email, "domain:", domain);
      return new Response(
        JSON.stringify({ error: `O email ${email} não está autorizado para acesso ao Hub.` }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const userType = isPartnerContact ? "partner contact" : "internal user";
    console.log(`Generating magic link for ${email} (BU: ${buName}, type: ${userType})`);

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

    // Get display name from email
    const displayName = email.split('@')[0].split('.')[0];

    // Build email HTML
    const html = buildMagicLinkEmailHtml({
      magicLink,
      displayName,
      buName: buName || undefined,
    });

    // Send email via SendGrid (with Resend fallback)
    const result = await sendEmail({
      to: email,
      subject: `Seu código de acesso ao Hub da Jet`,
      html,
      from: {
        email: "no-reply@hub.jetimob.com",
        name: "Hub",
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
