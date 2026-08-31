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

/**
 * URL_DETONATION_DOMAINS
 *
 * Lista de domínios cujos servidores de email usam gateways de proteção
 * (Mimecast / Proofpoint / Microsoft Defender ATP) que fazem "URL detonation":
 * escaneiam o link clicando nele em sandbox ANTES de entregar — consumindo
 * o token single-use do magic link.
 *
 * Para esses domínios, o callback aponta para /auth/confirm em vez de
 * /auth/callback, exigindo um clique manual antes de chamar verifyOtp.
 *
 * Adicionar novos domínios aqui é seguro: backward-compatible e zero migração.
 */
const URL_DETONATION_DOMAINS = [
  "ferrigoloadvogados.com.br",
];

function shouldUseConfirmFlow(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return URL_DETONATION_DOMAINS.includes(domain);
}

function normalizeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }

  try {
    const url = new URL(raw, "https://next.jetimob.com");
    const nestedNext = url.searchParams.get("next");

    if ((url.pathname === "/auth/callback" || url.pathname === "/auth/confirm") && nestedNext) {
      return normalizeNextPath(nestedNext);
    }

    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return "/";
  }
}

/**
 * SSO VibeCoding — o Next é o provedor de identidade dos sistemas irmãos.
 * Um satélite (ex.: comercial.jetimob.com) manda o usuário para
 * `/auth?next=<url absoluta>`; após o login ele volta para lá. Só aceitamos
 * HTTPS em jetimob.com (e subdomínios) para evitar open redirect.
 */
function isAllowedSsoUrl(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return false;
    return url.hostname === "jetimob.com" || url.hostname.endsWith(".jetimob.com");
  } catch {
    return false;
  }
}

/**
 * Resolve o valor de `next` do callback: URL absoluta de um satélite
 * autorizado, ou caminho interno normalizado.
 */
function resolveNextValue(redirectUrl: URL): string {
  const rawNext = redirectUrl.searchParams.get("next");
  if (rawNext && isAllowedSsoUrl(rawNext)) return rawNext;
  if (rawNext) return normalizeNextPath(rawNext);
  return normalizeNextPath(
    `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`,
  );
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
    
    // 2. Check external company domain associations via external_company_bu_associations
    // TCR: "Empresa Parceira" → external_company_bu_associations → external_companies
    // FK: external_company_bu_associations.external_company_id → external_companies.id
    //     (constraint: partner_company_bu_associations_partner_company_id_fkey)
    // FK: external_company_bu_associations.bu_id → bu_units.id
    //     (constraint: partner_company_bu_associations_bu_id_fkey)
    supabase
      .from("external_company_bu_associations")
      .select(`
        id,
        bu_id,
        is_active,
        external_company:external_companies!partner_company_bu_associations_partner_company_id_fkey(id, name, allowed_domains, status),
        bu:bu_units!partner_company_bu_associations_bu_id_fkey(id, name, status)
      `)
      .eq("is_active", true)
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

  // Check external company domain associations via external_company_bu_associations (TCR-compliant)
  if (partnerBuAssociationsResult.data) {
    for (const assoc of partnerBuAssociationsResult.data as unknown as Array<{
      id: string;
      bu_id: string;
      is_active: boolean;
      external_company: { id: string; name: string; allowed_domains: string[]; status: string } | null;
      bu: { id: string; name: string; status: string } | null;
    }>) {
      const company = assoc.external_company;
      const bu = assoc.bu;
      const allowedDomains = company?.allowed_domains || [];
      
      if (company?.status === 'active' && bu?.status === 'active' && allowedDomains.some((d: string) => d.toLowerCase() === domain)) {
        console.log(`Partner domain: ${domain} (${company.name}) via BU association`);
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
      message: `O email ${email} não está autorizado para acesso ao Next.`,
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
  // For domains protected by URL detonation gateways, route to /auth/confirm
  // (manual confirmation page) instead of /auth/callback (auto-verify).
  const redirectUrl = new URL(redirectTo);
  const nextPath = resolveNextValue(redirectUrl);

  const useConfirm = shouldUseConfirmFlow(email);
  const callbackPath = useConfirm ? "/auth/confirm" : "/auth/callback";

  const callbackUrl = new URL(callbackPath, redirectUrl.origin);
  callbackUrl.searchParams.set("next", nextPath);
  callbackUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
  callbackUrl.searchParams.set("type", "magiclink");

  const magicLink = callbackUrl.toString();
  console.log(`[${requestId}] Magic link generated for: ${email} (flow: ${useConfirm ? "confirm" : "auto"})`);

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
    subject: `Seu link de acesso ao Next - ${formatEmailDateTime()}`,
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
