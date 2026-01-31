// =============================================
// MÓDULO TICKETS - TIPOS
// =============================================

// ===========================================
// ENUMS
// ===========================================

export type TicketType = 'internal' | 'external';
export type TicketStatus = 'waiting' | 'paused' | 'in_progress' | 'done' | 'discarded';
export type TicketVisibility = 'bu_all' | 'teams' | 'users' | 'private';
export type TicketCategoryScope = 'internal' | 'external' | 'both';
export type TicketParticipantType = 'internal_user' | 'partner_contact';
export type TicketParticipantRole = 'requester' | 'assignee' | 'watcher';
export type TicketAuthorType = 'internal_user' | 'partner_contact';
export type PartnerCompanyStatus = 'active' | 'inactive';
export type PartnerContactStatus = 'active' | 'inactive';

// ===========================================
// INTERFACES
// ===========================================

// Empresa Parceira
export interface PartnerCompany {
  id: string;
  bu_id?: string | null; // Now optional - global partners may not have direct bu_id
  name: string;
  legal_name: string | null;
  person_type?: string | null; // 'pf' | 'pj'
  document?: string | null;
  document_type?: string | null; // 'cpf' | 'cnpj'
  allowed_domains: string[];
  status: PartnerCompanyStatus;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Computed/Joined
  contacts_count?: number;
}

