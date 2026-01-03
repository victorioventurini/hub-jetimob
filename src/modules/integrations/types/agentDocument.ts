export interface AgentDocument {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  status: 'pending' | 'processing' | 'ready' | 'error';
  processing_error: string | null;
  extracted_content: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
