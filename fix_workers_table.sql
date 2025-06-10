-- FIX: Add user_id to workers table
-- This script adds the missing 'user_id' column to the 'workers' table.
-- This column is essential for the application to link a worker profile
-- to a system user account, allowing workers to view their own information.

ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workers.user_id IS 'Foreign key to auth.users.id. Links a worker to a system user account.';

-- After running this, you may need to manually link existing workers to their user accounts.
-- For example:
-- UPDATE public.workers
-- SET user_id = (SELECT id FROM auth.users WHERE email = public.workers.email)
-- WHERE email IS NOT NULL; 