-- Adicionar coluna para mensagem inicial padrão nas subcategorias de ticket
ALTER TABLE public.ticket_subcategories
ADD COLUMN default_initial_message text DEFAULT NULL;

COMMENT ON COLUMN public.ticket_subcategories.default_initial_message IS
'Texto padrão exibido no campo de mensagem inicial ao criar um ticket com esta subcategoria';