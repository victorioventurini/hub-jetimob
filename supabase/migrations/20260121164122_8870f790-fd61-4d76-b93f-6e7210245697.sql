-- Add default_contact_ids column to partner_company_bu_associations
-- This stores fallback contacts when no specialist is available for a subcategory

ALTER TABLE public.partner_company_bu_associations
ADD COLUMN IF NOT EXISTS default_contact_ids uuid[] DEFAULT '{}';

COMMENT ON COLUMN public.partner_company_bu_associations.default_contact_ids IS 
  'Contatos padrão (fallback) quando não há contato com capacidade na subcategoria selecionada';