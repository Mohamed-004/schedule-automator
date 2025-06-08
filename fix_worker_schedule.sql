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
    v_daily_exception_reason TEXT;
    v_exception_start_time TIME;
    v_exception_end_time TIME;
BEGIN
    -- Get business timezone
    SELECT b.timezone INTO v_business_timezone
    FROM workers w
    JOIN businesses b ON w.business_id = b.id
    WHERE w.id = p_worker_id;

    IF v_business_timezone IS NULL THEN
        v_business_timezone := 'UTC';
    END IF;

    -- Calculate date parameters using the date directly, without timezone conversion for DOW.
    -- This prevents timezone-related off-by-one errors for day-of-week calculations.
    v_start_of_week := date_trunc('week', p_date)::DATE;
    v_end_of_week := v_start_of_week + INTERVAL '6 days';
    v_day_of_week := EXTRACT(DOW FROM p_date); -- Sunday=0, Monday=1, etc.

    -- 1. Calculate total minutes WORKED. For this, we MUST use the timezone
    -- to correctly place UTC-timestamped jobs into the correct local date for the business.
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

    -- 4. Fetch exception details if they exist for that day
    SELECT
        reason,
        CASE WHEN is_available THEN start_time ELSE NULL END,
        CASE WHEN is_available THEN end_time ELSE NULL END
    INTO
        v_daily_exception_reason,
        v_exception_start_time,
        v_exception_end_time
    FROM worker_availability_exceptions
    WHERE worker_id = p_worker_id AND date = p_date;

    -- 5. Calculate the worker's scheduled hours GOAL for the day
    IF v_daily_exception_reason IS NULL THEN
        -- No exception, use default weekly availability. SUM all slots for the day.
        SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (wa.end_time - wa.start_time)) / 3600), 0)
        INTO v_daily_hours_goal
        FROM worker_weekly_availability wa
        WHERE wa.worker_id = p_worker_id AND wa.day_of_week = v_day_of_week;
    ELSE
        -- An exception exists for this day
        v_daily_hours_goal := COALESCE(EXTRACT(EPOCH FROM (v_exception_end_time - v_exception_start_time)) / 3600, 0);
    END IF;

    -- Return the results including exception times
    RETURN QUERY
    SELECT
        v_total_weekly_minutes_worked / 60.0 as weekly_hours_worked,
        v_weekly_hours_goal,
        v_total_daily_minutes_worked / 60.0 as daily_hours_worked,
        v_daily_hours_goal,
        v_daily_schedule,
        v_daily_exception_reason,
        v_exception_start_time,
        v_exception_end_time;
END;
$function$; 