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
    exception_end_time TIME
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
BEGIN
    -- Get business timezone
    SELECT b.timezone INTO v_business_timezone
    FROM workers w
    JOIN businesses b ON w.business_id = b.id
    WHERE w.id = p_worker_id;

    IF v_business_timezone IS NULL THEN
        v_business_timezone := 'UTC';
    END IF;

    -- Calculate date parameters using DOW (Sunday = 0)
    v_start_of_week := date_trunc('week', p_date AT TIME ZONE v_business_timezone)::DATE;
    v_end_of_week := v_start_of_week + INTERVAL '6 days';
    v_day_of_week := EXTRACT(DOW FROM (p_date AT TIME ZONE v_business_timezone));

    -- 1. Calculate total minutes WORKED in the week from jobs
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

    -- 4. Calculate the worker's scheduled hours GOAL for the day
    SELECT * INTO v_exception
    FROM worker_availability_exceptions we
    WHERE we.worker_id = p_worker_id AND we.date = p_date;

    IF FOUND THEN
        -- An exception exists for this day
        IF v_exception.is_available THEN
            v_daily_hours_goal := COALESCE(EXTRACT(EPOCH FROM (v_exception.end_time - v_exception.start_time)) / 3600, 0);
            exception_start_time := v_exception.start_time;
            exception_end_time := v_exception.end_time;
        ELSE
            v_daily_hours_goal := 0;
            exception_start_time := NULL;
            exception_end_time := NULL;
        END IF;
        daily_exception_reason := v_exception.reason;
    ELSE
        -- No exception, use default weekly availability. SUM all slots for the day.
        SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (wa.end_time - wa.start_time)) / 3600), 0)
        INTO v_daily_hours_goal
        FROM worker_weekly_availability wa
        WHERE wa.worker_id = p_worker_id AND wa.day_of_week = v_day_of_week;
        daily_exception_reason := NULL;
        exception_start_time := NULL;
        exception_end_time := NULL;
    END IF;

    -- Assign calculated values to the output table columns
    weekly_hours_worked := v_total_weekly_minutes_worked / 60.0;
    weekly_hours_goal := COALESCE(v_weekly_hours_goal, 0);
    daily_hours_worked := v_total_daily_minutes_worked / 60.0;
    daily_hours_goal := COALESCE(v_daily_hours_goal, 0);
    daily_schedule := v_daily_schedule;
    
    -- Return the single row of calculated data
    RETURN NEXT;
END;
$function$; 