// Mapeamento de Serviço do Parceiro
export interface PartnerServiceMapping {
  id: string;
  bu_id: string;
  external_company_id: string;
  category_id: string;
  subcategory_id: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Contato Externo
export interface PartnerContact {
  id: string;
  bu_id: string;
  external_company_id: string;
  profile_user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: PartnerContactStatus;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  external_company?: { id: string; name: string } | null;
}

// Status de catálogo (enum do banco)
export type CatalogStatus = 'active' | 'inactive' | 'deprecated';

// Categoria de Ticket
export interface TicketCategory {
  id: string;
  bu_id: string;
  scope: TicketCategoryScope;
  name: string;
  description: string | null;
  status: CatalogStatus;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  subcategories?: TicketSubcategory[];
}

// Subcategoria de Ticket
export interface TicketSubcategory {
  id: string;
  bu_id: string;
  category_id: string;
  name: string;
  status: CatalogStatus;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  category?: { id: string; name: string } | null;
}

// Regra de Roteamento
export interface TicketRoutingRule {
  id: string;
  bu_id: string;
  external_company_id: string | null;
  subcategory_id: string | null;
  assignee_contact_ids: string[];
  watcher_contact_ids: string[];
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  external_company?: { id: string; name: string } | null;
  subcategory?: { id: string; name: string; category?: { id: string; name: string } } | null;
  assignee_contacts?: PartnerContact[];
  watcher_contacts?: PartnerContact[];
}

// Regra de Roteamento Interno
export interface TicketInternalRoutingRule {
  id: string;
  bu_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  assignee_user_ids: string[];
  assignee_team_ids: string[];
  assignee_squad_ids: string[];
  watcher_user_ids: string[];
  watcher_team_ids: string[];
  watcher_squad_ids: string[];
  priority: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  category?: { id: string; name: string; scope: TicketCategoryScope } | null;
  subcategory?: { 
    id: string; 
    name: string; 
    category?: { id: string; name: string; scope: TicketCategoryScope } 
  } | null;
}

// Ticket (Entidade Principal)
export interface Ticket {
  id: string;
  bu_id: string;
  type: TicketType;
  title: string;
  status: TicketStatus;
  expected_due_at: string | null;
  created_by_user_id: string;
  owner_user_id: string | null;
  visibility: TicketVisibility;
  visibility_team_ids: string[];
  visibility_squad_ids: string[];
  visibility_user_ids: string[];
  external_company_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  external_assignee_contact_ids: string[];
  // Contact-first routing fields (v2.4+)
  assigned_contact_id: string | null;
  assignment_source: 'contact_capability' | 'routing_fallback' | 'manual' | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined (using actual database field names from profiles table)
  created_by?: { id: string; display_name: string; photo_url: string | null } | null;
  owner?: { id: string; display_name: string; photo_url: string | null } | null;
  external_company?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  subcategory?: { id: string; name: string } | null;
  assigned_contact?: { id: string; name: string; email: string } | null;
  participants?: TicketParticipant[];
  messages_count?: number;
  attachments_count?: number;
  last_message_at?: string | null;
  mentions_list?: { id: string; display_name: string; photo_url: string | null; type: 'user' | 'contact' }[];
}

// Participante de Ticket
// IDENTITY v2.1: profile_id armazena profiles.id (renomeado de user_id em v2.51.0)
export interface TicketParticipant {
  id: string;
  bu_id: string;
  ticket_id: string;
  participant_type: TicketParticipantType;
  profile_id: string | null; // IDENTITY: profiles.id (v2.51.0 rename)
  partner_contact_id: string | null;
  role: TicketParticipantRole;
  is_active: boolean;
  created_at: string;
  // Joined (using actual database field names from profiles table)
  user?: { id: string; display_name: string; photo_url: string | null } | null;
  partner_contact?: { id: string; name: string; email: string } | null;
}

// Mensagem de Ticket
export interface TicketMessage {
  id: string;
  bu_id: string;
  ticket_id: string;
  author_type: TicketAuthorType;
  author_user_id: string | null;
  author_contact_id: string | null;
  body_richtext: RichTextContent;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  // Pinned message support
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_by_user_id: string | null;
  // Reply support (v2.72+)
  reply_to_message_id: string | null;
  // Joined (using actual database field names from profiles table)
  author_user?: { id: string; display_name: string; photo_url: string | null } | null;
  author_contact?: { id: string; name: string; email: string } | null;
  pinned_by?: { id: string; display_name: string } | null;
  attachments?: TicketAttachment[];
  mentions?: TicketMention[];
  // Reply joined data
  reply_to?: {
    id: string;
    body_richtext: RichTextContent;
    author_user?: { id: string; display_name: string } | null;
    author_contact?: { id: string; name: string } | null;
  } | null;
}

// Tipo para conteúdo rich text (JSON) - suporta texto simples ou estrutura rica
export type RichTextContent = SimpleTextContent | TiptapContent | Record<string, unknown>;

export interface SimpleTextContent {
  type: 'text';
  content: string;
}

export interface TiptapContent {
  type: 'doc';
  content: RichTextNode[];
}

export interface RichTextNode {
  type: string;
  text?: string;
  marks?: { type: string }[];
  content?: RichTextNode[];
  attrs?: Record<string, unknown>;
}

// Anexo de Ticket
export interface TicketAttachment {
  id: string;
  bu_id: string;
  ticket_id: string;
  message_id: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by_user_id: string | null;
  created_at: string;
  deleted_at: string | null;
  // Joined (using actual database field names from profiles table)
  uploaded_by?: { id: string; display_name: string } | null;
}

// Menção em Ticket
export interface TicketMention {
  id: string;
  bu_id: string;
  ticket_id: string;
  message_id: string;
  mentioned_user_id: string | null;
  mentioned_contact_id: string | null;
  created_at: string;
  // Joined (using actual database field names from profiles table)
  mentioned_user?: { id: string; display_name: string } | null;
  mentioned_contact?: { id: string; name: string } | null;
}

// ===========================================
// LABELS PARA UI
// ===========================================

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  internal: 'Interno',
  external: 'Externo',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  waiting: 'Aguardando',
  paused: 'Pausado',
  in_progress: 'Em Andamento',
  done: 'Concluído',
  discarded: 'Descartado',
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  waiting: 'bg-status-yellow-muted text-status-yellow-muted-foreground border-status-yellow/20',
  paused: 'bg-status-gray-muted text-status-gray-muted-foreground border-status-gray/20',
  in_progress: 'bg-info-muted text-info-muted-foreground border-info/20',
  done: 'bg-status-green-muted text-status-green-muted-foreground border-status-green/20',
  discarded: 'bg-status-red-muted text-status-red-muted-foreground border-status-red/20',
};

