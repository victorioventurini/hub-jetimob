-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ticket-attachments', 'ticket-attachments', false, 20971520)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for ticket-attachments bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

-- Allow users to read attachments from tickets they have access to
CREATE POLICY "Users can read ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ticket-attachments');

-- Allow users to delete their own uploaded attachments
CREATE POLICY "Users can delete their own ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments' 
  AND (storage.foldername(name))[1] IN (
    SELECT bu_id::text FROM bu_user_memberships WHERE user_id = auth.uid()
  )
);