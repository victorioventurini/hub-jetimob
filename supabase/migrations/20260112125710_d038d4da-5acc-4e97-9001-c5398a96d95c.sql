-- =============================================
-- RESTAURAÇÃO: Tabela mentions global
-- Decisão arquitetural: centralizar mentions para todos os módulos
-- Referência: Migration 20260111145457 (drop ticket_mentions → mentions)
-- =============================================

-- Criar tabela mentions global
CREATE TABLE public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id UUID NOT NULL REFERENCES bu_units(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,  -- 'ticket', 'ticket_message', 'okr', etc
  entity_id UUID NOT NULL,
  mentioned_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mentioned_contact_id UUID REFERENCES partner_contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Exatamente um target deve ser preenchido
  CONSTRAINT chk_mention_target CHECK (
    (mentioned_user_id IS NOT NULL AND mentioned_contact_id IS NULL) OR
    (mentioned_user_id IS NULL AND mentioned_contact_id IS NOT NULL)
  )
);

-- Comentário da tabela
COMMENT ON TABLE public.mentions IS 'Tabela global de mentions para todos os módulos (tickets, OKRs, etc). Entity_type identifica o contexto.';

-- Índices de performance
CREATE INDEX idx_mentions_entity ON public.mentions(entity_type, entity_id);
CREATE INDEX idx_mentions_bu_id ON public.mentions(bu_id);
CREATE INDEX idx_mentions_mentioned_user ON public.mentions(mentioned_user_id) WHERE mentioned_user_id IS NOT NULL;
CREATE INDEX idx_mentions_mentioned_contact ON public.mentions(mentioned_contact_id) WHERE mentioned_contact_id IS NOT NULL;
CREATE INDEX idx_mentions_created_at ON public.mentions(created_at DESC);
CREATE INDEX idx_mentions_created_by ON public.mentions(created_by) WHERE created_by IS NOT NULL;

-- RLS
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Política SELECT: membros da BU podem ver mentions
CREATE POLICY "mentions_select_bu_member" 
ON public.mentions FOR SELECT 
USING (is_profile_bu_member(my_profile_id(), bu_id));

-- Política INSERT: membros da BU podem criar mentions
CREATE POLICY "mentions_insert_bu_member" 
ON public.mentions FOR INSERT 
WITH CHECK (is_profile_bu_member(my_profile_id(), bu_id));

-- Política DELETE: apenas o criador pode deletar
CREATE POLICY "mentions_delete_creator" 
ON public.mentions FOR DELETE 
USING (created_by = my_profile_id());