export const TICKET_VISIBILITY_LABELS: Record<TicketVisibility, string> = {
  bu_all: 'Toda a BU',
  teams: 'Times Selecionados',
  users: 'Usuários Selecionados',
  private: 'Privado',
};

export const TICKET_CATEGORY_SCOPE_LABELS: Record<TicketCategoryScope, string> = {
  internal: 'Apenas Interno',
  external: 'Apenas Externo',
  both: 'Ambos',
};

export const TICKET_PARTICIPANT_ROLE_LABELS: Record<TicketParticipantRole, string> = {
  requester: 'Solicitante',
  assignee: 'Responsável',
  watcher: 'Observador',
};

export const PARTNER_STATUS_LABELS: Record<PartnerCompanyStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

// ===========================================
// TIPOS AUXILIARES
// ===========================================

// Filtros para listagem de tickets
export interface TicketFilters {
  type?: TicketType;
  status?: TicketStatus | TicketStatus[];
  category_id?: string;
  subcategory_id?: string;
  external_company_id?: string;
  owner_user_id?: string;
  assigned_contact_id?: string;
  created_by_user_id?: string;
  overdue?: boolean;
  search?: string;
  // Pagination
  page?: number;
  pageSize?: number;
}

// Response type for paginated ticket queries
export interface PaginatedTicketsResponse {
  data: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dados para criar ticket
export interface CreateTicketData {
  type: TicketType;
  title: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  external_company_id?: string | null;
  // External contact assignment (contact-first routing v2.4+)
  assigned_contact_id?: string | null;
  assignment_source?: 'contact_capability' | 'routing_fallback' | 'manual' | null;
  visibility: TicketVisibility;
  visibility_team_ids?: string[];
  visibility_squad_ids?: string[];
  visibility_user_ids?: string[];
  expected_due_at?: string | null;
  initial_message?: RichTextContent;
  initial_message_mentions?: {
    user_id?: string | null;
    contact_id?: string | null;
  }[];
  attachments?: File[];
  participants?: {
    type: TicketParticipantType;
    id: string;
    role: TicketParticipantRole;
  }[];
}

// Dados para atualizar ticket
export interface UpdateTicketData {
  title?: string;
  status?: TicketStatus;
  owner_user_id?: string;
  category_id?: string;
  subcategory_id?: string;
  visibility?: TicketVisibility;
  visibility_team_ids?: string[];
  visibility_squad_ids?: string[];
  visibility_user_ids?: string[];
  expected_due_at?: string | null;
}

// Dados para criar mensagem
export interface CreateMessageData {
  body_richtext: RichTextContent;
  attachments?: File[];
  mentions?: {
    user_id?: string;
    contact_id?: string;
  }[];
  /** ID da mensagem sendo respondida (reply) */
  reply_to_message_id?: string | null;
}

// ===========================================
// HELPERS
// ===========================================

export function getStatusLabel(status: TicketStatus): string {
  return TICKET_STATUS_LABELS[status];
}

export function getTypeLabel(type: TicketType): string {
  return TICKET_TYPE_LABELS[type];
}

export function isTicketOverdue(ticket: Ticket): boolean {
  if (!ticket.expected_due_at) return false;
  if (ticket.status === 'done' || ticket.status === 'discarded') return false;
  return new Date(ticket.expected_due_at) < new Date();
}

export function getTicketPriorityFromDue(dueAt: string | null): 'high' | 'medium' | 'low' | null {
  if (!dueAt) return null;
  const now = new Date();
  const due = new Date(dueAt);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'high'; // Atrasado
  if (diffDays <= 2) return 'high'; // Vence em 2 dias
  if (diffDays <= 7) return 'medium'; // Vence em 1 semana
  return 'low';
}
