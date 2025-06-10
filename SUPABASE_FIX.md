# Supabase Database and Auth Fixes

This document outlines issues that were fixed in the application's database functions and authentication setup.

## Worker Schedule Display Issue

### Problem
The worker cards in the job assignment page weren't properly displaying weekly hours and daily load. This was because the SQL function `get_worker_schedule_summary` had a return type that was missing the `daily_availability_slots` field.

### Solution
The `fix_worker_schedule.sql` file contains an updated version of the function that adds the missing field to the return type. To apply this fix:

1. Log into your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `fix_worker_schedule.sql`
4. Run the SQL query to update the function

This will fix the worker schedule display on the assignment page.

## Authentication Issues

### Problem
The application was using deprecated cookie handling methods in the Supabase client creation, which caused runtime errors when accessing pages, particularly in the worker availability section.

### Solution
The fix involved:

1. Updating `lib/supabase/server.ts` to use the async pattern for `createClient()`
2. Ensuring all server components await the client creation before using it
3. Using `getUser()` instead of `getSession()` for better security

## How to Apply the Fixes

### Database Fix
```sql
-- Run this in your Supabase SQL Editor
-- This is also available in fix_worker_schedule.sql
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
    daily_exception_reason TEXT,
    exception_start_time TIME,
    exception_end_time TIME,
    daily_availability_slots JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (wa.end_time - wa.start_time)) / 3600), 0)
    INTO v_weekly_hours_goal
    FROM worker_weekly_availability wa
    WHERE wa.worker_id = p_worker_id;

    -- 3. Calculate minutes worked for the specific day
    SELECT COALESCE(SUM(j.duration_minutes), 0)
    INTO v_total_daily_minutes_worked
    FROM jobs j
    WHERE j.worker_id = p_worker_id
      AND j.status NOT IN ('cancelled', 'declined')
      AND (j.scheduled_at AT TIME ZONE v_business_timezone)::DATE = p_date;

    -- 4. Get the daily schedule (all jobs for that day)
    SELECT jsonb_agg(jsonb_build_object(
        'title', j.title,
        'start_time', j.scheduled_at,
        'end_time', j.scheduled_at + (j.duration_minutes * INTERVAL '1 minute')
    ))
    INTO v_daily_schedule
    FROM jobs j
    WHERE j.worker_id = p_worker_id
      AND j.status NOT IN ('cancelled', 'declined')
      AND (j.scheduled_at AT TIME ZONE v_business_timezone)::DATE = p_date;

    -- Ensure v_daily_availability_slots is never null
    IF v_daily_availability_slots IS NULL THEN
        v_daily_availability_slots := '[]'::jsonb;
    END IF;

    -- Return the results
    RETURN QUERY 
    SELECT 
        v_total_weekly_minutes_worked / 60 AS weekly_hours_worked,
        v_weekly_hours_goal AS weekly_hours_goal,
        v_total_daily_minutes_worked / 60 AS daily_hours_worked,
        v_daily_hours_goal AS daily_hours_goal,
        COALESCE(v_daily_schedule, '[]'::jsonb) AS daily_schedule,
        daily_exception_reason,
        exception_start_time,
        exception_end_time,
        v_daily_availability_slots AS daily_availability_slots;
END;
$$;
```

### Auth Client Fix
Make sure your `createClient()` function in `lib/supabase/server.ts` looks like this:

```typescript
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

And in server components, always await the client creation:

```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
``` 