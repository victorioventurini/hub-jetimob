/**
 * send-partner-invite
 * 
 * Sends an invitation email to a newly created partner contact.
 * Uses the notification template system (partner.invite) for customization.
 * 
 * Uses centralized error handling via _shared/error-handler.ts
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail } from "../_shared/email-sender.ts";
import { NO_REPLY_EMAIL } from "../_shared/constants.ts";
import { 
  withErrorHandling, 
  createErrorResponse,
  validateRequiredFields,
  validateUUID,
} from "../_shared/error-handler.ts";
import { corsHeaders } from "../_shared/middleware.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

interface PartnerInviteRequest {
  contact_id: string;
  bu_id: string;
}

interface TemplateResolution {
  template_id: string;
  version_id: string;
  subject: string | null;
  body: string;
  variables_used: string[];
  is_bu_override: boolean;
}

function renderTemplate(template: string, variables: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(String(value ?? ""));
  }
  // Remove any unresolved placeholders
  result = result.replace(/\{\{\w+\}\}/g, "");
  return result;
}

const handler = withErrorHandling(async (req: Request, requestId: string): Promise<Response> => {
  // Validate JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return createErrorResponse("UNAUTHORIZED", requestId, {
      message: "Missing authorization header",
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Validate the user's JWT
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return createErrorResponse("INVALID_TOKEN", requestId);
  }

  const body = await req.json() as PartnerInviteRequest;
  const { contact_id, bu_id } = body;

  // Validate required fields
  const validationError = validateRequiredFields(
    { contact_id, bu_id }, 
    ['contact_id', 'bu_id'], 
    requestId
  );
  if (validationError) return validationError;

  // Validate UUIDs
  const contactIdError = validateUUID(contact_id, 'contact_id', requestId);
  if (contactIdError) return contactIdError;
  
  const buIdError = validateUUID(bu_id, 'bu_id', requestId);
  if (buIdError) return buIdError;

  console.log(`[${requestId}] Processing invite for contact ${contact_id} in BU ${bu_id}`);

  // Fetch contact details (global contact model)
  const { data: contact, error: contactError } = await supabase
    .from("partner_contacts")
    .select(`
      id,
      name,
      email,
      external_company:external_companies(id, name)
    `)
    .eq("id", contact_id)
    .is("deleted_at", null)
    .single();

  if (contactError || !contact) {
    console.error(`[${requestId}] Contact not found:`, contactError);
    return createErrorResponse("NOT_FOUND", requestId, {
      message: "Contato não encontrado",
    });
  }

  // Verify contact has association with the specified BU
  const { data: assoc, error: assocError } = await supabase
    .from("partner_contact_bu_associations")
    .select("id, is_active")
    .eq("partner_contact_id", contact_id)
    .eq("bu_id", bu_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (assocError) {
    console.warn(`[${requestId}] Could not verify BU association:`, assocError);
    // Continue anyway - might be legacy contact with bu_id directly
  }

  // Fetch BU details separately
  const { data: buData } = await supabase
    .from("bu_units")
    .select("id, name")
    .eq("id", bu_id)
    .single();

  // deno-lint-ignore no-explicit-any
  const contactData = contact as any;
  const buName = buData?.name || "Hub";
  const companyName = contactData.external_company?.name || "Empresa Parceira";

  // Fetch inviter profile
  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("user_id", user.id)
    .single();

  const inviterName = inviterProfile 
    ? `${inviterProfile.first_name || ""} ${inviterProfile.last_name || ""}`.trim() || "Equipe"
    : "Equipe";

  // Get the template (with BU override support)
  const { data: templateData, error: templateError } = await supabase
    .rpc("resolve_notification_template", {
      p_event_slug: "partner.invite",
      p_channel: "email",
      p_bu_id: bu_id,
    });

  let subject = "Você foi convidado para acessar o Hub";
  let body_html = "";

  // Build base URL for access
  const accessUrl = `${SUPABASE_URL.replace(".supabase.co", "")}/auth`;

  if (templateError || !templateData || templateData.length === 0) {
    console.warn(`[${requestId}] No template found, using fallback`);
    
    subject = `Você foi convidado para acessar o Hub ${buName}`;
    body_html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: sans-serif; padding: 20px;">
        <h2>Olá, ${contactData.name}!</h2>
        <p>Você foi convidado(a) por <strong>${inviterName}</strong> para acessar o Hub como parceiro externo da empresa <strong>${companyName}</strong>.</p>
        <p>Acesse: <a href="${accessUrl}">${accessUrl}</a></p>
        <p>Use o e-mail <strong>${contactData.email}</strong> para fazer login.</p>
      </body>
      </html>
    `;
  } else {
    const template = templateData[0] as TemplateResolution;
    
    const variables: Record<string, unknown> = {
      contact_name: contactData.name,
      contact_email: contactData.email,
      company_name: companyName,
      bu_name: buName,
      invited_by: inviterName,
      access_url: accessUrl,
    };

    subject = renderTemplate(template.subject || subject, variables);
    body_html = renderTemplate(template.body, variables);
  }

  // Send email
  const result = await sendEmail({
    to: contactData.email,
    subject,
    html: body_html,
    from: {
      email: NO_REPLY_EMAIL,
      name: `Hub ${buName}`,
    },
  });

  if (!result.success) {
    console.error(`[${requestId}] Email failed:`, result.error);
    return createErrorResponse("SERVICE_UNAVAILABLE", requestId, {
      message: result.error || "Falha ao enviar email",
    });
  }

  console.log(`[${requestId}] Email sent successfully to ${contactData.email} via ${result.provider}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      provider: result.provider,
      email: contactData.email,
      requestId,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

serve(handler);
