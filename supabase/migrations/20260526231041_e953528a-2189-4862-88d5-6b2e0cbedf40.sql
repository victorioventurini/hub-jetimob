UPDATE public.notification_template_variables
SET example_value = 'https://next.jetimob.com/auth'
WHERE event_slug = 'partner.invite'
  AND variable_key = 'access_url'
  AND example_value = 'https://hub.jetimob.com/auth';