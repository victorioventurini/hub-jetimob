-- Adiciona constraint única para garantir que um usuário não pode ter memberships duplicadas na mesma BU
ALTER TABLE public.bu_user_memberships 
ADD CONSTRAINT bu_user_memberships_bu_user_unique 
UNIQUE (bu_id, user_id);