-- Remove old pg_cron job that uses pg_net (not available in Lovable Cloud)
-- The notification processing is now handled by external cron-job.org calling the cron-dispatcher edge function

SELECT cron.unschedule(1);

-- Also remove any other cron jobs that might be using pg_net
DO $$
DECLARE
    job_record RECORD;
BEGIN
    FOR job_record IN 
        SELECT jobid FROM cron.job 
        WHERE command ILIKE '%net.http_post%' 
           OR command ILIKE '%net.http_get%'
    LOOP
        PERFORM cron.unschedule(job_record.jobid);
    END LOOP;
END $$;