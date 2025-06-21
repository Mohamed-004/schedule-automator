-- Add 'system' as a valid notification type to reschedule_notifications table
-- This allows us to log system events, warnings, and summaries alongside SMS/email notifications

ALTER TABLE reschedule_notifications 
DROP CONSTRAINT IF EXISTS reschedule_notifications_notification_type_check;

ALTER TABLE reschedule_notifications 
ADD CONSTRAINT reschedule_notifications_notification_type_check 
CHECK (notification_type IN ('sms', 'email', 'system'));

-- Update any existing records that might have invalid types (if any)
-- This is just a safety measure
UPDATE reschedule_notifications 
SET notification_type = 'system' 
WHERE notification_type NOT IN ('sms', 'email', 'system'); 