/**
 * request-magic-link
 * 
 * Generates and sends magic link for authentication.
 * Validates email domain against BU settings and partner contacts.
 * 
 * Uses centralized error handling via _shared/error-handler.ts
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail, buildMagicLinkEmailHtml, formatEmailDateTime } from "../_shared/email-sender.ts";
import { 
  withErrorHandling, 
  createErrorResponse,
  validateRequiredFields,
} from "../_shared/error-handler.ts";
import { corsHeaders } from "../_shared/middleware.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

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
  // Query using global email identity model with BU associations
  const { data: partnerContact, error: partnerError } = await supabase
    .from("partner_contacts")
    .select(`
      id,
      name,
      partner_company:partner_companies!inner(id, name, status)
    `)
    .eq("email", emailLower)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (partnerError) {
    console.error("Error checking partner contact:", partnerError);
  }

  if (partnerContact) {
    const company = partnerContact.partner_company as unknown as { id: string; name: string; status: string } | null;
    
    if (company?.status === 'active') {
      // Check for active BU associations
      const { data: associations, error: assocError } = await supabase
        .from("partner_contact_bu_associations")
        .select(`
          id,
          bu_id,
          is_active,
          bu:bu_units!inner(id, name, status)
        `)
        .eq("partner_contact_id", partnerContact.id)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (assocError) {
        console.warn("Error checking partner contact associations:", assocError);
      }

      if (associations && associations.length > 0) {
        const firstActiveBu = associations.find(a => {
          const bu = a.bu as unknown as { id: string; name: string; status: string } | null;
          return bu?.status === 'active';
        });
        
        if (firstActiveBu) {
          const bu = firstActiveBu.bu as unknown as { id: string; name: string } | null;
          console.log(`Partner contact found: ${emailLower} from ${company.name} with active BU association`);
          return { allowed: true, buName: bu?.name || null, isPartnerContact: true };
        }
      }
      
      // Fallback: check legacy bu_id field (for contacts not yet migrated to associations)
      const { data: legacyContact } = await supabase
        .from("partner_contacts")
        .select(`bu:bu_units!inner(id, name, status)`)
        .eq("id", partnerContact.id)
        .maybeSingle();

      if (legacyContact) {
        const bu = legacyContact.bu as unknown as { id: string; name: string; status: string } | null;
        if (bu?.status === 'active') {
          console.log(`Partner contact found via legacy bu_id: ${emailLower} from ${company.name}`);
          return { allowed: true, buName: bu.name, isPartnerContact: true };
        }
      }
    }
  }

  // 2. Check if domain is in partner_companies.allowed_domains via BU associations
  // Query partner companies with active BU associations
  const { data: partnerBuAssociations, error: partnerCompanyError } = await supabase
    .from("partner_company_bu_associations")
    .select(`
      id,
      bu_id,
      is_active,
      partner_company:partner_companies!inner(id, name, allowed_domains, status),
      bu:bu_units!inner(id, name, status)
    `)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (partnerCompanyError) {
    console.error("Error checking partner company domains:", partnerCompanyError);
  }

  if (partnerBuAssociations) {
    for (const assoc of partnerBuAssociations) {
      const company = assoc.partner_company as unknown as { id: string; name: string; allowed_domains: string[]; status: string } | null;
      const bu = assoc.bu as unknown as { id: string; name: string; status: string } | null;
      const allowedDomains = company?.allowed_domains || [];
      
      if (company?.status === 'active' && bu?.status === 'active' && allowedDomains.some((d: string) => d.toLowerCase() === domain)) {
        console.log(`Partner company domain authorized: ${domain} from ${company.name} in BU ${bu.name}`);
        return { allowed: true, buName: bu.name, isPartnerContact: true };
      }
    }
  }

  // 3. Check if domain is allowed in any BU (internal users)
  // IMPORTANT: Internal users MUST have a pre-existing profile to receive magic link
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
      // Domain matches - now verify user has a pre-existing profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, work_email")
        .eq("work_email", emailLower)
        .is("deleted_at", null)
        .limit(1);

      if (profileError) {
        console.error("Error checking user profile:", profileError);
        return { allowed: false, buName: null, isPartnerContact: false };
      }

      if (!profileData || profileData.length === 0) {
        console.warn(`Internal user ${emailLower} has valid domain but NO pre-existing profile - ACCESS DENIED`);
        return { allowed: false, buName: null, isPartnerContact: false };
      }

      console.log(`Internal user ${emailLower} verified with pre-existing profile`);
      return { allowed: true, buName: bu.name, isPartnerContact: false };
    }
  }

  return { allowed: false, buName: null, isPartnerContact: false };
}

const handler = withErrorHandling(async (req: Request, requestId: string): Promise<Response> => {
  const body = await req.json() as MagicLinkRequest;
  const { email, redirectTo } = body;

  // Validate required fields using centralized validation
  const validationError = validateRequiredFields(
    { email, redirectTo }, 
    ['email', 'redirectTo'], 
    requestId
  );
  if (validationError) return validationError;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return createErrorResponse("INVALID_FORMAT", requestId, {
      message: "Email inválido",
      details: { field: "email" },
    });
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
    console.warn(`[${requestId}] Unauthorized email attempted: ${email}, domain: ${domain}`);
    return createErrorResponse("FORBIDDEN", requestId, {
      message: `O email ${email} não está autorizado para acesso ao Hub.`,
    });
  }

  const userType = isPartnerContact ? "partner contact" : "internal user";
  console.log(`[${requestId}] Generating magic link for ${email} (BU: ${buName}, type: ${userType})`);

  // Generate magic link using admin API
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo,
    },
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error(`[${requestId}] Error generating magic link:`, linkError);
    return createErrorResponse("INTERNAL_ERROR", requestId, {
      message: "Erro ao gerar link de acesso. Tente novamente.",
    });
  }

  // Build callback URL with token_hash as query param to survive SendGrid click tracking.
  const redirectUrl = new URL(redirectTo);
  const nextPath = `${redirectUrl.pathname}${redirectUrl.search}` || "/";

  const callbackUrl = new URL("/auth/callback", redirectUrl.origin);
  callbackUrl.searchParams.set("next", nextPath);
  callbackUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
  callbackUrl.searchParams.set("type", "magiclink");

  const magicLink = callbackUrl.toString();
  console.log(`[${requestId}] Magic link generated successfully for: ${email}`);

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
    console.error(`[${requestId}] Error sending magic link email:`, emailResult.error);
    return createErrorResponse("SERVICE_UNAVAILABLE", requestId, {
      message: "Erro ao enviar email. Tente novamente.",
    });
  }

  console.log(`[${requestId}] Magic link sent successfully to: ${email}`);

  return new Response(JSON.stringify({ 
    success: true, 
    provider: "sendgrid",
    message: "Link de acesso enviado por email",
    requestId,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

serve(handler);
