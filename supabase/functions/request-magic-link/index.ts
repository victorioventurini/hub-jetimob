import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail, buildMagicLinkEmailHtml, formatEmailDateTime } from "../_shared/email-sender.ts";

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

  // 1. Check if email is a registered partner contact (Modo B - external users)
  const { data: partnerContacts, error: partnerError } = await supabase
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
    .limit(1);

  if (partnerError) {
    console.error("Error checking partner contact:", partnerError);
  }

  if (partnerContacts && partnerContacts.length > 0) {
    const partnerContact = partnerContacts[0];
    const company = partnerContact.partner_company as unknown as { id: string; name: string; status: string } | null;
    const bu = partnerContact.bu as unknown as { id: string; name: string; status: string } | null;
    
    if (company?.status === 'active' && bu?.status === 'active') {
      console.log(`Partner contact found: ${emailLower} from ${company.name}`);
      return { allowed: true, buName: bu.name, isPartnerContact: true };
    }
  }

  // 2. Check if domain is in partner_companies.allowed_domains (any email from authorized partner domain)
  const { data: partnerCompanies, error: partnerCompanyError } = await supabase
    .from("partner_companies")
    .select(`
      id,
      name,
      allowed_domains,
      status,
      bu:bu_units!inner(id, name, status)
    `)
    .eq("status", "active")
    .is("deleted_at", null);

  if (partnerCompanyError) {
    console.error("Error checking partner company domains:", partnerCompanyError);
  }

  if (partnerCompanies) {
    for (const company of partnerCompanies) {
      const allowedDomains = (company.allowed_domains as string[]) || [];
      const bu = company.bu as unknown as { id: string; name: string; status: string } | null;
      
      if (bu?.status === 'active' && allowedDomains.some((d: string) => d.toLowerCase() === domain)) {
        console.log(`Partner company domain authorized: ${domain} from ${company.name}`);
        return { allowed: true, buName: bu.name, isPartnerContact: true };
      }
    }
  }

  // 3. Check if domain is allowed in any BU (internal users)
  const { data, error } = await supabase
    .from("bu_units")
    .select("id, name, allowed_email_domains")
    .eq("status", "active");

  if (error) {
    console.error("Error checking email domain:", error);
    return { allowed: false, buName: null, isPartnerContact: false };
  }

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

    // Generate magic link using admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Error generating magic link:", linkError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de acesso. Tente novamente." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const magicLink = linkData.properties.action_link;
    console.log("Magic link generated successfully for:", email);

    // Get display name from email
    const displayName = email.split('@')[0].split('.')[0];

    // Build and send email via SendGrid
    const emailHtml = buildMagicLinkEmailHtml({
      magicLink,
      displayName,
      buName: buName || undefined,
    });

    const emailResult = await sendEmail({
      to: email,
      subject: `Seu link de acesso ao Hub - ${formatEmailDateTime()}`,
      html: emailHtml,
    });

    if (!emailResult.success) {
      console.error("Error sending magic link email:", emailResult.error);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar email. Tente novamente." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Magic link sent successfully to: ${email}`);

    return new Response(JSON.stringify({ 
      success: true, 
      provider: "sendgrid",
      message: "Link de acesso enviado por email" 
    }), {
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
