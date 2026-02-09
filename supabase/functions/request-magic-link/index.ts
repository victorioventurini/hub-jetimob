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
import { createServiceClient, getSupabaseUrl, getSupabaseServiceKey } from "../_shared/client.ts";

interface MagicLinkRequest {
  email: string;
  redirectTo: string;
}

// Check if email domain is allowed in any active BU
// OPTIMIZED v2: ALL queries in parallel, no sequential follow-ups
async function getEmailBu(email: string): Promise<{ allowed: boolean; buName: string | null; isPartnerContact: boolean }> {
  const supabase = createServiceClient();
  
  const emailLower = email.toLowerCase();
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { allowed: false, buName: null, isPartnerContact: false };
  }

  // Run ALL checks in PARALLEL for maximum speed - no sequential follow-ups
  const [
    partnerContactWithAssociationsResult,
    partnerBuAssociationsResult,
    buUnitsResult,
    profileResult
  ] = await Promise.all([
    // 1. Check partner contacts WITH their company and BU associations in one query
    // FK: partner_contacts.external_company_id -> external_companies.id (constraint: partner_contacts_partner_company_id_fkey)
    supabase
      .from("partner_contacts")
      .select(`
        id,
        name,
        email,
        bu_id,
        partner_company:external_companies!partner_contacts_partner_company_id_fkey(id, name, status, allowed_domains),
        partner_contact_bu_associations!left(
          id,
          bu_id,
          is_active,
          deleted_at,
          bu:bu_units!partner_contact_bu_associations_bu_id_fkey(id, name, status)
        ),
        legacy_bu:bu_units!partner_contacts_bu_id_fkey(id, name, status)
      `)
      .eq("email", emailLower)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle(),
    
    // 2. Check external company domain associations via external_companies table
    // For domain-based matching when no direct partner_contact exists
    supabase
      .from("external_companies")
      .select(`
        id,
        name,
        allowed_domains,
        status,
        bu_id,
        bu:bu_units!partner_companies_bu_id_fkey(id, name, status)
      `)
      .eq("status", "active")
      .is("deleted_at", null),
    
    // 3. Get all active BUs with their domains
    supabase
      .from("bu_units")
      .select("id, name, allowed_email_domains")
      .eq("status", "active"),
    
    // 4. Check if internal user has profile (for domain validation)
    supabase
      .from("profiles")
      .select("id")
      .eq("work_email", emailLower)
      .is("deleted_at", null)
      .limit(1)
  ]);

  // Process partner contact (Mode B - external users)
  const partnerContact = partnerContactWithAssociationsResult.data;
  if (partnerContact) {
    const company = partnerContact.partner_company as unknown as { id: string; name: string; status: string } | null;
    
    if (company?.status === 'active') {
      // Check active BU associations from the pre-fetched data
      const associations = partnerContact.partner_contact_bu_associations as unknown as Array<{
        id: string;
        bu_id: string;
        is_active: boolean;
        deleted_at: string | null;
        bu: { id: string; name: string; status: string } | null;
      }> | null;

      if (associations && associations.length > 0) {
        const firstActiveBu = associations.find(a => 
          a.is_active && 
          !a.deleted_at && 
          a.bu?.status === 'active'
        );
        
        if (firstActiveBu?.bu) {
          console.log(`Partner contact: ${emailLower} (${company.name})`);
          return { allowed: true, buName: firstActiveBu.bu.name, isPartnerContact: true };
        }
      }
      
      // Fallback: check legacy bu_id field (already fetched)
      const legacyBu = partnerContact.legacy_bu as unknown as { id: string; name: string; status: string } | null;
      if (legacyBu?.status === 'active') {
        console.log(`Partner contact (legacy): ${emailLower}`);
        return { allowed: true, buName: legacyBu.name, isPartnerContact: true };
      }
    }
  }

  // Check external company domain associations (fallback when no direct partner_contact match)
  if (partnerBuAssociationsResult.data) {
    for (const company of partnerBuAssociationsResult.data as Array<{ id: string; name: string; allowed_domains: string[]; status: string; bu_id: string; bu: { id: string; name: string; status: string } | null }>) {
      const allowedDomains = company.allowed_domains || [];
      const bu = company.bu;
      
      if (bu?.status === 'active' && allowedDomains.some((d: string) => d.toLowerCase() === domain)) {
        console.log(`Partner domain: ${domain} (${company.name})`);
        return { allowed: true, buName: bu.name, isPartnerContact: true };
      }
    }
  }

  // Check internal users (domain + profile check) - profile already fetched in parallel
  if (buUnitsResult.data) {
    for (const bu of buUnitsResult.data as { id: string; name: string; allowed_email_domains: string[] }[]) {
      const allowedDomains = bu.allowed_email_domains || [];
      if (allowedDomains.some((d: string) => d.toLowerCase() === domain)) {
        // Domain matches - use pre-fetched profile check
        if (!profileResult.data || profileResult.data.length === 0) {
          console.warn(`Internal user ${emailLower} - NO profile - DENIED`);
          return { allowed: false, buName: null, isPartnerContact: false };
        }

        console.log(`Internal user: ${emailLower}`);
        return { allowed: true, buName: bu.name, isPartnerContact: false };
      }
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

  // Create Supabase admin client using centralized factory
  const supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
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
    provider: emailResult.provider,
    message: "Link de acesso enviado por email",
    requestId,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

serve(handler);
