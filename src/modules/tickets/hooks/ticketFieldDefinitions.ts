/**
 * Ticket Field Definitions
 * 
 * Centralized field selection strings for PostgREST queries.
 * Follows project standards: no select('*'), explicit fields only.
 */

export const TICKET_STALE_TIME = {
  list: 2 * 60 * 1000, // 2 minutes for lists
  detail: 60 * 1000,   // 1 minute for detail pages
} as const;

export const DEFAULT_LIMIT = 1000;

export const TICKET_FIELDS = {
  /** Core ticket fields for list view */
  ticketList: `
    id,
    bu_id,
    type,
    title,
    status,
    expected_due_at,
    created_by_user_id,
    owner_user_id,
    visibility,
    visibility_team_ids,
    visibility_squad_ids,
    visibility_user_ids,
    partner_company_id,
    category_id,
    subcategory_id,
    external_assignee_contact_ids,
    assigned_contact_id,
    assignment_source,
    created_at,
    updated_at,
    deleted_at,
    partner_company:partner_companies(id, name),
    category:ticket_categories(id, name),
    subcategory:ticket_subcategories(id, name),
    created_by:profiles!tickets_created_by_profile_fkey(id, display_name, photo_url),
    owner:profiles!tickets_owner_profile_fkey(id, display_name, photo_url),
    assigned_contact:partner_contacts!tickets_assigned_contact_id_fkey(id, name, email)
  `,

  /** Core ticket fields for detail view */
  ticketDetail: `
    id, bu_id, type, title, status,
    expected_due_at, visibility,
    created_by_user_id, owner_user_id, assigned_contact_id,
    partner_company_id, category_id, subcategory_id,
    created_at, updated_at,
    partner_company:partner_companies(id, name),
    category:ticket_categories(id, name),
    subcategory:ticket_subcategories(id, name),
    created_by:profiles!tickets_created_by_profile_fkey(id, display_name, photo_url),
    owner:profiles!tickets_owner_profile_fkey(id, display_name, photo_url),
    assigned_contact:partner_contacts!tickets_assigned_contact_id_fkey(id, name, email)
  `,

  /** Mentions query fields */
  mention: `
    entity_id,
    mentioned_user_id,
    mentioned_contact_id,
    mentioned_user:profiles!mentions_mentioned_user_id_fkey(id, display_name, photo_url),
    mentioned_contact:partner_contacts!mentions_mentioned_contact_id_fkey(id, name)
  `,

  /** Message batch fields */
  messageBatch: `ticket_id, created_at`,
} as const;
