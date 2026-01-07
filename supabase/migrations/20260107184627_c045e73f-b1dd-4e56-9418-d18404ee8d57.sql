
-- Alterar FK de bu_user_permission_groups.user_id para apontar para profiles(id) em vez de auth.users(id)
-- Isso é necessário porque o sistema usa profiles como entidade principal de usuário

-- Remover a FK existente
ALTER TABLE public.bu_user_permission_groups 
  DROP CONSTRAINT IF EXISTS bu_user_permission_groups_user_id_fkey;

-- Adicionar nova FK para profiles
ALTER TABLE public.bu_user_permission_groups 
  ADD CONSTRAINT bu_user_permission_groups_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
