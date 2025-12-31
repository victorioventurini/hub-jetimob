-- Adicionar constraint de unicidade no campo work_email para evitar duplicidade
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_work_email_unique UNIQUE (work_email);