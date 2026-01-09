-- Criar bucket 'profiles' para uploads de foto do onboarding
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Política para usuários autenticados fazerem upload de avatars no bucket profiles
CREATE POLICY "Users can upload own profile avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Política para usuários visualizarem avatars (público)
CREATE POLICY "Anyone can view profile avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profiles');

-- Política para usuários atualizarem próprio avatar
CREATE POLICY "Users can update own profile avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Política para usuários deletarem próprio avatar
CREATE POLICY "Users can delete own profile avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
);