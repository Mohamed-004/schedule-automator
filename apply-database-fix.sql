-- ===================================
-- COMPLETE DATABASE FIX SCRIPT (v3)
-- This script prepares your database for the application.
-- It adds missing columns, creates tables, and sets permissions.
-- ===================================

-- 1. First, ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Update businesses table to add missing columns (if they don't exist)
-- This makes the script safe to run even if columns already exist.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='timezone') THEN
        ALTER TABLE businesses ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='has_workers') THEN
        ALTER TABLE businesses ADD COLUMN has_workers BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='subscription_tier') THEN
        ALTER TABLE businesses ADD COLUMN subscription_tier TEXT DEFAULT 'starter';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='max_clients') THEN
        ALTER TABLE businesses ADD COLUMN max_clients INTEGER DEFAULT 100;
    END IF;
END $$;

-- 3. Create worker availability tables (if they don't exist)
CREATE TABLE IF NOT EXISTS worker_weekly_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worker_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((start_time IS NULL AND end_time IS NULL) OR (start_time IS NOT NULL AND end_time IS NOT NULL))
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_availability_worker ON worker_weekly_availability(worker_id);
CREATE INDEX IF NOT EXISTS idx_weekly_availability_day ON worker_weekly_availability(worker_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_exceptions_worker ON worker_availability_exceptions(worker_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_date ON worker_availability_exceptions(worker_id, date);

-- 5. Enable RLS on availability tables
ALTER TABLE worker_weekly_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_availability_exceptions ENABLE ROW LEVEL SECURITY;

-- 6. Drop all existing policies first for a clean slate
DROP POLICY IF EXISTS "Weekly availability viewable by all" ON worker_weekly_availability;
DROP POLICY IF EXISTS "Weekly availability manageable by business admins" ON worker_weekly_availability;
DROP POLICY IF EXISTS "Workers can view their own availability" ON worker_weekly_availability;
DROP POLICY IF EXISTS "Availability exceptions viewable by all" ON worker_availability_exceptions;
DROP POLICY IF EXISTS "Availability exceptions manageable by business admins" ON worker_availability_exceptions;
DROP POLICY IF EXISTS "Workers can view their own exceptions" ON worker_availability_exceptions;
DROP POLICY IF EXISTS "Business owners can manage all worker availability" ON worker_weekly_availability;
DROP POLICY IF EXISTS "Business owners can manage all worker exceptions" ON worker_availability_exceptions;

-- 7. Create new simplified RLS policies - whoever signed up owns the business data
CREATE POLICY "Business owners can manage all worker availability"
ON worker_weekly_availability FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workers w 
    JOIN businesses b ON w.business_id = b.id 
    WHERE w.id = worker_weekly_availability.worker_id
    AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workers w 
    JOIN businesses b ON w.business_id = b.id 
    WHERE w.id = worker_weekly_availability.worker_id
    AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can manage all worker exceptions"
ON worker_availability_exceptions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workers w 
    JOIN businesses b ON w.business_id = b.id 
    WHERE w.id = worker_availability_exceptions.worker_id
    AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workers w 
    JOIN businesses b ON w.business_id = b.id 
    WHERE w.id = worker_availability_exceptions.worker_id
    AND b.user_id = auth.uid()
  )
);

-- 8. Create business signup trigger to automatically create business profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a new business for the user with only the required fields
  INSERT INTO public.businesses (user_id, name, email)
  VALUES (NEW.id, 'My Business', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Grant necessary permissions
GRANT ALL ON worker_weekly_availability TO authenticated;
GRANT ALL ON worker_availability_exceptions TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 10. Add job duration and smart scheduling function
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Add a work_items column to store a checklist of tasks for a job.
-- It's a text array, allowing for a dynamic list of strings.
ALTER TABLE jobs ADD COLUMN work_items TEXT[];

-- Drop the function if it already exists to ensure a clean setup
DROP FUNCTION IF EXISTS get_available_workers(uuid, timestamptz, timestamptz);

-- Create the function to get available workers for a given time slot
CREATE OR REPLACE FUNCTION get_available_workers(
    p_business_id UUID,
    p_job_start_time TIMESTAMPTZ,
    p_job_end_time TIMESTAMPTZ
)
RETURNS TABLE (
    worker_id UUID,
    worker_name TEXT,
    worker_email TEXT,
    worker_phone TEXT,
    worker_role TEXT
) AS $$
DECLARE
    v_job_date DATE;
    v_day_of_week SMALLINT;
    v_business_timezone TEXT;
BEGIN
    -- Get the business's timezone to ensure correct date and time calculations
    SELECT timezone INTO v_business_timezone FROM businesses WHERE id = p_business_id;
    IF v_business_timezone IS NULL THEN
        v_business_timezone := 'UTC'; -- Default to UTC if not set
    END IF;

    -- Extract date and day of the week from the job start time, adjusted for the business's timezone.
    v_job_date := (p_job_start_time AT TIME ZONE v_business_timezone)::DATE;
    v_day_of_week := EXTRACT(DOW FROM (p_job_start_time AT TIME ZONE v_business_timezone)); -- Sunday is 0, Saturday is 6

    RETURN QUERY
    WITH worker_availability AS (
        SELECT
            w.id,
            w.name,
            w.email,
            w.phone,
            w.role,
            w.business_id,
            w.status,
            COALESCE(we.is_available, wa.is_available) as is_available,
            COALESCE(we.start_time, wa.start_time) as start_time,
            COALESCE(we.end_time, wa.end_time) as end_time,
            we.id as exception_id
        FROM
            workers w
        LEFT JOIN
            worker_availability_exceptions we ON w.id = we.worker_id AND we.date = v_job_date
        LEFT JOIN (
            SELECT 
                wwa.worker_id,
                true as is_available,
                wwa.start_time,
                wwa.end_time
            FROM worker_weekly_availability wwa
            WHERE wwa.day_of_week = v_day_of_week
        ) wa ON w.id = wa.worker_id AND we.id IS NULL
    )
    SELECT
        wa.id AS worker_id,
        wa.name AS worker_name,
        wa.email AS worker_email,
        wa.phone AS worker_phone,
        wa.role AS worker_role
    FROM
        worker_availability wa
    WHERE
        wa.business_id = p_business_id
        AND wa.status = 'active'
        -- 1. Check if the worker is available for the given time
        AND wa.is_available = true
        AND (p_job_start_time AT TIME ZONE v_business_timezone)::TIME >= wa.start_time
        AND (p_job_end_time AT TIME ZONE v_business_timezone)::TIME <= wa.end_time

        -- 2. AND they don't have a conflicting job at the same time
        AND NOT EXISTS (
            SELECT 1
            FROM jobs j
            WHERE j.worker_id = wa.id
              AND j.status NOT IN ('cancelled', 'completed')
              -- Check for overlapping time intervals.
              AND (p_job_start_time, p_job_end_time) OVERLAPS (j.scheduled_at, j.scheduled_at + (COALESCE(j.duration_minutes, 60) * INTERVAL '1 minute'))
        );
END;
$$ LANGUAGE plpgsql;

-- 11. New function to get worker schedule summary
DROP FUNCTION IF EXISTS get_worker_schedule_summary(uuid, date);
CREATE OR REPLACE FUNCTION get_worker_schedule_summary(
    p_worker_id UUID,
    p_date DATE
)
RETURNS TABLE (
    weekly_hours_worked NUMERIC,
    weekly_hours_goal NUMERIC,
    daily_hours_worked NUMERIC,
    daily_hours_goal NUMERIC,
    daily_schedule JSONB,
    daily_exception_reason TEXT
) AS $$
DECLARE
    v_start_of_week DATE;
    v_end_of_week DATE;
    v_business_timezone TEXT;
    v_day_of_week SMALLINT;
    v_total_weekly_minutes_worked NUMERIC;
    v_total_daily_minutes_worked NUMERIC;
    v_daily_schedule JSONB;
    v_weekly_hours_goal NUMERIC;
    v_daily_hours_goal NUMERIC;
    v_exception RECORD;
BEGIN
    -- Get business timezone
    SELECT b.timezone INTO v_business_timezone
    FROM workers w
    JOIN businesses b ON w.business_id = b.id
    WHERE w.id = p_worker_id;

    IF v_business_timezone IS NULL THEN
        v_business_timezone := 'UTC';
    END IF;

    -- Calculate date parameters
    v_start_of_week := date_trunc('week', p_date AT TIME ZONE v_business_timezone)::DATE;
    v_end_of_week := v_start_of_week + INTERVAL '6 days';
    v_day_of_week := EXTRACT(DOW FROM (p_date AT TIME ZONE v_business_timezone)); -- Sunday=0, Saturday=6

    -- 1. Calculate total minutes WORKED in the week from jobs
    SELECT COALESCE(SUM(j.duration_minutes), 0)
    INTO v_total_weekly_minutes_worked
    FROM jobs j
    WHERE j.worker_id = p_worker_id
      AND j.status NOT IN ('cancelled', 'declined')
      AND (j.scheduled_at AT TIME ZONE v_business_timezone)::DATE BETWEEN v_start_of_week AND v_end_of_week;

    -- 2. Calculate the worker's total scheduled hours GOAL for the week from availability
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0)
    INTO v_weekly_hours_goal
    FROM worker_weekly_availability
    WHERE worker_id = p_worker_id;

    -- 3. Get the daily schedule and calculate total daily minutes worked
    SELECT
        jsonb_agg(json_data) as schedule,
        COALESCE(SUM(duration), 0) as total_minutes
    INTO v_daily_schedule, v_total_daily_minutes_worked
    FROM (
        SELECT
            jsonb_build_object(
                'title', j.title,
                'start_time', j.scheduled_at,
                'end_time', j.scheduled_at + (j.duration_minutes * INTERVAL '1 minute')
            ) as json_data,
            j.duration_minutes as duration
        FROM jobs j
        WHERE j.worker_id = p_worker_id
          AND j.status NOT IN ('cancelled', 'declined')
          AND (j.scheduled_at AT TIME ZONE v_business_timezone)::DATE = p_date
    ) as daily_jobs;

    -- 4. Calculate the worker's scheduled hours GOAL for the specific day, accounting for exceptions
    SELECT * INTO v_exception
    FROM worker_availability_exceptions we
    WHERE we.worker_id = p_worker_id AND we.date = p_date;

    IF FOUND THEN
        -- An exception exists for this day
        IF v_exception.is_available THEN
            v_daily_hours_goal := COALESCE(EXTRACT(EPOCH FROM (v_exception.end_time - v_exception.start_time)) / 3600, 0);
        ELSE
            v_daily_hours_goal := 0;
        END IF;
        daily_exception_reason := v_exception.reason;
    ELSE
        -- No exception, use default weekly availability. SUM all slots for the day.
        SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (wa.end_time - wa.start_time)) / 3600), 0)
        INTO v_daily_hours_goal
        FROM worker_weekly_availability wa
        WHERE wa.worker_id = p_worker_id AND wa.day_of_week = v_day_of_week;
        daily_exception_reason := NULL;
    END IF;

    -- Assign calculated values to the output table columns
    weekly_hours_worked := v_total_weekly_minutes_worked / 60.0;
    weekly_hours_goal := COALESCE(v_weekly_hours_goal, 0);
    daily_hours_worked := v_total_daily_minutes_worked / 60.0;
    daily_hours_goal := COALESCE(v_daily_hours_goal, 0);
    daily_schedule := v_daily_schedule;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Final Verification
SELECT 'Database setup complete. You can now sign up in the application.' as status; 