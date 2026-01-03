-- Create storage bucket for agent documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-documents', 'agent-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create table for agent documents
CREATE TABLE public.ai_agent_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  status text NOT NULL DEFAULT 'pending',
  processing_error text,
  extracted_content text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all agent documents"
ON public.ai_agent_documents
FOR ALL
USING (is_admin_or_ceo(auth.uid()));

CREATE POLICY "Users can view documents of active agents"
ON public.ai_agent_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ai_agents a
    WHERE a.id = ai_agent_documents.agent_id
    AND a.is_active = true
  )
);

-- Storage policies for agent-documents bucket
CREATE POLICY "Admins can upload agent documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'agent-documents' 
  AND is_admin_or_ceo(auth.uid())
);

CREATE POLICY "Admins can view agent documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'agent-documents'
  AND is_admin_or_ceo(auth.uid())
);

CREATE POLICY "Admins can delete agent documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'agent-documents'
  AND is_admin_or_ceo(auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_ai_agent_documents_updated_at
BEFORE UPDATE ON public.ai_agent_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();