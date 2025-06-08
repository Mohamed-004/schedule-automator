-- Drop the old function
DROP FUNCTION IF EXISTS get_worker_schedule_summary(uuid, date);

-- Create a new function with a simpler syntax that should be more compatible with all SQL editors
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
    daily_exception_reason TEXT,
    exception_start_time TIME,
    exception_end_time TIME,
    daily_availability_slots JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    v_daily_availability_slots JSONB;
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
    v_start_of_week := date_trunc('week', p_date)::DATE;
    v_end_of_week := v_start_of_week + INTERVAL '6 days';
    v_day_of_week := EXTRACT(DOW FROM p_date); -- Sunday=0, Monday=1, etc.

    -- Check for an exception for the given date FIRST
    SELECT * INTO v_exception
    FROM worker_availability_exceptions
    WHERE worker_id = p_worker_id AND date = p_date;

    IF FOUND THEN
        -- An exception exists. Use it exclusively for daily goal and availability.
        daily_exception_reason := v_exception.reason;
        
        IF v_exception.is_available THEN
            exception_start_time := v_exception.start_time;
            exception_end_time := v_exception.end_time;
            v_daily_hours_goal := COALESCE(EXTRACT(EPOCH FROM (v_exception.end_time - v_exception.start_time)) / 3600, 0);
            v_daily_availability_slots := jsonb_build_array(jsonb_build_object('start_time', v_exception.start_time, 'end_time', v_exception.end_time));
        ELSE
            -- Worker is explicitly unavailable (e.g., sick day)
            exception_start_time := NULL;
            exception_end_time := NULL;
            v_daily_hours_goal := 0;
            v_daily_availability_slots := '[]'::jsonb;
        END IF;

    ELSE
        -- No exception found. Fall back to the default weekly schedule.
        daily_exception_reason := NULL;
        exception_start_time := NULL;
        exception_end_time := NULL;
        
        SELECT
            COALESCE(SUM(EXTRACT(EPOCH FROM (wa.end_time - wa.start_time)) / 3600), 0),
            jsonb_agg(jsonb_build_object('start_time', wa.start_time, 'end_time', wa.end_time)) FILTER (WHERE wa.id IS NOT NULL)
        INTO v_daily_hours_goal, v_daily_availability_slots
        FROM worker_weekly_availability wa
        WHERE wa.worker_id = p_worker_id AND wa.day_of_week = v_day_of_week;
    END IF;

    -- 1. Calculate total minutes WORKED.
    SELECT COALESCE(SUM(j.duration_minutes), 0)
    INTO v_total_weekly_minutes_worked
    FROM jobs j
    WHERE j.worker_id = p_worker_id
      AND j.status NOT IN ('cancelled', 'declined')
      AND (j.scheduled_at AT TIME ZONE v_business_timezone)::DATE BETWEEN v_start_of_week AND v_end_of_week;

    -- 2. Calculate the worker's total scheduled hours GOAL for the week
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0)
    INTO v_weekly_hours_goal
    FROM worker_weekly_availability
    WHERE worker_id = p_worker_id;

    -- 3. Get the daily schedule and calculate total daily minutes WORKED
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

    -- Return the results
    RETURN QUERY
    SELECT
        v_total_weekly_minutes_worked / 60.0,
        v_weekly_hours_goal,
        v_total_daily_minutes_worked / 60.0,
        v_daily_hours_goal,
        v_daily_schedule,
        daily_exception_reason,
        exception_start_time,
        exception_end_time,
        COALESCE(v_daily_availability_slots, '[]'::jsonb);
END;
$function$; 

