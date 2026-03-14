/**
 * Centralized constants for Edge Functions
 * 
 * All environment-specific values (domain, sender emails) are centralized here
 * to support domain migration and white-labeling.
 * 
 * @see memory: architecture/domain-centralization-standard
 * @module _shared/constants
 * @version 1.0.0
 */

/** Base URL of the application (used for links in emails, webhooks, Slack) */
export const SITE_URL = Deno.env.get("SITE_URL") || "https://hub.jetimob.com";

/** No-reply sender email for transactional emails */
export const NO_REPLY_EMAIL = Deno.env.get("NO_REPLY_EMAIL") || "no-reply@hub.jetimob.com";

/** Default sender name for emails */
export const DEFAULT_SENDER_NAME = "Hub";

/** Global BCC email for observability (all emails are silently copied) */
export const GLOBAL_BCC_EMAIL = "hub@jetimob.com";
