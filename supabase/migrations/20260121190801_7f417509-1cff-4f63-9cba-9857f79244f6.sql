
-- Fix ticket_messages RLS policies (missing SELECT and INSERT)

-- Policy: Users can SELECT messages from tickets they can view
CREATE POLICY "ticket_messages_select_v1" ON public.ticket_messages
  FOR SELECT TO authenticated
  USING (
    is_current_bu(bu_id) AND 
    can_view_ticket(my_profile_id(), ticket_id)
  );

-- Policy: Users can INSERT messages on tickets they can view
CREATE POLICY "ticket_messages_insert_v1" ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_bu(bu_id) AND 
    can_view_ticket(my_profile_id(), ticket_id) AND
    author_user_id = my_profile_id()
  );

-- Policy: Allow soft-delete (update deleted_at) by message author - if not conflicting with existing
-- Drop the old update policy and recreate to avoid conflict
DROP POLICY IF EXISTS "ticket_messages_delete_v1" ON public.ticket_messages;


-- Fix ticket_attachments RLS policies (check if missing)
DO $$
BEGIN
  -- Create SELECT policy if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ticket_attachments' AND policyname LIKE '%select%'
  ) THEN
    EXECUTE 'CREATE POLICY "ticket_attachments_select_v1" ON public.ticket_attachments
      FOR SELECT TO authenticated
      USING (
        is_current_bu(bu_id) AND 
        can_view_ticket(my_profile_id(), ticket_id)
      )';
  END IF;

  -- Create INSERT policy if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ticket_attachments' AND policyname LIKE '%insert%'
  ) THEN
    EXECUTE 'CREATE POLICY "ticket_attachments_insert_v1" ON public.ticket_attachments
      FOR INSERT TO authenticated
      WITH CHECK (
        is_current_bu(bu_id) AND 
        can_view_ticket(my_profile_id(), ticket_id) AND
        uploaded_by_user_id = my_profile_id()
      )';
  END IF;
END $$;


-- Create trigger function for notifying external contact on ticket assignment
CREATE OR REPLACE FUNCTION public.trg_notify_external_contact_on_ticket_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact RECORD;
  v_ticket RECORD;
  v_event_slug TEXT;
BEGIN
  -- Only for assignee role on partner_contact participant type
  IF NEW.role = 'assignee' AND NEW.participant_type = 'partner_contact' AND NEW.partner_contact_id IS NOT NULL THEN
    -- Get contact info
    SELECT id, name, email, user_id INTO v_contact
    FROM partner_contacts
    WHERE id = NEW.partner_contact_id;
    
    -- Get ticket info
    SELECT id, title, type INTO v_ticket
    FROM tickets
    WHERE id = NEW.ticket_id;
    
    IF v_contact.id IS NOT NULL AND v_ticket.id IS NOT NULL THEN
      v_event_slug := 'ticket.assigned_to_external';
      
      -- Insert email notification to outbox
      INSERT INTO notification_outbox (
        bu_id,
        user_id,
        event_slug,
        channel_slug,
        payload,
        status
      ) VALUES (
        NEW.bu_id,
        v_contact.user_id,  -- user_id from partner_contacts (auth.users.id)
        v_event_slug,
        'email',
        jsonb_build_object(
          'ticket_id', v_ticket.id,
          'ticket_title', v_ticket.title,
          'contact_name', v_contact.name,
          'contact_email', v_contact.email,
          'contact_id', v_contact.id
        ),
        'pending'
      );
      
      -- Insert in-app notification if contact has user_id
      IF v_contact.user_id IS NOT NULL THEN
        INSERT INTO notification_outbox (
          bu_id,
          user_id,
          event_slug,
          channel_slug,
          payload,
          status
        ) VALUES (
          NEW.bu_id,
          v_contact.user_id,
          v_event_slug,
          'in_app',
          jsonb_build_object(
            'ticket_id', v_ticket.id,
            'ticket_title', v_ticket.title,
            'contact_name', v_contact.name,
            'contact_id', v_contact.id
          ),
          'pending'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_notify_external_contact_on_assignment ON ticket_participants;
CREATE TRIGGER trg_notify_external_contact_on_assignment
  AFTER INSERT ON ticket_participants
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_external_contact_on_ticket_assignment();


-- Add notification event for ticket assignment to external contact (if not exists)
-- Using 'info' severity since 'medium' is not valid
INSERT INTO notification_events (slug, module, name, description, audience, severity, is_mandatory, default_channels)
VALUES (
  'ticket.assigned_to_external',
  'tickets',
  'Ticket Atribuído',
  'Notificação enviada quando um ticket é atribuído a um contato externo',
  'external',
  'info',
  true,
  ARRAY['email', 'in_app']
)
ON CONFLICT (slug) DO NOTHING;
