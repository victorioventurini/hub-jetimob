-- Add 'info' to notification_type enum for test notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'info';

-- Also add other common notification types that might be needed
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'system';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'alert';