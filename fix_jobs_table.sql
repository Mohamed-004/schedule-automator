-- Add duration column to jobs table
-- This column will store the job duration in minutes.
ALTER TABLE public.jobs
ADD COLUMN duration INT;

-- Add job_type_id column to jobs table
-- This links a job to a specific type of work (e.g., "Installation", "Repair")
-- and sets up a foreign key relationship to the job_types table.
ALTER TABLE public.jobs
ADD COLUMN job_type_id UUID REFERENCES public.job_types(id) ON DELETE SET NULL;

-- Add scheduled_end_at column to jobs table
-- This stores the completion time of the job.
ALTER TABLE public.jobs
ADD COLUMN scheduled_end_at TIMESTAMP WITH TIME ZONE; 