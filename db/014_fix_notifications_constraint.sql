-- Migration: 014_fix_notifications_constraint.sql
-- Description: Updates the 'type' check constraint in 'notifications' table to allow 'tip' and 'gift'.

DO $$
BEGIN
    -- 1. Drop the old constraint
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

    -- 2. Add the new constraint with all supported types
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('like', 'comment', 'follow', 'review', 'tip', 'gift'));
    
    RAISE NOTICE 'Notification type constraint updated successfully.';
END $$;
