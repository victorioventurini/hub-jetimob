-- Add reply_to_message_id column to ticket_messages for reply functionality
ALTER TABLE public.ticket_messages
ADD COLUMN reply_to_message_id uuid REFERENCES public.ticket_messages(id);

-- Create index for efficient reply lookups
CREATE INDEX idx_ticket_messages_reply_to ON public.ticket_messages(reply_to_message_id)
WHERE reply_to_message_id IS NOT NULL;

-- Document the column
COMMENT ON COLUMN public.ticket_messages.reply_to_message_id IS
  'Referência à mensagem original quando esta é uma resposta (reply). Null se não for reply.';