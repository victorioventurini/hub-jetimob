ALTER TABLE public.tickets DISABLE TRIGGER USER;
UPDATE public.tickets SET title = 'Termos de uso', updated_at = now() WHERE id = '5526db3d-3e73-4bc3-ba6c-4e2a26a2d1a8';
ALTER TABLE public.tickets ENABLE TRIGGER USER;