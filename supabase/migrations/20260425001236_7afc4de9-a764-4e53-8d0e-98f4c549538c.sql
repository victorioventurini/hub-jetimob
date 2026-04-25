ALTER TABLE public.tickets DISABLE TRIGGER USER;
UPDATE public.tickets SET title = 'Cláusula de não aliciamento', updated_at = now()
WHERE id = '653d0df5-95c1-40dd-9299-479083c9ab47';
ALTER TABLE public.tickets ENABLE TRIGGER USER;