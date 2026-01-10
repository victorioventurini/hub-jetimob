-- Add 'external' value to employment_status enum for partner contacts
ALTER TYPE employment_status ADD VALUE IF NOT EXISTS 'external';