-- Correção mínima: cleanup_old_cron_logs e DROP tabelas legadas

DROP FUNCTION IF EXISTS public.cleanup_old_cron_logs();

CREATE FUNCTION public.cleanup_old_cron_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.cron_execution_logs 
  WHERE ran_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS public.cleanup_old_wizard_sessions();

CREATE FUNCTION public.cleanup_old_wizard_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.okr_wizard_sessions 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TABLE IF EXISTS public.mentions CASCADE;
DROP TABLE IF EXISTS public.permission_preset_items CASCADE;