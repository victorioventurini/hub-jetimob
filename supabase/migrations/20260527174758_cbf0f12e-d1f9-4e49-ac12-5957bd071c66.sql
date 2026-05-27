UPDATE public.notification_templates
SET 
  subject_template = regexp_replace(subject_template, '\mHub\M', 'Next', 'g'),
  body_template = regexp_replace(body_template, '\mHub\M', 'Next', 'g'),
  updated_at = now()
WHERE channel = 'email'
  AND (subject_template ~ '\mHub\M' OR body_template ~ '\mHub\M');