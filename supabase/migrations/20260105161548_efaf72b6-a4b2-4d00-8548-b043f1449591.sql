-- =============================================
-- MÓDULO TICKETS - FASE 1: SCHEMA COMPLETO
-- =============================================

-- ===========================================
-- 1. ENUMS
-- ===========================================

-- Tipo de ticket
CREATE TYPE public.ticket_type AS ENUM ('internal', 'external');

-- Status do ticket
CREATE TYPE public.ticket_status AS ENUM ('waiting', 'paused', 'in_progress', 'done', 'discarded');

-- Visibilidade do ticket
CREATE TYPE public.ticket_visibility AS ENUM ('bu_all', 'teams', 'users', 'private');

-- Escopo de categoria
CREATE TYPE public.ticket_category_scope AS ENUM ('internal', 'external', 'both');

-- Tipo de participante
CREATE TYPE public.ticket_participant_type AS ENUM ('internal_user', 'partner_contact');

-- Papel do participante
CREATE TYPE public.ticket_participant_role AS ENUM ('requester', 'assignee', 'watcher');

-- Tipo de autor de mensagem
CREATE TYPE public.ticket_author_type AS ENUM ('internal_user', 'partner_contact');

-- Status de empresa parceira
CREATE TYPE public.partner_company_status AS ENUM ('active', 'inactive');

-- Status de contato parceiro
CREATE TYPE public.partner_contact_status AS ENUM ('active', 'inactive');

-- ===========================================
-- 2. TABELAS
-- ===========================================

-- 2.1 partner_companies - Empresas Parceiras
CREATE TABLE public.partner_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  name text NOT NULL,
  legal_name text,
  allowed_domains text[] DEFAULT '{}',
  status public.partner_company_status NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_partner_companies_bu ON public.partner_companies(bu_id);
CREATE INDEX idx_partner_companies_status ON public.partner_companies(status) WHERE deleted_at IS NULL;

