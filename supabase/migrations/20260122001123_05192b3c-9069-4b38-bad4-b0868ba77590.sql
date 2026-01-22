-- =====================================================
-- FIX: ON CONFLICT constraint mismatch in ticket_participants
-- Problem: Trigger uses ON CONFLICT with partial index predicate that doesn't match
-- Solution: Create proper unique constraints without is_active condition, or update trigger
-- =====================================================

-- Drop old partial unique indexes (they cause ON CONFLICT to fail)
DROP INDEX IF EXISTS idx_ticket_participants_unique_user;
DROP INDEX IF EXISTS idx_ticket_participants_unique_contact;

-- Create proper unique indexes WITHOUT the is_active condition
-- This allows ON CONFLICT to work correctly when inserting participants
CREATE UNIQUE INDEX idx_ticket_participants_unique_user 
ON public.ticket_participants (ticket_id, profile_id) 
WHERE profile_id IS NOT NULL;

CREATE UNIQUE INDEX idx_ticket_participants_unique_contact 
ON public.ticket_participants (ticket_id, partner_contact_id) 
WHERE partner_contact_id IS NOT NULL;

-- Update the trigger function to match the new index predicates
CREATE OR REPLACE FUNCTION public.auto_add_ticket_mention_as_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket_id uuid;
  v_bu_id uuid;
BEGIN
  -- Only process ticket message mentions
  IF NEW.entity_type != 'ticket_message' THEN
    RETURN NEW;
  END IF;
  
  -- Get ticket_id and bu_id from the message
  SELECT tm.ticket_id, t.bu_id INTO v_ticket_id, v_bu_id
  FROM public.ticket_messages tm
  JOIN public.tickets t ON t.id = tm.ticket_id
  WHERE tm.id = NEW.entity_id;
  
  IF v_ticket_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Add internal user as participant (watcher role)
  IF NEW.mentioned_user_id IS NOT NULL THEN
    INSERT INTO public.ticket_participants (
      bu_id, ticket_id, participant_type, profile_id, role, is_active
    )
    VALUES (
      v_bu_id, v_ticket_id, 'internal_user', 
      NEW.mentioned_user_id, 'watcher', true
    )
    ON CONFLICT (ticket_id, profile_id) WHERE profile_id IS NOT NULL
    DO UPDATE SET is_active = true, updated_at = now();
  END IF;
  
  -- Add external contact as participant (watcher role)
  IF NEW.mentioned_contact_id IS NOT NULL THEN
    INSERT INTO public.ticket_participants (
      bu_id, ticket_id, participant_type, partner_contact_id, role, is_active
    )
    VALUES (
      v_bu_id, v_ticket_id, 'partner_contact', 
      NEW.mentioned_contact_id, 'watcher', true
    )
    ON CONFLICT (ticket_id, partner_contact_id) WHERE partner_contact_id IS NOT NULL 
    DO UPDATE SET is_active = true, updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_add_ticket_mention_as_participant() IS 
  'Trigger: Auto-adds mentioned users in ticket messages as participants. Fixed ON CONFLICT to match unique index predicates.';