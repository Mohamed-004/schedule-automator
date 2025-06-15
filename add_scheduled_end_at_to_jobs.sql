-- Add the scheduled_end_at column to the jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ; 