-- Add 'system' value to ticket_author_type enum
-- This enables automatic status-change messages when responsible sends a message

ALTER TYPE public.ticket_author_type ADD VALUE IF NOT EXISTS 'system';