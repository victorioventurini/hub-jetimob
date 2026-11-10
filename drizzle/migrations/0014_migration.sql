CREATE TABLE public.google_chat_user_links (
  email text PRIMARY KEY,
  chat_user_name text NOT NULL,
  dm_space_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.google_chat_user_links TO service_role;
ALTER TABLE public.google_chat_user_links ENABLE ROW LEVEL SECURITY;