-- Update the worker availability function to properly validate both start and end times
CREATE OR REPLACE FUNCTION is_worker_available(
    p_worker_id UUID,
    p_job_start_time TIMESTAMPTZ,
    p_job_end_time TIMESTAMPTZ,
    p_business_timezone TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_exception worker_availability_exceptions%ROWTYPE;
    v_job_start_date DATE;
    v_job_end_date DATE;
    v_job_start_time_local TIME;
    v_job_end_time_local TIME;
    v_start_day_of_week SMALLINT;
    v_end_day_of_week SMALLINT;
    v_is_overnight BOOLEAN;
BEGIN
    -- Convert all times to local business timezone
    v_job_start_date := (p_job_start_time AT TIME ZONE p_business_timezone)::DATE;
    v_job_end_date := (p_job_end_time AT TIME ZONE p_business_timezone)::DATE;
    v_job_start_time_local := (p_job_start_time AT TIME ZONE p_business_timezone)::TIME;
    v_job_end_time_local := (p_job_end_time AT TIME ZONE p_business_timezone)::TIME;
    v_start_day_of_week := EXTRACT(DOW FROM v_job_start_date);
    v_end_day_of_week := EXTRACT(DOW FROM v_job_end_date);
    
    -- Determine if job spans overnight
    v_is_overnight := v_job_start_date != v_job_end_date;
    
    -- For overnight jobs, we need to check both days' availability
    IF v_is_overnight THEN
        -- First check start date
        -- Check for exceptions on the start date
        SELECT * INTO v_exception 
        FROM worker_availability_exceptions
        WHERE worker_id = p_worker_id AND date = v_job_start_date;
        
        IF FOUND THEN
            -- Exception exists for start date
            IF NOT v_exception.is_available THEN
                -- Worker unavailable on start date
                RETURN FALSE;
            END IF;
            
            -- Check if start time is within exception window
            IF v_job_start_time_local < v_exception.start_time OR 
               '23:59:59'::TIME < v_exception.end_time THEN
                RETURN FALSE;
            END IF;
        ELSE
            -- No exception, check regular schedule for start date
            IF NOT EXISTS (
                SELECT 1
                FROM worker_weekly_availability
                WHERE worker_id = p_worker_id
                  AND day_of_week = v_start_day_of_week
                  AND v_job_start_time_local >= start_time
                  AND '23:59:59'::TIME <= end_time
            ) THEN
                RETURN FALSE;
            END IF;
        END IF;
        
        -- Then check end date
        -- Check for exceptions on the end date
        SELECT * INTO v_exception 
        FROM worker_availability_exceptions
        WHERE worker_id = p_worker_id AND date = v_job_end_date;
        
        IF FOUND THEN
            -- Exception exists for end date
            IF NOT v_exception.is_available THEN
                -- Worker unavailable on end date
                RETURN FALSE;
            END IF;
            
            -- Check if end time is within exception window
            IF '00:00:00'::TIME < v_exception.start_time OR
               v_job_end_time_local > v_exception.end_time THEN
                RETURN FALSE;
            END IF;
        ELSE
            -- No exception, check regular schedule for end date
            IF NOT EXISTS (
                SELECT 1
                FROM worker_weekly_availability
                WHERE worker_id = p_worker_id
                  AND day_of_week = v_end_day_of_week
                  AND '00:00:00'::TIME >= start_time
                  AND v_job_end_time_local <= end_time
            ) THEN
                RETURN FALSE;
            END IF;
        END IF;
        
        -- Also check all days in between (if job spans multiple days)
        IF v_job_end_date - v_job_start_date > 1 THEN
            -- Check each day in between
            FOR i IN 1..(v_job_end_date - v_job_start_date - 1) LOOP
                DECLARE
                    v_current_date DATE := v_job_start_date + (i * INTERVAL '1 day');
                    v_current_day_of_week SMALLINT := EXTRACT(DOW FROM v_current_date);
                    v_current_exception worker_availability_exceptions%ROWTYPE;
                BEGIN
                    -- Check for exception
                    SELECT * INTO v_current_exception 
                    FROM worker_availability_exceptions
                    WHERE worker_id = p_worker_id AND date = v_current_date;
                    
                    IF FOUND THEN
                        -- Exception exists
                        IF NOT v_current_exception.is_available THEN
                            -- Worker unavailable on this day
                            RETURN FALSE;
                        END IF;
                        
                        -- Need to be available full day
                        IF v_current_exception.start_time > '00:00:00'::TIME OR 
                           v_current_exception.end_time < '23:59:59'::TIME THEN
                            RETURN FALSE;
                        END IF;
                    ELSE
                        -- No exception, check regular schedule
                        IF NOT EXISTS (
                            SELECT 1
                            FROM worker_weekly_availability
                            WHERE worker_id = p_worker_id
                              AND day_of_week = v_current_day_of_week
                              AND start_time <= '00:00:00'::TIME
                              AND end_time >= '23:59:59'::TIME
                        ) THEN
                            RETURN FALSE;
                        END IF;
                    END IF;
                END;
            END LOOP;
        END IF;
        
        -- If we got here, worker is available for the entire overnight job
        RETURN TRUE;
    ELSE
        -- Same-day job, simpler check
        -- CRITICAL FIX: First check for exceptions - these COMPLETELY override regular schedule
        SELECT * INTO v_exception 
        FROM worker_availability_exceptions
        WHERE worker_id = p_worker_id AND date = v_job_start_date;

        IF FOUND THEN
            -- We found an exception record for this date
            IF v_exception.is_available = FALSE THEN
                -- Worker is marked as unavailable for the entire day
                RETURN FALSE;
            ELSE
                -- Worker is available only during the exception time window
                -- Both job start AND end times must be within the exception's availability window
                RETURN (v_job_start_time_local >= v_exception.start_time AND 
                       v_job_end_time_local <= v_exception.end_time);
            END IF;
        END IF;

        -- Only check default schedule if no exception exists
        -- Both job start AND end times must be within the worker's regular availability window
        RETURN EXISTS (
            SELECT 1
            FROM worker_weekly_availability
            WHERE worker_id = p_worker_id
              AND day_of_week = v_start_day_of_week
              AND v_job_start_time_local >= start_time
              AND v_job_end_time_local <= end_time
        );
    END IF;
END;
$$ LANGUAGE plpgsql; 

-- Add a debug function to help diagnose availability issues
CREATE OR REPLACE FUNCTION debug_worker_availability(
    p_worker_id UUID,
    p_date DATE
)
RETURNS TABLE (
    has_exception BOOLEAN,
    exception_is_available BOOLEAN,
    exception_start_time TIME,
    exception_end_time TIME,
    day_of_week INTEGER,
    has_default_schedule BOOLEAN,
    default_start_time TIME,
    default_end_time TIME
) AS $$
DECLARE
    v_exception worker_availability_exceptions%ROWTYPE;
    v_day_of_week INTEGER;
    v_default_schedule RECORD;
BEGIN
    -- Get day of week
    v_day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Check for exception
    SELECT * INTO v_exception FROM worker_availability_exceptions
    WHERE worker_id = p_worker_id AND date = p_date;
    
    has_exception := FOUND;
    
    IF FOUND THEN
        exception_is_available := v_exception.is_available;
        exception_start_time := v_exception.start_time;
        exception_end_time := v_exception.end_time;
    ELSE
        exception_is_available := NULL;
        exception_start_time := NULL;
        exception_end_time := NULL;
    END IF;
    
    day_of_week := v_day_of_week;
    
    -- Check default schedule - FIX: qualify the column name to avoid ambiguity
    SELECT * INTO v_default_schedule 
    FROM worker_weekly_availability
    WHERE worker_id = p_worker_id 
    AND worker_weekly_availability.day_of_week = v_day_of_week
    LIMIT 1;
    
    has_default_schedule := FOUND;
    
    IF FOUND THEN
        default_start_time := v_default_schedule.start_time;
        default_end_time := v_default_schedule.end_time;
    ELSE
        default_start_time := NULL;
        default_end_time := NULL;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql; 

-- Add a debug function for overnight job availability testing
CREATE OR REPLACE FUNCTION debug_overnight_availability(
    p_worker_id UUID,
    p_job_start_time TIMESTAMPTZ,
    p_job_end_time TIMESTAMPTZ,
    p_business_timezone TEXT
)
RETURNS TABLE (
    is_available BOOLEAN,
    job_start_date DATE,
    job_end_date DATE,
    job_start_time_local TIME,
    job_end_time_local TIME,
    is_overnight BOOLEAN,
    start_day_has_exception BOOLEAN,
    start_day_exception_available BOOLEAN,
    start_day_exception_start_time TIME,
    start_day_exception_end_time TIME,
    start_day_default_available BOOLEAN,
    end_day_has_exception BOOLEAN,
    end_day_exception_available BOOLEAN,
    end_day_exception_start_time TIME,
    end_day_exception_end_time TIME,
    end_day_default_available BOOLEAN,
    interim_days_all_available BOOLEAN
) AS $$
DECLARE
    v_job_start_date DATE;
    v_job_end_date DATE;
    v_job_start_time_local TIME;
    v_job_end_time_local TIME;
    v_is_overnight BOOLEAN;
    v_start_day_of_week SMALLINT;
    v_end_day_of_week SMALLINT;
    v_start_day_exception worker_availability_exceptions%ROWTYPE;
    v_end_day_exception worker_availability_exceptions%ROWTYPE;
    v_start_day_default_available BOOLEAN;
    v_end_day_default_available BOOLEAN;
    v_interim_days_all_available BOOLEAN := TRUE;
BEGIN
    -- Convert all times to local business timezone
    v_job_start_date := (p_job_start_time AT TIME ZONE p_business_timezone)::DATE;
    v_job_end_date := (p_job_end_time AT TIME ZONE p_business_timezone)::DATE;
    v_job_start_time_local := (p_job_start_time AT TIME ZONE p_business_timezone)::TIME;
    v_job_end_time_local := (p_job_end_time AT TIME ZONE p_business_timezone)::TIME;
    v_start_day_of_week := EXTRACT(DOW FROM v_job_start_date);
    v_end_day_of_week := EXTRACT(DOW FROM v_job_end_date);
    
    -- Determine if job spans overnight
    v_is_overnight := v_job_start_date != v_job_end_date;
    
    -- Get start day exception
    SELECT * INTO v_start_day_exception 
    FROM worker_availability_exceptions
    WHERE worker_id = p_worker_id AND date = v_job_start_date;
    
    -- Get end day exception
    SELECT * INTO v_end_day_exception 
    FROM worker_availability_exceptions
    WHERE worker_id = p_worker_id AND date = v_job_end_date;
    
    -- Check default availability for start day
    SELECT EXISTS (
        SELECT 1
        FROM worker_weekly_availability
        WHERE worker_id = p_worker_id
          AND day_of_week = v_start_day_of_week
          AND v_job_start_time_local >= start_time
          AND '23:59:59'::TIME <= end_time
    ) INTO v_start_day_default_available;
    
    -- Check default availability for end day
    SELECT EXISTS (
        SELECT 1
        FROM worker_weekly_availability
        WHERE worker_id = p_worker_id
          AND day_of_week = v_end_day_of_week
          AND '00:00:00'::TIME >= start_time
          AND v_job_end_time_local <= end_time
    ) INTO v_end_day_default_available;
    
    -- For multi-day jobs, check all days in between
    IF v_job_end_date - v_job_start_date > 1 THEN
        FOR i IN 1..(v_job_end_date - v_job_start_date - 1) LOOP
            DECLARE
                v_current_date DATE := v_job_start_date + (i * INTERVAL '1 day');
                v_current_day_of_week SMALLINT := EXTRACT(DOW FROM v_current_date);
                v_current_exception worker_availability_exceptions%ROWTYPE;
                v_current_day_available BOOLEAN := FALSE;
            BEGIN
                -- Check for exception
                SELECT * INTO v_current_exception 
                FROM worker_availability_exceptions
                WHERE worker_id = p_worker_id AND date = v_current_date;
                
                IF FOUND THEN
                    -- Exception exists
                    IF NOT v_current_exception.is_available OR
                       v_current_exception.start_time > '00:00:00'::TIME OR 
                       v_current_exception.end_time < '23:59:59'::TIME THEN
                        v_interim_days_all_available := FALSE;
                        EXIT; -- Can exit loop early since we found a day that's not fully available
                    END IF;
                ELSE
                    -- No exception, check regular schedule
                    SELECT EXISTS (
                        SELECT 1
                        FROM worker_weekly_availability
                        WHERE worker_id = p_worker_id
                          AND day_of_week = v_current_day_of_week
                          AND start_time <= '00:00:00'::TIME
                          AND end_time >= '23:59:59'::TIME
                    ) INTO v_current_day_available;
                    
                    IF NOT v_current_day_available THEN
                        v_interim_days_all_available := FALSE;
                        EXIT; -- Can exit loop early
                    END IF;
                END IF;
            END;
        END LOOP;
    END IF;
    
    -- Check if worker is available using same logic as is_worker_available function
    is_available := is_worker_available(p_worker_id, p_job_start_time, p_job_end_time, p_business_timezone);
    
    -- Return all debug data
    RETURN QUERY SELECT 
        is_available,
        v_job_start_date,
        v_job_end_date,
        v_job_start_time_local,
        v_job_end_time_local,
        v_is_overnight,
        v_start_day_exception IS NOT NULL,
        COALESCE(v_start_day_exception.is_available, FALSE),
        COALESCE(v_start_day_exception.start_time, NULL),
        COALESCE(v_start_day_exception.end_time, NULL),
        v_start_day_default_available,
        v_end_day_exception IS NOT NULL,
        COALESCE(v_end_day_exception.is_available, FALSE),
        COALESCE(v_end_day_exception.start_time, NULL),
        COALESCE(v_end_day_exception.end_time, NULL),
        v_end_day_default_available,
        v_interim_days_all_available;
END;
$$ LANGUAGE plpgsql; 