-- 2.2 partner_contacts - Contatos Externos
CREATE TABLE public.partner_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  partner_company_id uuid NOT NULL REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  profile_user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  status public.partner_contact_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_partner_contacts_bu ON public.partner_contacts(bu_id);
CREATE INDEX idx_partner_contacts_company ON public.partner_contacts(partner_company_id);
CREATE INDEX idx_partner_contacts_email ON public.partner_contacts(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_partner_contacts_user ON public.partner_contacts(profile_user_id) WHERE profile_user_id IS NOT NULL;

-- 2.3 ticket_categories - Categorias
CREATE TABLE public.ticket_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  scope public.ticket_category_scope NOT NULL DEFAULT 'both',
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_ticket_categories_bu ON public.ticket_categories(bu_id);

-- 2.4 ticket_subcategories - Subcategorias
CREATE TABLE public.ticket_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.ticket_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_ticket_subcategories_bu ON public.ticket_subcategories(bu_id);
CREATE INDEX idx_ticket_subcategories_category ON public.ticket_subcategories(category_id);

-- 2.5 ticket_routing_rules - Regras de Roteamento
CREATE TABLE public.ticket_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  partner_company_id uuid REFERENCES public.partner_companies(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES public.ticket_subcategories(id) ON DELETE CASCADE,
  assignee_contact_ids uuid[] DEFAULT '{}',
  watcher_contact_ids uuid[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_ticket_routing_bu ON public.ticket_routing_rules(bu_id);
CREATE INDEX idx_ticket_routing_partner ON public.ticket_routing_rules(partner_company_id);
CREATE INDEX idx_ticket_routing_subcategory ON public.ticket_routing_rules(subcategory_id);

-- 2.6 tickets - Entidade Principal
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  type public.ticket_type NOT NULL,
  title text NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'waiting',
  expected_due_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  owner_user_id uuid REFERENCES auth.users(id),
  visibility public.ticket_visibility NOT NULL DEFAULT 'bu_all',
  visibility_team_ids uuid[] DEFAULT '{}',
  visibility_squad_ids uuid[] DEFAULT '{}',
  visibility_user_ids uuid[] DEFAULT '{}',
  partner_company_id uuid REFERENCES public.partner_companies(id),
  category_id uuid REFERENCES public.ticket_categories(id),
  subcategory_id uuid REFERENCES public.ticket_subcategories(id),
  external_assignee_contact_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_tickets_bu ON public.tickets(bu_id);
CREATE INDEX idx_tickets_status ON public.tickets(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_type ON public.tickets(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_owner ON public.tickets(owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_created_by ON public.tickets(created_by_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_partner ON public.tickets(partner_company_id) WHERE partner_company_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_tickets_due ON public.tickets(expected_due_at) WHERE expected_due_at IS NOT NULL AND deleted_at IS NULL;

-- 2.7 ticket_participants - Participantes
CREATE TABLE public.ticket_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  participant_type public.ticket_participant_type NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  partner_contact_id uuid REFERENCES public.partner_contacts(id),
  role public.ticket_participant_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_participants_ticket ON public.ticket_participants(ticket_id);
CREATE INDEX idx_ticket_participants_user ON public.ticket_participants(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ticket_participants_contact ON public.ticket_participants(partner_contact_id) WHERE partner_contact_id IS NOT NULL;

-- 2.8 ticket_messages - Mensagens (Thread)
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_type public.ticket_author_type NOT NULL,
  author_user_id uuid REFERENCES auth.users(id),
  author_contact_id uuid REFERENCES public.partner_contacts(id),
  body_richtext jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_author_user ON public.ticket_messages(author_user_id) WHERE author_user_id IS NOT NULL;

-- 2.9 ticket_attachments - Anexos
CREATE TABLE public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.ticket_messages(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_ticket_attachments_ticket ON public.ticket_attachments(ticket_id);
CREATE INDEX idx_ticket_attachments_message ON public.ticket_attachments(message_id) WHERE message_id IS NOT NULL;

-- 2.10 ticket_mentions - Menções
CREATE TABLE public.ticket_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES public.bu_units(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.ticket_messages(id) ON DELETE CASCADE,
  mentioned_user_id uuid REFERENCES auth.users(id),
  mentioned_contact_id uuid REFERENCES public.partner_contacts(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_mentions_ticket ON public.ticket_mentions(ticket_id);
CREATE INDEX idx_ticket_mentions_message ON public.ticket_mentions(message_id);
CREATE INDEX idx_ticket_mentions_user ON public.ticket_mentions(mentioned_user_id) WHERE mentioned_user_id IS NOT NULL;

-- ===========================================
-- 3. FUNÇÕES AUXILIARES
-- ===========================================

-- 3.1 Verifica se e-mail está na allowlist de parceiros (para auth externa)
CREATE OR REPLACE FUNCTION public.is_allowed_partner_email(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_contacts pc
    JOIN public.partner_companies pco ON pc.partner_company_id = pco.id
    JOIN public.bu_units bu ON pc.bu_id = bu.id
    WHERE pc.email = lower(p_email)
      AND pc.status = 'active'
      AND pc.deleted_at IS NULL
      AND pco.status = 'active'
      AND pco.deleted_at IS NULL
      AND bu.status = 'active'
  )
$$;

-- 3.2 Verifica se usuário é participante do ticket
CREATE OR REPLACE FUNCTION public.is_ticket_participant(p_user_id uuid, p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ticket_participants tp
    WHERE tp.ticket_id = p_ticket_id
      AND tp.user_id = p_user_id
      AND tp.is_active = true
  )
$$;

-- 3.3 Verifica se contato é participante do ticket
CREATE OR REPLACE FUNCTION public.is_ticket_contact_participant(p_contact_id uuid, p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ticket_participants tp
    WHERE tp.ticket_id = p_ticket_id
      AND tp.partner_contact_id = p_contact_id
      AND tp.is_active = true
  )
$$;

-- 3.4 Obtém contact_id do usuário autenticado (se for externo)
CREATE OR REPLACE FUNCTION public.get_user_partner_contact_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pc.id
  FROM public.partner_contacts pc
  WHERE pc.profile_user_id = p_user_id
    AND pc.status = 'active'
    AND pc.deleted_at IS NULL
  LIMIT 1
$$;

-- 3.5 Verifica se usuário pode ver ticket (considera visibilidade)
CREATE OR REPLACE FUNCTION public.can_view_ticket(p_user_id uuid, p_ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_is_participant boolean;
  v_is_external boolean;
  v_contact_id uuid;
BEGIN
  -- Busca o ticket
  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;
  
  -- Verifica se é admin da plataforma ou BU
  IF is_platform_admin(p_user_id) OR is_bu_admin(p_user_id, v_ticket.bu_id) THEN
    RETURN true;
  END IF;
  
  -- Verifica se tem acesso à BU
  IF NOT user_has_bu_access(p_user_id, v_ticket.bu_id) THEN
    -- Pode ser usuário externo, verifica se é participante via contact
    v_contact_id := get_user_partner_contact_id(p_user_id);
    IF v_contact_id IS NOT NULL THEN
      RETURN is_ticket_contact_participant(v_contact_id, p_ticket_id);
    END IF;
    RETURN false;
  END IF;
  
  -- É usuário interno com acesso à BU
  -- Verifica se é criador ou owner
  IF v_ticket.created_by_user_id = p_user_id OR v_ticket.owner_user_id = p_user_id THEN
    RETURN true;
  END IF;
  
  -- Verifica se é participante direto
  IF is_ticket_participant(p_user_id, p_ticket_id) THEN
    RETURN true;
  END IF;
  
  -- Verifica visibilidade
  CASE v_ticket.visibility
    WHEN 'bu_all' THEN
      RETURN true;
    WHEN 'private' THEN
      RETURN false;
    WHEN 'users' THEN
      RETURN p_user_id = ANY(v_ticket.visibility_user_ids);
    WHEN 'teams' THEN
      -- Verifica se usuário pertence a algum dos times
      RETURN EXISTS (
        SELECT 1 FROM public.user_team_memberships utm
        WHERE utm.user_id = p_user_id
          AND utm.is_active = true
          AND (utm.team_id = ANY(v_ticket.visibility_team_ids))
      )
      OR EXISTS (
        SELECT 1 FROM public.user_squad_memberships usm
        WHERE usm.user_id = p_user_id
          AND usm.is_active = true
          AND (usm.squad_id = ANY(v_ticket.visibility_squad_ids))
      );
  END CASE;
  
  RETURN false;
END;
$$;

-- ===========================================
-- 4. RLS POLICIES
-- ===========================================

-- 4.1 partner_companies
ALTER TABLE public.partner_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BU admins can manage partner companies"
ON public.partner_companies FOR ALL
USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can view partner companies of their BU"
ON public.partner_companies FOR SELECT
USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

-- 4.2 partner_contacts
ALTER TABLE public.partner_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BU admins can manage partner contacts"
ON public.partner_contacts FOR ALL
USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can view partner contacts of their BU"
ON public.partner_contacts FOR SELECT
USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

CREATE POLICY "Partner contacts can view themselves"
ON public.partner_contacts FOR SELECT
USING (profile_user_id = auth.uid());

-- 4.3 ticket_categories
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BU admins can manage ticket categories"
ON public.ticket_categories FOR ALL
USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can view ticket categories of their BU"
ON public.ticket_categories FOR SELECT
USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

-- 4.4 ticket_subcategories
ALTER TABLE public.ticket_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BU admins can manage ticket subcategories"
ON public.ticket_subcategories FOR ALL
USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can view ticket subcategories of their BU"
ON public.ticket_subcategories FOR SELECT
USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

-- 4.5 ticket_routing_rules
ALTER TABLE public.ticket_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BU admins can manage routing rules"
ON public.ticket_routing_rules FOR ALL
USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can view routing rules of their BU"
ON public.ticket_routing_rules FOR SELECT
USING (deleted_at IS NULL AND user_has_bu_access(auth.uid(), bu_id));

-- 4.6 tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tickets they have access to"
ON public.tickets FOR SELECT
USING (deleted_at IS NULL AND can_view_ticket(auth.uid(), id));

CREATE POLICY "BU users can create tickets"
ON public.tickets FOR INSERT
WITH CHECK (
  user_has_bu_access(auth.uid(), bu_id) 
  AND created_by_user_id = auth.uid()
);

CREATE POLICY "Ticket owners and admins can update tickets"
ON public.tickets FOR UPDATE
USING (
  is_bu_admin(auth.uid(), bu_id)
  OR is_platform_admin(auth.uid())
  OR created_by_user_id = auth.uid()
  OR owner_user_id = auth.uid()
);

CREATE POLICY "BU admins can delete tickets"
ON public.tickets FOR DELETE
USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

-- 4.7 ticket_participants
ALTER TABLE public.ticket_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants of tickets they can see"
ON public.ticket_participants FOR SELECT
USING (can_view_ticket(auth.uid(), ticket_id));

CREATE POLICY "Ticket owners and admins can manage participants"
ON public.ticket_participants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
      AND (
        is_bu_admin(auth.uid(), t.bu_id)
        OR is_platform_admin(auth.uid())
        OR t.created_by_user_id = auth.uid()
        OR t.owner_user_id = auth.uid()
      )
  )
);

-- 4.8 ticket_messages
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of tickets they can see"
ON public.ticket_messages FOR SELECT
USING (deleted_at IS NULL AND can_view_ticket(auth.uid(), ticket_id));

CREATE POLICY "Participants can create messages"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  can_view_ticket(auth.uid(), ticket_id)
  AND (
    (author_type = 'internal_user' AND author_user_id = auth.uid())
    OR (author_type = 'partner_contact' AND author_contact_id = get_user_partner_contact_id(auth.uid()))
  )
);

CREATE POLICY "Authors can edit their messages"
ON public.ticket_messages FOR UPDATE
USING (
  author_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
      AND (is_bu_admin(auth.uid(), t.bu_id) OR is_platform_admin(auth.uid()))
  )
);

-- 4.9 ticket_attachments
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments of tickets they can see"
ON public.ticket_attachments FOR SELECT
USING (deleted_at IS NULL AND can_view_ticket(auth.uid(), ticket_id));

CREATE POLICY "Participants can upload attachments"
ON public.ticket_attachments FOR INSERT
WITH CHECK (
  can_view_ticket(auth.uid(), ticket_id)
  AND uploaded_by_user_id = auth.uid()
);

CREATE POLICY "Admins can delete attachments"
ON public.ticket_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
      AND (is_bu_admin(auth.uid(), t.bu_id) OR is_platform_admin(auth.uid()))
  )
);

-- 4.10 ticket_mentions
ALTER TABLE public.ticket_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mentions in tickets they can see"
ON public.ticket_mentions FOR SELECT
USING (can_view_ticket(auth.uid(), ticket_id));

CREATE POLICY "Participants can create mentions"
ON public.ticket_mentions FOR INSERT
WITH CHECK (can_view_ticket(auth.uid(), ticket_id));

-- ===========================================
-- 5. TRIGGERS
-- ===========================================

-- 5.1 Atualiza updated_at
CREATE OR REPLACE FUNCTION public.tickets_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.tickets_updated_at();

CREATE TRIGGER trg_partner_companies_updated_at
BEFORE UPDATE ON public.partner_companies
FOR EACH ROW EXECUTE FUNCTION public.tickets_updated_at();

CREATE TRIGGER trg_partner_contacts_updated_at
BEFORE UPDATE ON public.partner_contacts
FOR EACH ROW EXECUTE FUNCTION public.tickets_updated_at();

CREATE TRIGGER trg_ticket_categories_updated_at
BEFORE UPDATE ON public.ticket_categories
FOR EACH ROW EXECUTE FUNCTION public.tickets_updated_at();

CREATE TRIGGER trg_ticket_subcategories_updated_at
BEFORE UPDATE ON public.ticket_subcategories
FOR EACH ROW EXECUTE FUNCTION public.tickets_updated_at();

CREATE TRIGGER trg_ticket_routing_rules_updated_at
BEFORE UPDATE ON public.ticket_routing_rules
FOR EACH ROW EXECUTE FUNCTION public.tickets_updated_at();

-- ===========================================
-- 6. REGISTRAR MÓDULO
-- ===========================================

INSERT INTO public.modules (
  slug,
  name,
  description,
  type,
  route,
  icon,
  status,
  display_order,
  health_status,
  version,
  dependencies
) VALUES (
  'tickets',
  'Tickets',
  'Gerenciamento de demandas estruturadas com comunicação em thread',
  'operational',
  '/tickets',
  'ticket',
  'active',
  60,
  'healthy',
  '1.0.0',
  '{}'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  route = EXCLUDED.route,
  icon = EXCLUDED.icon,
  status = EXCLUDED.status;

-- ===========================================
-- 7. STORAGE BUCKET
-- ===========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view ticket attachments they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can delete ticket attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments'
  AND is_platform_admin(auth.uid())
);